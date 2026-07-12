import Decimal from "decimal.js";

/**
 * Configurable tax-rules table with effective dates.
 * Rates are NOT hard-coded into the calculators; they are looked up here by
 * transaction date, and every rate the UI uses can be overridden by the user.
 * Verify current rates at https://www.iras.gov.sg before relying on them.
 */

export interface BsdTier {
  /** Band width in SGD; null = remainder. */
  band: number | null;
  ratePct: number;
}

export interface BsdSchedule {
  effectiveFrom: string; // ISO date
  propertyClass: "non_residential";
  tiers: BsdTier[];
  sourceName: string;
  sourceUrl: string;
}

export const BSD_SCHEDULES: BsdSchedule[] = [
  {
    // Non-residential BSD on/after 15 Feb 2023 (Budget 2023).
    effectiveFrom: "2023-02-15",
    propertyClass: "non_residential",
    tiers: [
      { band: 180_000, ratePct: 1 },
      { band: 180_000, ratePct: 2 },
      { band: 640_000, ratePct: 3 },
      { band: 500_000, ratePct: 4 },
      { band: null, ratePct: 5 },
    ],
    sourceName: "IRAS - Buyer's Stamp Duty (non-residential)",
    sourceUrl: "https://www.iras.gov.sg/taxes/stamp-duty/for-property/buying-or-acquiring-property/buyer's-stamp-duty-(bsd)",
  },
  {
    effectiveFrom: "1900-01-01",
    propertyClass: "non_residential",
    tiers: [
      { band: 180_000, ratePct: 1 },
      { band: 180_000, ratePct: 2 },
      { band: null, ratePct: 3 },
    ],
    sourceName: "IRAS - Buyer's Stamp Duty (historic schedule)",
    sourceUrl: "https://www.iras.gov.sg",
  },
];

export interface GstRule {
  effectiveFrom: string;
  ratePct: number;
}

export const GST_RULES: GstRule[] = [
  { effectiveFrom: "2024-01-01", ratePct: 9 },
  { effectiveFrom: "2023-01-01", ratePct: 8 },
  { effectiveFrom: "2007-07-01", ratePct: 7 },
];

function pickByDate<T extends { effectiveFrom: string }>(rules: T[], date: Date): T {
  const sorted = [...rules].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  for (const r of sorted) {
    if (new Date(r.effectiveFrom).getTime() <= date.getTime()) return r;
  }
  return sorted[sorted.length - 1];
}

/** Buyer's Stamp Duty for a non-residential purchase on `date`. */
export function computeBsd(priceSgd: number, date: Date = new Date()): { amount: number; schedule: BsdSchedule } {
  const schedule = pickByDate(BSD_SCHEDULES, date);
  let remaining = new Decimal(priceSgd);
  let duty = new Decimal(0);
  for (const tier of schedule.tiers) {
    if (remaining.lte(0)) break;
    const slice = tier.band === null ? remaining : Decimal.min(remaining, tier.band);
    duty = duty.plus(slice.mul(tier.ratePct).div(100));
    remaining = remaining.minus(slice);
  }
  return { amount: duty.toDecimalPlaces(2).toNumber(), schedule };
}

/**
 * ABSD does not apply to purely non-residential property. It can apply to the
 * residential component of a mixed-use purchase - the calculator therefore
 * accepts a manual ABSD amount instead of guessing one.
 */
export function getGstRatePct(date: Date = new Date()): number {
  return pickByDate(GST_RULES, date).ratePct;
}
