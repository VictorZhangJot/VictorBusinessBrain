import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { scoreComparable } from "@/lib/comparables";
import { remainingLeaseYears } from "@/lib/lease";
import { assessAskingPrice } from "@/lib/askingPrice";
import { haversineMetres } from "@/lib/geo";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  buildingId: z.string().min(1),
  radiusM: z.coerce.number().int().min(100).max(5000).default(1000),
  floorAreaSqm: z.coerce.number().positive().optional(),
  floorLevelBand: z.string().optional(),
  askingPrice: z.coerce.number().positive().optional(),
  monthsBack: z.coerce.number().int().min(6).max(240).default(60),
});

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => `${i.path}: ${i.message}`).join("; ") }, { status: 400 });
  }
  const q = parsed.data;

  const subjectBuilding = await prisma.building.findUnique({ where: { id: q.buildingId } });
  if (!subjectBuilding) return NextResponse.json({ error: "Building not found" }, { status: 404 });

  const subject = {
    buildingId: subjectBuilding.id,
    lat: subjectBuilding.lat,
    lng: subjectBuilding.lng,
    propertyCategory: subjectBuilding.propertyCategory,
    floorAreaSqm: q.floorAreaSqm ?? null,
    floorLevelBand: q.floorLevelBand ?? null,
    tenureType: subjectBuilding.tenureType,
    remainingLeaseYears: remainingLeaseYears(
      {
        tenureType: subjectBuilding.tenureType,
        leaseCommencement: subjectBuilding.leaseCommencement,
        leaseTermYears: subjectBuilding.leaseTermYears,
      },
      new Date()
    ),
  };

  const cutoff = new Date(Date.now() - q.monthsBack * 30.4375 * 86_400_000);
  const candidates = await prisma.saleTransaction.findMany({
    where: { transactionDate: { gte: cutoff } },
    include: { building: { select: { id: true, name: true, lat: true, lng: true } } },
    orderBy: { transactionDate: "desc" },
    take: 2000,
  });

  const isIndustrialSubject = subjectBuilding.propertyCategory === "industrial";
  const results = candidates
    .filter((c) => {
      // Never mix industrial data into commercial comparisons (and vice versa).
      const candIndustrial = c.propertyType === "industrial";
      if (candIndustrial !== isIndustrialSubject) return false;
      // Radius filter (same building always passes).
      if (c.buildingId === subjectBuilding.id) return true;
      const lat = c.building?.lat;
      const lng = c.building?.lng;
      if (subjectBuilding.lat == null || subjectBuilding.lng == null || lat == null || lng == null) return false;
      return haversineMetres(subjectBuilding.lat, subjectBuilding.lng, lat, lng) <= q.radiusM;
    })
    .map((c) => {
      const sim = scoreComparable(subject, {
        id: c.id,
        buildingId: c.buildingId,
        lat: c.building?.lat,
        lng: c.building?.lng,
        propertyType: c.propertyType,
        floorAreaSqm: c.floorAreaSqm,
        floorLevelBand: c.floorLevelBand,
        tenure: c.tenure,
        remainingLeaseYearsAtSale: c.remainingLeaseYearsAtSale,
        transactionDate: c.transactionDate,
      });
      return {
        id: c.id,
        buildingName: c.building?.name ?? c.projectName ?? c.street ?? "Unknown",
        transactionDate: c.transactionDate,
        priceSgd: c.priceSgd,
        psf: c.psf,
        floorAreaSqft: c.floorAreaSqft,
        floorLevelBand: c.floorLevelBand,
        propertyType: c.propertyType,
        tenure: c.tenure,
        remainingLeaseYearsAtSale: c.remainingLeaseYearsAtSale,
        sourceName: c.sourceName,
        recordStatus: c.recordStatus,
        confidence: c.confidence,
        similarity: sim,
      };
    })
    .sort((a, b) => b.similarity.score - a.similarity.score)
    .slice(0, 60);

  // Asking-price assessment against comparables (top-scored, PSF present).
  let askingAssessment = null;
  if (q.askingPrice) {
    const areaSqft = q.floorAreaSqm ? q.floorAreaSqm * 10.7639 : null;
    askingAssessment = assessAskingPrice(
      q.askingPrice,
      areaSqft,
      results.filter((r) => r.psf != null).map((r) => ({ psf: r.psf!, score: r.similarity.score }))
    );
  }

  return NextResponse.json({ subject: { id: subjectBuilding.id, name: subjectBuilding.name }, comparables: results, askingAssessment });
}
