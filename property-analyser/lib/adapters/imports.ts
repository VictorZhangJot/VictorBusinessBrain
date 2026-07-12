import { z } from "zod";
import { SourceAdapter, AdapterAvailability } from "./types";
import { sqmToSqft, sqftToSqm } from "../units";

/**
 * UserUploadAdapter + RealisImportAdapter - CSV/XLSX import workflow for data
 * the user exports legally from authorised accounts (URA PMI downloads,
 * REALIS exports) or keys in manually. Import templates live in /templates.
 */

export const userUploadAdapter: SourceAdapter = {
  name: "user_upload",
  label: "User-uploaded CSV / XLSX",
  kind: "user_upload",
  availability(): AdapterAvailability {
    return { available: true };
  },
};

export const realisImportAdapter: SourceAdapter = {
  name: "realis_import",
  label: "REALIS export import (requires the user's own REALIS subscription)",
  kind: "subscription_export",
  termsUrl: "https://www.ura.gov.sg/reis/index",
  availability(): AdapterAvailability {
    return { available: true }; // import path is always available; live automation is not offered
  },
};

export const masterPlanAdapter: SourceAdapter = {
  name: "master_plan",
  label: "URA Master Plan / URA SPACE (manual entry + CSV import)",
  kind: "manual_entry",
  termsUrl: "https://www.ura.gov.sg/maps/",
  availability(): AdapterAvailability {
    return { available: true };
  },
};

export const slaPropertyAdapter: SourceAdapter = {
  name: "sla_inlis",
  label: "SLA INLIS title/tenure search (manual entry of purchased extracts)",
  kind: "manual_entry",
  termsUrl: "https://app.sla.gov.sg/inlis",
  availability(): AdapterAvailability {
    return { available: true };
  },
};

// ---------------------------------------------------------------------------
// Row schemas for imports (Zod-validated; area may be given in sqm OR sqft)
// ---------------------------------------------------------------------------

const numeric = z.preprocess((v) => {
  if (typeof v === "string") {
    const cleaned = v.replace(/[$,\s]/g, "");
    if (cleaned === "") return undefined;
    return Number(cleaned);
  }
  return v;
}, z.number().finite());

const optionalNumeric = z.preprocess((v) => {
  if (v === "" || v === null || v === undefined) return undefined;
  if (typeof v === "string") {
    const cleaned = v.replace(/[$,\s]/g, "");
    if (cleaned === "") return undefined;
    return Number(cleaned);
  }
  return v;
}, z.number().finite().optional());

const dateString = z.string().refine((s) => !Number.isNaN(new Date(s).getTime()), {
  message: "Unrecognised date - use YYYY-MM-DD",
});

export const saleRowSchema = z.object({
  transaction_date: dateString,
  project_name: z.string().optional().default(""),
  street: z.string().optional().default(""),
  postal_code: z.string().optional().default(""),
  property_type: z.string().min(1, "property_type is required"),
  price_sgd: numeric.pipe(z.number().positive("price_sgd must be positive")),
  floor_area_sqm: optionalNumeric,
  floor_area_sqft: optionalNumeric,
  floor_level: z.string().optional().default(""),
  unit_identifier: z.string().optional().default(""),
  type_of_sale: z.string().optional().default(""),
  tenure: z.string().optional().default(""),
  lease_commencement: z.string().optional().default(""),
  lease_term_years: optionalNumeric,
  source_name: z.string().optional().default(""),
  source_url: z.string().optional().default(""),
});

export const rentalRowSchema = z.object({
  lease_start: z.string().optional().default(""),
  lease_quarter: z.string().optional().default(""),
  street: z.string().optional().default(""),
  property_type: z.string().min(1, "property_type is required"),
  monthly_rent_sgd: optionalNumeric,
  rent_psf_monthly: optionalNumeric,
  floor_area_sqm: optionalNumeric,
  floor_area_sqft: optionalNumeric,
  lease_term_months: optionalNumeric,
  aggregation_level: z.string().optional().default("unit"),
  observations: optionalNumeric,
  source_name: z.string().optional().default(""),
  source_url: z.string().optional().default(""),
});

export const projectRowSchema = z.object({
  name: z.string().min(1),
  project_type: z.string().min(1),
  description: z.string().optional().default(""),
  lat: numeric,
  lng: numeric,
  status: z.string().min(1),
  expected_completion: z.string().optional().default(""),
  announced_date: z.string().optional().default(""),
  source_name: z.string().min(1, "source_name is required for projects"),
  source_url: z.string().optional().default(""),
});

export type SaleRow = z.infer<typeof saleRowSchema>;
export type RentalRow = z.infer<typeof rentalRowSchema>;
export type ProjectRow = z.infer<typeof projectRowSchema>;

export interface ParsedImport<T> {
  valid: { row: T; line: number }[];
  errors: { line: number; message: string }[];
}

export function parseRows<S extends z.ZodTypeAny>(
  rows: Record<string, unknown>[],
  schema: S
): ParsedImport<z.infer<S>> {
  const valid: { row: z.infer<S>; line: number }[] = [];
  const errors: { line: number; message: string }[] = [];
  rows.forEach((raw, i) => {
    const line = i + 2; // header is line 1
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) cleaned[k.trim().toLowerCase().replace(/\s+/g, "_")] = v;
    const result = schema.safeParse(cleaned);
    if (result.success) valid.push({ row: result.data, line });
    else {
      const msg = result.error.issues.map((iss) => `${iss.path.join(".")}: ${iss.message}`).join("; ");
      errors.push({ line, message: msg });
    }
  });
  return { valid, errors };
}

/** Resolves area given either unit, preserving the original value. */
export function resolveArea(sqm?: number, sqft?: number): { sqm: number | null; sqft: number | null } {
  if (sqm != null && sqm > 0) return { sqm, sqft: sqft != null && sqft > 0 ? sqft : sqmToSqft(sqm) };
  if (sqft != null && sqft > 0) return { sqm: sqftToSqm(sqft), sqft };
  return { sqm: null, sqft: null };
}
