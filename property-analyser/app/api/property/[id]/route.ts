import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeLeaseBalance, remainingLeaseYears } from "@/lib/lease";
import { median, mean, minMax, cagr, periodChange, interquartileRange } from "@/lib/stats";
import { haversineMetres } from "@/lib/geo";
import { assessProjectImpact } from "@/lib/impact";
import { generateSwot } from "@/lib/swot";
import { scoreConfidence } from "@/lib/confidence";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const valuationParam = req.nextUrl.searchParams.get("valuationDate");
  const valuationDate = valuationParam ? new Date(valuationParam) : new Date();
  if (Number.isNaN(valuationDate.getTime())) {
    return NextResponse.json({ error: "Invalid valuationDate" }, { status: 400 });
  }

  const building = await prisma.building.findUnique({
    where: { id: params.id },
    include: {
      properties: true,
      landParcel: true,
      saleTransactions: { orderBy: { transactionDate: "desc" } },
      rentalTransactions: { orderBy: { leaseStartDate: "desc" } },
    },
  });
  if (!building) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  // --- Lease balance ---------------------------------------------------------
  const leaseInput = {
    tenureType: building.tenureType,
    leaseCommencement: building.leaseCommencement,
    leaseTermYears: building.leaseTermYears,
    leaseSourceQuality: building.leaseSourceQuality,
  };
  const leaseBalance = computeLeaseBalance(leaseInput, valuationDate);
  const remLeaseYears = remainingLeaseYears(leaseInput, valuationDate);

  // --- Sale statistics ---------------------------------------------------------
  const sales = building.saleTransactions;
  const psfs = sales.map((s) => s.psf).filter((x): x is number => x != null);
  const now = valuationDate.getTime();
  const yearMs = 365.25 * 86_400_000;
  const psfInWindow = (fromY: number, toY: number) =>
    sales
      .filter((s) => {
        const age = (now - s.transactionDate.getTime()) / yearMs;
        return age >= fromY && age < toY;
      })
      .map((s) => s.psf)
      .filter((x): x is number => x != null);

  const yearly: Record<string, number> = {};
  for (const s of sales) {
    const y = String(s.transactionDate.getFullYear());
    yearly[y] = (yearly[y] || 0) + 1;
  }

  // CAGR from earliest-year median to latest-year median (needs >=2 obs each side and >=3y span)
  let saleCagr: number | null = null;
  const years = Object.keys(yearly).sort();
  if (years.length >= 2) {
    const firstYear = years[0];
    const lastYear = years[years.length - 1];
    const span = Number(lastYear) - Number(firstYear);
    const firstPsf = sales.filter((s) => String(s.transactionDate.getFullYear()) === firstYear).map((s) => s.psf).filter((x): x is number => x != null);
    const lastPsf = sales.filter((s) => String(s.transactionDate.getFullYear()) === lastYear).map((s) => s.psf).filter((x): x is number => x != null);
    if (span >= 3 && firstPsf.length >= 2 && lastPsf.length >= 2) {
      const m1 = median(firstPsf);
      const m2 = median(lastPsf);
      if (m1 && m2) saleCagr = cagr(m1, m2, span);
    }
  }

  const saleStats = {
    count: sales.length,
    latest: sales[0]
      ? { date: sales[0].transactionDate, price: sales[0].priceSgd, psf: sales[0].psf, areaSqft: sales[0].floorAreaSqft }
      : null,
    medianPrice: median(sales.map((s) => s.priceSgd)),
    medianPsf: median(psfs),
    meanPsf: mean(psfs),
    ...minMax(psfs),
    yoyChangePct: periodChange(psfInWindow(1, 2), psfInWindow(0, 1)),
    threeYearChangePct: periodChange(psfInWindow(3, 4), psfInWindow(0, 1)),
    fiveYearChangePct: periodChange(psfInWindow(5, 6), psfInWindow(0, 1)),
    cagrPct: saleCagr,
    volumeByYear: yearly,
  };

  // --- Rental statistics -------------------------------------------------------
  const rentals = building.rentalTransactions;
  const rentPsfs = rentals.map((r) => r.rentPsfMonthly).filter((x): x is number => x != null);
  const recentRentPsfs = rentals
    .filter((r) => {
      const d = r.leaseStartDate ? r.leaseStartDate.getTime() : quarterToDate(r.leaseQuarter)?.getTime();
      return d != null && now - d <= 2 * yearMs;
    })
    .map((r) => r.rentPsfMonthly)
    .filter((x): x is number => x != null);
  const olderRentPsfs = rentals
    .filter((r) => {
      const d = r.leaseStartDate ? r.leaseStartDate.getTime() : quarterToDate(r.leaseQuarter)?.getTime();
      return d != null && now - d > 2 * yearMs;
    })
    .map((r) => r.rentPsfMonthly)
    .filter((x): x is number => x != null);

  const aggLevels = Array.from(new Set(rentals.map((r) => r.aggregationLevel)));
  const rentIqr = interquartileRange(recentRentPsfs.length >= 4 ? recentRentPsfs : rentPsfs);
  const rentBase = median(recentRentPsfs.length ? recentRentPsfs : rentPsfs);
  const rentConf = scoreConfidence({
    authority: rentals.every((r) => r.recordStatus === "official") ? "government" : "user",
    observations: recentRentPsfs.length || rentPsfs.length,
    precision: aggLevels.includes("unit") ? "unit" : (aggLevels[0] as string) || "building",
    recencyDays: recentRentPsfs.length ? 180 : 900,
  });

  const rentalStats = {
    count: rentals.length,
    medianRentPsf: median(rentPsfs),
    meanRentPsf: mean(rentPsfs),
    ...minMax(rentPsfs),
    trendPct: periodChange(olderRentPsfs, recentRentPsfs),
    aggregationLevels: aggLevels,
    marketRentEstimate:
      rentBase != null
        ? {
            lowPsf: rentIqr ? round2(rentIqr.q1) : round2(rentBase * 0.9),
            basePsf: round2(rentBase),
            highPsf: rentIqr ? round2(rentIqr.q3) : round2(rentBase * 1.1),
            method:
              "Median monthly rent PSF of records from the last 24 months (all records when recent data is thin); low/high from the interquartile range, or +/-10% when fewer than 4 observations.",
            recordsUsed: recentRentPsfs.length || rentPsfs.length,
            confidence: rentConf.level,
            limitations: [
              aggLevels.some((l) => l !== "unit")
                ? "Some records are aggregated above unit level - a building- or street-level figure is not a verified unit tenancy."
                : null,
              "Rents vary with floor, frontage, fit-out and lease terms not captured here.",
            ].filter(Boolean),
          }
        : null,
  };

  // --- Nearby projects with impact ------------------------------------------
  const allProjects = await prisma.nearbyProject.findMany();
  const nearby =
    building.lat != null && building.lng != null
      ? allProjects
          .map((p) => ({
            ...p,
            distanceMetres: haversineMetres(building.lat!, building.lng!, p.lat, p.lng),
          }))
          .filter((p) => p.distanceMetres <= 5000)
          .sort((a, b) => a.distanceMetres - b.distanceMetres)
          .map((p) => ({
            ...p,
            impact: assessProjectImpact(p, p.distanceMetres, building.propertyCategory),
          }))
      : [];

  // --- SWOT ------------------------------------------------------------------
  const sales3y = sales.filter((s) => now - s.transactionDate.getTime() <= 3 * yearMs);
  const swot = generateSwot({
    building,
    leaseBalance,
    saleCount3y: sales3y.length,
    psfTrend3yPct: saleStats.threeYearChangePct,
    rentTrendPct: rentalStats.trendPct,
    rentalObservations: rentals.length,
    nearbyProjects: nearby.map((p) => ({
      name: p.name,
      projectType: p.projectType,
      status: p.status,
      lat: p.lat,
      lng: p.lng,
      expectedCompletion: p.expectedCompletion,
      sourceName: p.sourceName,
    })),
  });

  // --- Overall data confidence -------------------------------------------------
  const filled = [
    building.postalCode, building.lat, building.planningArea, building.completionYear,
    building.leaseCommencement ?? (building.tenureType === "freehold" ? 1 : null),
    building.masterPlanZoning, building.grossFloorAreaSqm,
  ].filter((x) => x != null).length;
  const overallConfidence = scoreConfidence({
    authority: building.recordStatus === "official" ? "government" : "user",
    observations: sales.length + rentals.length,
    completeness: filled / 7,
    precision: "building",
    recencyDays: sales[0] ? Math.round((now - sales[0].transactionDate.getTime()) / 86_400_000) : null,
  });

  return NextResponse.json({
    building,
    valuationDate: valuationDate.toISOString(),
    leaseBalance,
    remainingLeaseYears: remLeaseYears === Infinity ? "freehold" : remLeaseYears,
    saleStats,
    rentalStats,
    sales,
    rentals,
    nearbyProjects: nearby,
    swot,
    overallConfidence,
    hasDemoData:
      building.recordStatus === "demo" ||
      sales.some((s) => s.recordStatus === "demo") ||
      rentals.some((r) => r.recordStatus === "demo"),
  });
}

function quarterToDate(q?: string | null): Date | null {
  if (!q) return null;
  const m = q.match(/(\d{4})Q([1-4])/);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), (Number(m[2]) - 1) * 3 + 1, 15));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
