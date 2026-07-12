export type ConfidenceLevel = "high" | "medium" | "low" | "insufficient";

export interface ConfidenceInput {
  /** government | commercial | user */
  authority: string;
  /** Days since the data was reported/retrieved. */
  recencyDays?: number | null;
  /** unit | building | street | locality | index */
  precision?: string | null;
  /** Number of underlying observations/records. */
  observations?: number | null;
  /** 0..1 share of expected fields that are populated. */
  completeness?: number | null;
  /** true when two sources disagree on this value. */
  conflicting?: boolean;
}

/**
 * Rule-based confidence scoring (0-100):
 *  authority: government 40 / commercial 25 / user 15
 *  recency:   <=90d 20 / <=365d 15 / <=1095d 8 / else 3 (unknown 5)
 *  precision: unit 20 / building 15 / street 10 / locality 5 / index 3 (unknown 5)
 *  volume:    >=10 obs 10 / >=3 obs 6 / >=1 obs 3 / 0 obs 0 (unknown 3)
 *  completeness: completeness * 10 (unknown 5)
 *  conflicting sources: -15
 * Levels: >=70 high, >=45 medium, >=25 low, else insufficient.
 */
export function scoreConfidence(input: ConfidenceInput): { level: ConfidenceLevel; score: number } {
  let score = 0;
  score += input.authority === "government" ? 40 : input.authority === "commercial" ? 25 : 15;

  if (input.recencyDays == null) score += 5;
  else if (input.recencyDays <= 90) score += 20;
  else if (input.recencyDays <= 365) score += 15;
  else if (input.recencyDays <= 1095) score += 8;
  else score += 3;

  const precisionPts: Record<string, number> = { unit: 20, building: 15, street: 10, locality: 5, index: 3 };
  score += input.precision ? precisionPts[input.precision] ?? 5 : 5;

  if (input.observations == null) score += 3;
  else if (input.observations >= 10) score += 10;
  else if (input.observations >= 3) score += 6;
  else if (input.observations >= 1) score += 3;

  score += input.completeness == null ? 5 : Math.round(input.completeness * 10);
  if (input.conflicting) score -= 15;

  const level: ConfidenceLevel = score >= 70 ? "high" : score >= 45 ? "medium" : score >= 25 ? "low" : "insufficient";
  return { level, score };
}
