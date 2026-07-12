import { CalculatorInputs } from "./finance";

export type ScenarioName = "conservative" | "base" | "optimistic";

/**
 * Default scenario derivations (every value remains user-editable):
 *  Conservative: rent -10%, vacancy +5pp, expenses +10%, appreciation 0%, rate +1pp
 *  Base:         the user's central assumptions, unchanged
 *  Optimistic:   rent +8%, vacancy halved, appreciation +1.5pp, rate -0.5pp
 */
export function deriveScenario(base: CalculatorInputs, name: ScenarioName): CalculatorInputs {
  if (name === "base") return { ...base };
  if (name === "conservative") {
    return {
      ...base,
      monthlyBaseRent: round2(base.monthlyBaseRent * 0.9),
      vacancyAllowancePct: Math.min(100, base.vacancyAllowancePct + 5),
      maintenanceFeeMonthly: round2(base.maintenanceFeeMonthly * 1.1),
      repairsMonthly: round2(base.repairsMonthly * 1.1),
      otherExpensesMonthly: round2(base.otherExpensesMonthly * 1.1),
      propertyTaxAnnual: round2(base.propertyTaxAnnual * 1.1),
      annualAppreciationPct: 0,
      expectedSalePrice: null,
      interestRatePct: base.interestRatePct + 1,
    };
  }
  return {
    ...base,
    monthlyBaseRent: round2(base.monthlyBaseRent * 1.08),
    vacancyAllowancePct: Math.max(0, base.vacancyAllowancePct / 2),
    annualAppreciationPct: base.annualAppreciationPct + 1.5,
    expectedSalePrice: null,
    interestRatePct: Math.max(0.1, base.interestRatePct - 0.5),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
