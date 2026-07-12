export type LeaseBalance =
  | { kind: "freehold" }
  | { kind: "insufficient"; reason: string }
  | {
      kind: "leasehold";
      expiryDate: Date;
      remainingYears: number;
      remainingMonths: number;
      remainingDays: number;
      totalRemainingDays: number;
      pctRemaining: number;
      isEstimate: boolean;
    };

export interface LeaseInput {
  tenureType: string; // freehold | leasehold_99 | leasehold_999 | leasehold_other | unknown
  leaseCommencement?: Date | string | null;
  leaseTermYears?: number | null;
  /** authoritative | reported | estimated | unknown */
  leaseSourceQuality?: string | null;
}

function addYearsUtc(date: Date, years: number): Date {
  const d = new Date(date.getTime());
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d;
}

/**
 * lease_expiry_date = lease_commencement_date + original_lease_term
 * remaining_lease_days = lease_expiry_date - valuation_date
 * Calendar-accurate year/month/day breakdown.
 */
export function computeLeaseBalance(input: LeaseInput, valuationDate: Date = new Date()): LeaseBalance {
  if (input.tenureType === "freehold") return { kind: "freehold" };

  const commencement = input.leaseCommencement ? new Date(input.leaseCommencement) : null;
  const term = input.leaseTermYears ?? null;
  if (!commencement || Number.isNaN(commencement.getTime()) || !term || term <= 0) {
    return {
      kind: "insufficient",
      reason:
        "Lease commencement date or original lease term is not available from the connected sources.",
    };
  }

  const expiry = addYearsUtc(commencement, term);
  const msPerDay = 86_400_000;
  const totalRemainingDays = Math.floor((expiry.getTime() - valuationDate.getTime()) / msPerDay);

  // Calendar breakdown: whole years, then whole months, then days.
  let years = expiry.getUTCFullYear() - valuationDate.getUTCFullYear();
  let anchor = addYearsUtc(valuationDate, years);
  if (anchor.getTime() > expiry.getTime()) {
    years -= 1;
    anchor = addYearsUtc(valuationDate, years);
  }
  let months = 0;
  const monthProbe = new Date(anchor.getTime());
  while (true) {
    const next = new Date(monthProbe.getTime());
    next.setUTCMonth(next.getUTCMonth() + 1);
    if (next.getTime() > expiry.getTime()) break;
    monthProbe.setUTCMonth(monthProbe.getUTCMonth() + 1);
    months += 1;
  }
  const days = Math.floor((expiry.getTime() - monthProbe.getTime()) / msPerDay);

  const totalTermDays = Math.floor((expiry.getTime() - commencement.getTime()) / msPerDay);
  const pctRemaining = totalTermDays > 0 ? Math.max(0, (totalRemainingDays / totalTermDays) * 100) : 0;

  return {
    kind: "leasehold",
    expiryDate: expiry,
    remainingYears: Math.max(0, years),
    remainingMonths: Math.max(0, months),
    remainingDays: Math.max(0, days),
    totalRemainingDays: Math.max(0, totalRemainingDays),
    pctRemaining,
    isEstimate: input.leaseSourceQuality !== "authoritative",
  };
}

/** Remaining lease in decimal years at an arbitrary date (used by comparables). */
export function remainingLeaseYears(input: LeaseInput, atDate: Date): number | null {
  const bal = computeLeaseBalance(input, atDate);
  if (bal.kind === "freehold") return Infinity;
  if (bal.kind === "insufficient") return null;
  return bal.totalRemainingDays / 365.2425;
}
