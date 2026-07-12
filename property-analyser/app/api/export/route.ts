import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const buildingId = req.nextUrl.searchParams.get("buildingId");
  const what = req.nextUrl.searchParams.get("what") || "sales";
  const format = req.nextUrl.searchParams.get("format") || "csv";
  if (!buildingId) return NextResponse.json({ error: "buildingId is required" }, { status: 400 });

  const building = await prisma.building.findUnique({ where: { id: buildingId } });
  if (!building) return NextResponse.json({ error: "Building not found" }, { status: 404 });
  const stamp = new Date().toISOString().slice(0, 10);
  const safeName = building.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  if (what === "sales" || what === "rentals") {
    const rows =
      what === "sales"
        ? (await prisma.saleTransaction.findMany({ where: { buildingId }, orderBy: { transactionDate: "desc" } })).map((s) => ({
            transaction_date: s.transactionDate.toISOString().slice(0, 10),
            project_name: s.projectName,
            street: s.street,
            floor_level: s.floorLevelBand,
            floor_area_sqm: s.floorAreaSqm,
            floor_area_sqft: s.floorAreaSqft,
            property_type: s.propertyType,
            price_sgd: s.priceSgd,
            psf: s.psf,
            psm: s.psm,
            type_of_sale: s.typeOfSale,
            tenure: s.tenure,
            remaining_lease_years_at_sale: s.remainingLeaseYearsAtSale,
            source: s.sourceName,
            record_status: s.recordStatus,
            confidence: s.confidence,
            possible_duplicate: s.possibleDuplicate,
          }))
        : (await prisma.rentalTransaction.findMany({ where: { buildingId } })).map((r) => ({
            lease_start: r.leaseStartDate?.toISOString().slice(0, 10) ?? "",
            lease_quarter: r.leaseQuarter,
            monthly_rent_sgd: r.monthlyRentSgd,
            rent_psf_monthly: r.rentPsfMonthly,
            floor_area_sqm: r.floorAreaSqm,
            street: r.street,
            property_type: r.propertyType,
            aggregation_level: r.aggregationLevel,
            observations: r.observations,
            source: r.sourceName,
            record_status: r.recordStatus,
            confidence: r.confidence,
            limitation: r.limitation,
          }));

    if (format === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, what);
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
      return new NextResponse(buf, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${safeName}-${what}-${stamp}.xlsx"`,
        },
      });
    }
    const csv = Papa.unparse(rows as Record<string, unknown>[]);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}-${what}-${stamp}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "what must be sales or rentals" }, { status: 400 });
}
