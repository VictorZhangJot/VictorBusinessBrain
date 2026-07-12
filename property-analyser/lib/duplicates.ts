/**
 * Duplicate detection for imported transactions.
 * Possible duplicates are FLAGGED for review, never deleted automatically.
 */

export interface DedupeCandidate {
  street?: string | null;
  projectName?: string | null;
  transactionDate: Date | string;
  floorAreaSqm?: number | null;
  priceSgd: number;
  propertyType?: string | null;
  floorLevelBand?: string | null;
  unitIdentifier?: string | null;
}

function norm(s?: string | null): string {
  return (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Deterministic key: same key => near-certain duplicate. */
export function dedupeKey(c: DedupeCandidate): string {
  const date = new Date(c.transactionDate).toISOString().slice(0, 10);
  const area = c.floorAreaSqm != null ? Math.round(c.floorAreaSqm * 10) : "NA";
  return [
    norm(c.projectName) || norm(c.street),
    date,
    Math.round(c.priceSgd),
    area,
    norm(c.propertyType),
    norm(c.floorLevelBand) || norm(c.unitIdentifier) || "NA",
  ].join("|");
}

/** Fuzzy check: same date + price, area within 1%, same street/project stem. */
export function isProbableDuplicate(a: DedupeCandidate, b: DedupeCandidate): boolean {
  if (dedupeKey(a) === dedupeKey(b)) return true;
  const dateA = new Date(a.transactionDate).toISOString().slice(0, 10);
  const dateB = new Date(b.transactionDate).toISOString().slice(0, 10);
  if (dateA !== dateB) return false;
  if (Math.round(a.priceSgd) !== Math.round(b.priceSgd)) return false;
  const locA = norm(a.projectName) || norm(a.street);
  const locB = norm(b.projectName) || norm(b.street);
  if (locA && locB && locA !== locB) return false;
  if (a.floorAreaSqm != null && b.floorAreaSqm != null) {
    const diff = Math.abs(a.floorAreaSqm - b.floorAreaSqm) / Math.max(a.floorAreaSqm, 1e-9);
    if (diff > 0.01) return false;
  }
  return true;
}
