import { describe, it, expect } from "vitest";
import { sqmToSqft, sqftToSqm, psmToPsf, psfToPsm } from "../lib/units";
import { median, mean, cagr, periodChange, interquartileRange } from "../lib/stats";
import { scoreConfidence } from "../lib/confidence";

describe("unit conversions (1 sqm = 10.7639 sqft)", () => {
  it("sqm <-> sqft round trip", () => {
    expect(sqmToSqft(100)).toBeCloseTo(1076.39, 2);
    expect(sqftToSqm(1076.39)).toBeCloseTo(100, 1);
  });
  it("psm <-> psf", () => {
    expect(psmToPsf(10763.9)).toBeCloseTo(1000, 1);
    expect(psfToPsm(1000)).toBeCloseTo(10763.9, 1);
  });
});

describe("stats", () => {
  it("median handles odd, even and empty", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
  });
  it("mean ignores non-finite values", () => {
    expect(mean([1, 2, NaN, 3])).toBe(2);
  });
  it("cagr computes and refuses bad input", () => {
    expect(cagr(100, 121, 2)).toBeCloseTo(10, 5);
    expect(cagr(0, 100, 2)).toBeNull();
    expect(cagr(100, 100, 0)).toBeNull();
  });
  it("periodChange refuses thin data (no growth rate from insufficient comparables)", () => {
    expect(periodChange([100], [110, 120])).toBeNull();
    expect(periodChange([100, 100], [110, 110])).toBeCloseTo(10, 5);
  });
  it("interquartile range needs at least 4 points", () => {
    expect(interquartileRange([1, 2, 3])).toBeNull();
    expect(interquartileRange([1, 2, 3, 4])).not.toBeNull();
  });
});

describe("confidence framework", () => {
  it("official recent unit-level data scores high", () => {
    const r = scoreConfidence({ authority: "government", recencyDays: 30, precision: "unit", observations: 20, completeness: 1 });
    expect(r.level).toBe("high");
  });
  it("stale sparse user data scores low or insufficient", () => {
    const r = scoreConfidence({ authority: "user", recencyDays: 2000, precision: "locality", observations: 1, completeness: 0.3 });
    expect(["low", "insufficient"]).toContain(r.level);
  });
  it("conflicting sources are penalised", () => {
    const clean = scoreConfidence({ authority: "government", recencyDays: 30, precision: "unit", observations: 5, completeness: 1 });
    const conflict = scoreConfidence({ authority: "government", recencyDays: 30, precision: "unit", observations: 5, completeness: 1, conflicting: true });
    expect(conflict.score).toBe(clean.score - 15);
  });
});
