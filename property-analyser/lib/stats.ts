import Decimal from "decimal.js";

export function median(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 === 1 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

export function mean(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x));
  if (v.length === 0) return null;
  return v.reduce((s, x) => new Decimal(s).plus(x).toNumber(), 0) / v.length;
}

export function minMax(values: number[]): { min: number | null; max: number | null } {
  const v = values.filter((x) => Number.isFinite(x));
  if (v.length === 0) return { min: null, max: null };
  return { min: Math.min(...v), max: Math.max(...v) };
}

/**
 * Compound annual growth rate between two values over `years`.
 * Returns null when inputs cannot support a meaningful rate.
 */
export function cagr(beginValue: number, endValue: number, years: number): number | null {
  if (beginValue <= 0 || endValue <= 0 || years <= 0) return null;
  return (Math.pow(endValue / beginValue, 1 / years) - 1) * 100;
}

/**
 * Percentage change between the median PSF of two periods.
 * Requires a minimum number of observations on both sides, otherwise null
 * (a growth rate from thin data misleads more than it informs).
 */
export function periodChange(
  earlier: number[],
  later: number[],
  minObservations = 2
): number | null {
  if (earlier.length < minObservations || later.length < minObservations) return null;
  const e = median(earlier);
  const l = median(later);
  if (e === null || l === null || e === 0) return null;
  return ((l - e) / e) * 100;
}

export function interquartileRange(values: number[]): { q1: number; q3: number } | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length < 4) return null;
  const q = (p: number) => {
    const idx = (v.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    return v[lo] + (v[hi] - v[lo]) * (idx - lo);
  };
  return { q1: q(0.25), q3: q(0.75) };
}
