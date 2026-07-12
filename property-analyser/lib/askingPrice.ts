import { median, interquartileRange } from "./stats";
import { scoreConfidence, ConfidenceLevel } from "./confidence";

export type AskingPriceBand =
  | "significantly_below"
  | "below"
  | "within"
  | "above"
  | "significantly_above"
  | "insufficient";

export interface AskingPriceAssessment {
  band: AskingPriceBand;
  impliedPsf: number | null;
  comparableMedianPsf: number | null;
  premiumPct: number | null;
  valuationRangePsf: { low: number; high: number } | null;
  comparablesUsed: number;
  confidence: ConfidenceLevel;
  disclaimer: string;
}

export const ASKING_PRICE_DISCLAIMER =
  "This is an indicative comparison against recorded transactions, NOT a formal valuation. Engage a licensed valuer before transacting.";

/**
 * Compares an asking price against comparable PSF evidence.
 * Bands: within +/-10% = within range; 10-25% = above/below; >25% = significantly.
 * Fewer than 3 usable comparables => "insufficient".
 */
export function assessAskingPrice(
  askingPrice: number,
  floorAreaSqft: number | null,
  comparablePsf: { psf: number; score: number }[]
): AskingPriceAssessment {
  const usable = comparablePsf.filter((c) => Number.isFinite(c.psf) && c.psf > 0);
  const impliedPsf =
    floorAreaSqft && floorAreaSqft > 0 ? Math.round((askingPrice / floorAreaSqft) * 100) / 100 : null;

  if (usable.length < 3 || impliedPsf === null) {
    return {
      band: "insufficient",
      impliedPsf,
      comparableMedianPsf: median(usable.map((c) => c.psf)),
      premiumPct: null,
      valuationRangePsf: null,
      comparablesUsed: usable.length,
      confidence: "insufficient",
      disclaimer: ASKING_PRICE_DISCLAIMER,
    };
  }

  const med = median(usable.map((c) => c.psf))!;
  const premiumPct = Math.round(((impliedPsf - med) / med) * 1000) / 10;
  const iqr = interquartileRange(usable.map((c) => c.psf));
  const valuationRangePsf = iqr
    ? { low: Math.round(iqr.q1), high: Math.round(iqr.q3) }
    : { low: Math.round(med * 0.9), high: Math.round(med * 1.1) };

  let band: AskingPriceBand;
  if (premiumPct < -25) band = "significantly_below";
  else if (premiumPct < -10) band = "below";
  else if (premiumPct <= 10) band = "within";
  else if (premiumPct <= 25) band = "above";
  else band = "significantly_above";

  const avgScore = usable.reduce((s, c) => s + c.score, 0) / usable.length;
  const { level } = scoreConfidence({
    authority: "government",
    observations: usable.length,
    completeness: Math.min(1, avgScore / 100),
    precision: "building",
  });

  return {
    band,
    impliedPsf,
    comparableMedianPsf: Math.round(med * 100) / 100,
    premiumPct,
    valuationRangePsf,
    comparablesUsed: usable.length,
    confidence: level,
    disclaimer: ASKING_PRICE_DISCLAIMER,
  };
}
