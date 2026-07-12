import { describe, it, expect } from "vitest";
import { computeLeaseBalance, remainingLeaseYears } from "../lib/lease";

// Fixtures per spec: freehold, 999-year, 99-year, <30y remaining, incomplete data.
const VALUATION = new Date("2026-07-13T00:00:00Z");

describe("lease balance", () => {
  it("freehold has no expiry", () => {
    const r = computeLeaseBalance({ tenureType: "freehold" }, VALUATION);
    expect(r.kind).toBe("freehold");
    expect(remainingLeaseYears({ tenureType: "freehold" }, VALUATION)).toBe(Infinity);
  });

  it("999-year lease from 1827 has ~800 years left", () => {
    const r = computeLeaseBalance(
      { tenureType: "leasehold_999", leaseCommencement: "1827-01-01", leaseTermYears: 999 },
      VALUATION
    );
    expect(r.kind).toBe("leasehold");
    if (r.kind === "leasehold") {
      expect(r.expiryDate.getUTCFullYear()).toBe(2826);
      expect(r.remainingYears).toBeGreaterThan(795);
      expect(r.pctRemaining).toBeGreaterThan(75);
    }
  });

  it("99-year lease from 1972-06-01 expires 2071-06-01", () => {
    const r = computeLeaseBalance(
      { tenureType: "leasehold_99", leaseCommencement: "1972-06-01", leaseTermYears: 99 },
      VALUATION
    );
    expect(r.kind).toBe("leasehold");
    if (r.kind === "leasehold") {
      expect(r.expiryDate.toISOString().slice(0, 10)).toBe("2071-06-01");
      expect(r.remainingYears).toBe(44);
      expect(r.remainingMonths).toBe(10);
      // 2026-07-13 + 44y = 2070-07-13, +10m = 2071-05-13, +19d = 2071-06-01
      expect(r.remainingDays).toBe(19);
    }
  });

  it("flags short lease under 30 years", () => {
    const r = computeLeaseBalance(
      { tenureType: "leasehold_99", leaseCommencement: "1955-01-01", leaseTermYears: 99 },
      VALUATION
    );
    expect(r.kind).toBe("leasehold");
    if (r.kind === "leasehold") {
      expect(r.remainingYears).toBeLessThan(30);
      expect(r.remainingYears).toBeGreaterThan(26);
    }
  });

  it("expired lease reports zero remaining, not negative", () => {
    const r = computeLeaseBalance(
      { tenureType: "leasehold_other", leaseCommencement: "1900-01-01", leaseTermYears: 60 },
      VALUATION
    );
    expect(r.kind).toBe("leasehold");
    if (r.kind === "leasehold") {
      expect(r.totalRemainingDays).toBe(0);
      expect(r.pctRemaining).toBe(0);
    }
  });

  it("missing commencement or term returns insufficient, never a guess", () => {
    expect(computeLeaseBalance({ tenureType: "leasehold_99", leaseTermYears: 99 }, VALUATION).kind).toBe("insufficient");
    expect(computeLeaseBalance({ tenureType: "leasehold_99", leaseCommencement: "1990-01-01" }, VALUATION).kind).toBe("insufficient");
    expect(computeLeaseBalance({ tenureType: "unknown" }, VALUATION).kind).toBe("insufficient");
  });

  it("marks estimate unless source is authoritative", () => {
    const est = computeLeaseBalance(
      { tenureType: "leasehold_99", leaseCommencement: "1990-01-01", leaseTermYears: 99, leaseSourceQuality: "reported" },
      VALUATION
    );
    const auth = computeLeaseBalance(
      { tenureType: "leasehold_99", leaseCommencement: "1990-01-01", leaseTermYears: 99, leaseSourceQuality: "authoritative" },
      VALUATION
    );
    if (est.kind === "leasehold" && auth.kind === "leasehold") {
      expect(est.isEstimate).toBe(true);
      expect(auth.isEstimate).toBe(false);
    }
  });
});
