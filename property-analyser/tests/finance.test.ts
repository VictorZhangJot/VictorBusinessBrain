import { describe, it, expect } from "vitest";
import {
  monthlyMortgagePayment,
  amortisationSchedule,
  irrMonthly,
  npvMonthly,
  runInvestmentModel,
  defaultCalculatorInputs,
} from "../lib/finance";
import { computeBsd, getGstRatePct } from "../lib/taxRules";

describe("mortgage", () => {
  it("matches the standard amortisation formula", () => {
    // 1,400,000 at 4% over 25 years -> 7,389.72 (closed-form: P·r/(1-(1+r)^-n))
    expect(monthlyMortgagePayment(1_400_000, 4, 25)).toBeCloseTo(7389.72, 1);
  });
  it("handles zero interest", () => {
    expect(monthlyMortgagePayment(120_000, 0, 10)).toBe(1000);
  });
  it("amortisation ends near zero balance", () => {
    const rows = amortisationSchedule(500_000, 3.5, 10, 120);
    expect(rows[119].balance).toBeLessThan(1);
    const totalPrincipal = rows.reduce((s, r) => s + r.principal, 0);
    // per-row 2dp rounding may drift by a few cents across 120 rows
    expect(Math.abs(totalPrincipal - 500_000)).toBeLessThan(2);
  });
  it("interest-only period pays no principal", () => {
    const rows = amortisationSchedule(500_000, 4, 10, 24, 12);
    expect(rows[5].principal).toBe(0);
    expect(rows[5].balance).toBe(500_000);
    expect(rows[13].principal).toBeGreaterThan(0);
  });
});

describe("tax rules", () => {
  it("computes non-residential BSD by band (post Feb-2023 schedule)", () => {
    // 2,000,000: 1800 + 3600 + 19200 + 20000 + 25000 = 69,600
    expect(computeBsd(2_000_000, new Date("2026-07-13")).amount).toBe(69_600);
    // 500,000: 1800 + 3600 + 4200 = 9,600
    expect(computeBsd(500_000, new Date("2026-07-13")).amount).toBe(9_600);
  });
  it("uses the historic schedule before the effective date", () => {
    // Old schedule capped at 3%: 1800 + 3600 + (2M-360k)*3% = 54,600
    expect(computeBsd(2_000_000, new Date("2020-01-01")).amount).toBe(54_600);
  });
  it("GST rate by date", () => {
    expect(getGstRatePct(new Date("2026-01-01"))).toBe(9);
    expect(getGstRatePct(new Date("2023-06-01"))).toBe(8);
  });
});

describe("IRR / NPV", () => {
  it("npv at 0% is the plain sum", () => {
    expect(npvMonthly(0, [-100, 60, 60])).toBeCloseTo(20, 6);
  });
  it("irr recovers a known rate", () => {
    // invest 1000, receive 1100 after 12 months -> 10% annual
    const flows = [-1000, ...Array(11).fill(0), 1100];
    expect(irrMonthly(flows)).toBeCloseTo(10, 1);
  });
  it("returns null when IRR is undefined", () => {
    expect(irrMonthly([100, 50])).toBeNull();
    expect(irrMonthly([-100, -50])).toBeNull();
  });
});

describe("full investment model", () => {
  const base = defaultCalculatorInputs({
    valuationDate: "2026-07-13",
    purchasePrice: 2_000_000,
    ltvPct: 70,
    interestRatePct: 4,
    loanTenureYears: 25,
    monthlyBaseRent: 8_000,
    occupancyPct: 100,
    vacancyAllowancePct: 0,
    annualEscalationPct: 0,
    rentFreeMonths: 0,
    holdingPeriodYears: 5,
    agentFeePct: 1,
    legalFees: 5000,
    valuationFees: 1000,
  });

  it("gross yield = annual gross rent / price", () => {
    const m = runInvestmentModel(base);
    expect(m.grossYieldPct).toBeCloseTo((8000 * 12) / 2_000_000 * 100, 2); // 4.8%
  });

  it("loan, equity and upfront cash reconcile", () => {
    const m = runInvestmentModel(base);
    expect(m.loanAmount).toBe(1_400_000);
    expect(m.equityRequired).toBe(600_000);
    expect(m.totalUpfrontCash).toBeCloseTo(m.totalAcquisitionCost - 1_400_000, 2);
    expect(m.totalAcquisitionCost).toBeCloseTo(2_000_000 + 69_600 + 5_000 + 1_000 + 20_000, 2);
  });

  it("cash flow = NOI - mortgage; DSCR consistent", () => {
    const m = runInvestmentModel(base);
    expect(m.monthlyCashFlow).toBeCloseTo(m.monthlyNoi - m.monthlyMortgagePayment, 2);
    expect(m.dscr).toBeCloseTo(m.annualNoi / (m.monthlyMortgagePayment * 12), 2);
    expect(m.rentalToInstalmentRatio).toBeCloseTo(m.effectiveMonthlyRent / m.monthlyMortgagePayment, 2);
  });

  it("cash-on-cash = annual cash flow / upfront cash", () => {
    const m = runInvestmentModel(base);
    expect(m.cashOnCashPct).toBeCloseTo((m.annualCashFlow / m.totalUpfrontCash) * 100, 1);
  });

  it("vacancy allowance reduces effective rent", () => {
    const m = runInvestmentModel({ ...base, vacancyAllowancePct: 10 });
    expect(m.effectiveMonthlyRent).toBeCloseTo(8000 * 0.9, 2);
  });

  it("escalation compounds at each anniversary", () => {
    const m = runInvestmentModel({ ...base, annualEscalationPct: 10, holdingPeriodYears: 2 });
    expect(m.schedule[0].grossRent).toBeCloseTo(8000, 2);
    expect(m.schedule[12].grossRent).toBeCloseTo(8800, 2);
  });

  it("rent-free months earn nothing", () => {
    const m = runInvestmentModel({ ...base, rentFreeMonths: 3 });
    expect(m.schedule[0].grossRent).toBe(0);
    expect(m.schedule[2].grossRent).toBe(0);
    expect(m.schedule[3].grossRent).toBeGreaterThan(0);
  });

  it("warns on long-range projection past 30 years of lease", () => {
    const m = runInvestmentModel({
      ...base,
      lease: { tenureType: "leasehold_99", leaseCommencement: "2010-01-01", leaseTermYears: 99 },
    });
    expect(m.leaseExpiryProjection).not.toBeNull();
    expect(m.leaseExpiryProjection!.longRangeWarning).toBe(true);
    expect(m.warnings.join(" ")).toMatch(/highly uncertain/);
  });

  it("uses residual value when the lease expires during the hold", () => {
    const m = runInvestmentModel({
      ...base,
      holdingPeriodYears: 10,
      residualValueAtLeaseExpiry: 50_000,
      lease: { tenureType: "leasehold_other", leaseCommencement: "1970-01-01", leaseTermYears: 60 },
    });
    expect(m.estimatedSalePrice).toBe(50_000);
    expect(m.warnings.join(" ")).toMatch(/lease expires before/i);
  });

  it("equity multiple and ROI reconcile with profit", () => {
    const m = runInvestmentModel(base);
    expect(m.totalProfit).toBeCloseTo(m.totalPreTaxCashFlow + m.netSaleProceeds - m.totalUpfrontCash, 1);
    expect(m.equityMultiple).toBeCloseTo((m.totalPreTaxCashFlow + m.netSaleProceeds) / m.totalUpfrontCash, 2);
  });
});
