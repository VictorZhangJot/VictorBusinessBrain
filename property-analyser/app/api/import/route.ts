import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { parseRows, saleRowSchema, rentalRowSchema, projectRowSchema, resolveArea } from "@/lib/adapters/imports";
import { dedupeKey, isProbableDuplicate } from "@/lib/duplicates";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;

function sheetToRows(buf: Buffer, fileName: string): Record<string, unknown>[] {
  if (/\.(xlsx|xls)$/i.test(fileName)) {
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  }
  const parsed = Papa.parse<Record<string, unknown>>(buf.toString("utf8"), {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length > 3) {
    throw new Error(`CSV could not be parsed: ${parsed.errors[0].message}`);
  }
  return parsed.data;
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(`import:${req.ip ?? "local"}`, 20);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected a multipart form upload" }, { status: 400 });
  }
  const file = form.get("file");
  const kind = String(form.get("kind") || "");
  const sourceOverride = String(form.get("source_name") || "").trim();
  const isRealis = String(form.get("realis") || "") === "yes";
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!["sales", "rentals", "projects"].includes(kind)) {
    return NextResponse.json({ error: "kind must be sales, rentals or projects" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File exceeds the 10 MB limit" }, { status: 400 });
  if (!/\.(csv|xlsx|xls)$/i.test(file.name)) {
    return NextResponse.json({ error: "Only .csv, .xlsx or .xls files are accepted" }, { status: 400 });
  }

  let rows: Record<string, unknown>[];
  try {
    rows = sheetToRows(Buffer.from(await file.arrayBuffer()), file.name);
  } catch (e) {
    await prisma.sourceRetrieval.create({
      data: { sourceName: sourceOverride || file.name, status: "error", errorDetail: String(e) },
    });
    return NextResponse.json({ error: `Could not read the file: ${e instanceof Error ? e.message : e}` }, { status: 400 });
  }
  if (rows.length === 0) return NextResponse.json({ error: "The file has no data rows" }, { status: 400 });
  if (rows.length > 20000) return NextResponse.json({ error: "Max 20,000 rows per import" }, { status: 400 });

  const user = await getCurrentUser();
  const defaultSource = isRealis
    ? "REALIS export (user's own subscription)"
    : sourceOverride || `User upload: ${file.name}`;
  const recordStatus = isRealis || sourceOverride.toLowerCase().includes("ura") ? "official" : "user";

  let imported = 0;
  let flagged = 0;
  let errors: { line: number; message: string }[] = [];

  try {
    if (kind === "sales") {
      const parsed = parseRows(rows, saleRowSchema);
      errors = parsed.errors;
      const existing = await prisma.saleTransaction.findMany({
        select: { dedupeKey: true, street: true, projectName: true, transactionDate: true, floorAreaSqm: true, priceSgd: true, propertyType: true },
      });
      const existingKeys = new Set(existing.map((e) => e.dedupeKey).filter(Boolean));
      for (const { row } of parsed.valid) {
        const area = resolveArea(row.floor_area_sqm, row.floor_area_sqft);
        const cand = {
          street: row.street,
          projectName: row.project_name,
          transactionDate: new Date(row.transaction_date),
          floorAreaSqm: area.sqm,
          priceSgd: row.price_sgd,
          propertyType: row.property_type,
          floorLevelBand: row.floor_level,
          unitIdentifier: row.unit_identifier,
        };
        const key = dedupeKey(cand);
        const dup = existingKeys.has(key) || existing.some((e) => isProbableDuplicate(cand, { ...e, transactionDate: e.transactionDate }));
        if (dup) flagged += 1;
        existingKeys.add(key);

        // Best-effort link to a known building by project name or street+postal.
        const building = row.project_name
          ? await prisma.building.findFirst({ where: { name: { contains: row.project_name } } })
          : null;

        await prisma.saleTransaction.create({
          data: {
            buildingId: building?.id ?? null,
            transactionDate: new Date(row.transaction_date),
            projectName: row.project_name || null,
            street: row.street || null,
            postalCode: row.postal_code || null,
            unitIdentifier: row.unit_identifier || null,
            floorLevelBand: row.floor_level || null,
            floorAreaSqm: area.sqm,
            floorAreaSqft: area.sqft,
            propertyType: row.property_type,
            priceSgd: row.price_sgd,
            psf: area.sqft ? Math.round((row.price_sgd / area.sqft) * 100) / 100 : null,
            psm: area.sqm ? Math.round((row.price_sgd / area.sqm) * 100) / 100 : null,
            typeOfSale: row.type_of_sale || null,
            tenure: row.tenure || null,
            leaseCommencement: row.lease_commencement ? new Date(row.lease_commencement) : null,
            leaseTermYears: row.lease_term_years ?? null,
            sourceName: row.source_name || defaultSource,
            sourceUrl: row.source_url || null,
            recordStatus,
            confidence: recordStatus === "official" ? "high" : "medium",
            rawPayload: JSON.stringify(row),
            dedupeKey: key,
            possibleDuplicate: dup,
          },
        });
        imported += 1;
      }
    } else if (kind === "rentals") {
      const parsed = parseRows(rows, rentalRowSchema);
      errors = parsed.errors;
      for (const { row } of parsed.valid) {
        const area = resolveArea(row.floor_area_sqm, row.floor_area_sqft);
        let rentPsf = row.rent_psf_monthly ?? null;
        if (rentPsf == null && row.monthly_rent_sgd != null && area.sqft) {
          rentPsf = Math.round((row.monthly_rent_sgd / area.sqft) * 100) / 100;
        }
        const building = row.street
          ? await prisma.building.findFirst({ where: { address: { contains: row.street } } })
          : null;
        await prisma.rentalTransaction.create({
          data: {
            buildingId: building?.id ?? null,
            leaseStartDate: row.lease_start ? new Date(row.lease_start) : null,
            leaseQuarter: row.lease_quarter || null,
            monthlyRentSgd: row.monthly_rent_sgd ?? null,
            rentPsfMonthly: rentPsf,
            floorAreaSqm: area.sqm,
            street: row.street || null,
            propertyType: row.property_type,
            leaseTermMonths: row.lease_term_months ?? null,
            aggregationLevel: row.aggregation_level || "unit",
            observations: row.observations ?? null,
            sourceName: row.source_name || defaultSource,
            sourceUrl: row.source_url || null,
            recordStatus,
            confidence: recordStatus === "official" ? "high" : "medium",
            rawPayload: JSON.stringify(row),
            limitation:
              (row.aggregation_level || "unit") !== "unit"
                ? `Aggregated at ${row.aggregation_level} level - not a verified unit-level tenancy.`
                : null,
          },
        });
        imported += 1;
      }
    } else {
      const parsed = parseRows(rows, projectRowSchema);
      errors = parsed.errors;
      for (const { row } of parsed.valid) {
        await prisma.nearbyProject.create({
          data: {
            name: row.name,
            projectType: row.project_type,
            description: row.description || null,
            lat: row.lat,
            lng: row.lng,
            status: row.status,
            expectedCompletion: row.expected_completion || null,
            announcedDate: row.announced_date ? new Date(row.announced_date) : null,
            sourceName: row.source_name,
            sourceUrl: row.source_url || null,
            recordStatus,
            confidence: recordStatus === "official" ? "medium" : "low",
          },
        });
        imported += 1;
      }
    }
  } catch (e) {
    log.error("import failed midway", { error: String(e) });
    return NextResponse.json(
      { error: `Import stopped after ${imported} rows: ${e instanceof Error ? e.message : e}`, imported, flagged, errors },
      { status: 500 }
    );
  }

  await prisma.upload.create({
    data: { userId: user?.id ?? null, fileName: file.name, kind: `${kind}_${/\.csv$/i.test(file.name) ? "csv" : "xlsx"}`, rowsImported: imported, rowsFlagged: flagged },
  });
  await prisma.sourceRetrieval.create({
    data: { sourceName: defaultSource, status: errors.length ? "partial" : "ok", recordCount: imported, requestInfo: `${kind} import of ${file.name}` },
  });

  return NextResponse.json({ imported, flagged, errors: errors.slice(0, 50), totalErrorRows: errors.length });
}
