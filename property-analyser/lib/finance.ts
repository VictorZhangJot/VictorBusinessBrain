import Decimal from "decimal.js";
import { computeBsd, getGstRatePct } from "./taxRules";
import { computeLeaseBalance, LeaseInput } from "./lease";

Decimal.set({ precision: 28 });

const D = (v: number | string | Decimal) => new Decimal(v);

// ---------------------------------------------------------------------------
// Mortgage
// ---------------------------------------------------------------------------

/** Standard amortisation: P * r / (1 - (1+r)^-n), r = monthly rate, n = months. */
export function monthlyMortgagePayment(principal: number, annualRatePct: number, tenureYears: number): number {
  if (principal <= 0 || tenureYears <= 0) return 0;
  const n = Math.round(tenureYears * 12);
  if (annualRatePct === 0) return D(principal).div(n).toDecimalPlaces(2).toNumber();
  const r = D(annualRatePct).div(100).div(12);
  const onePlusRPowN = r.plus(1).pow(n);
  return D(principal).mul(r).mul(onePlusRPowN).div(onePlusRPowN.minus(1)).toDecimalPlaces(2).toNumber();
}

export interface AmortisationRow {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

export function amortisationSchedule(
  principal: number,
  annualRatePct: number,
  tenureYears: number,
  months: number,
  interestOnlyMonths = 0,
  paymentOverride?: number
): AmortisationRow[] {
  const rows: AmortisationRow[] = [];
  if (principal <= 0) return rows;
  const r = D(annualRatePct).div(100).div(12);
  const basePayment = paymentOverride ?? monthlyMortgagePayment(principal, annualRatePct, tenureYears);
  let balance = D(principal);
  for (let m = 1; m <= months; m++) {
    const interest = balance.mul(r);
    let payment: Decimal;
    let principalPaid: Decimal;
    if (m <= interestOnlyMonths) {
      payment = interest;
      principalPaid = D(0);
    } else {
      payment = D(basePayment);
      principalPaid = payment.minus(interest);
      if (principalPaid.gt(balance)) {
        principalPaid = balance;
        payment = interest.plus(principalPaid);
      }
    }
    balance = balance.minus(principalPaid);
    rows.push({
      month: m,
      payment: payment.toDecimalPlaces(2).toNumber(),
      interest: interest.toDecimalPlaces(2).toNumber(),
      principal: principalPaid.toDecimalPlaces(2).toNumber(),
      balance: balance.toDecimalPlaces(2).toNumber(),
    });
    if (balance.lte(0)) break;
  }
  return rows;
}

// ---------------------------------------------------------------------------
// IRR / NPV
// ---------------------------------------------------------------------------

/** NPV of monthly cash flows (index 0 = today) at an ANNUAL discount rate %. */
export function npvMonthly(annualDiscountRatePct: number, monthlyCashflows: number[]): number {
  const rm = Math.pow(1 + annualDiscountRatePct / 100, 1 / 12) - 1;
  let npv = 0;
  for (let i = 0; i < monthlyCashflows.length; i++) {
    npv += monthlyCashflows[i] / Math.pow(1 + rm, i);
  }
  return Math.round(npv * 100) / 100;
}

/**
 * Annualised IRR from monthly cash flows via bisection.
 * Returns null when there is no sign change (IRR undefined).
 */
export function irrMonthly(monthlyCashflows: number[]): number | null {
  const hasNegative = monthlyCashflows.some((c) => c < 0);
  const hasPositive = monthlyCashflows.some((c) => c > 0);
  if (!hasNegative || !hasPositive) return null;

  const npvAt = (annualPct: number) => {
    const rm = Math.pow(1 + annualPct / 100, 1 / 12) - 1;
    return monthlyCashflows.reduce((s, c, i) => s + c / Math.pow(1 + rm, i), 0);
  };

  let lo = -99;
  let hi = 1000;
  let fLo = npvAt(lo);
  const fHi = npvAt(hi);
  if (fLo * fHi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npvAt(mid);
    if (Math.abs(fMid) < 1e-7 || hi - lo < 1e-7) return Math.round(mid * 10000) / 10000;
    if (fLo * fMid < 0) {
      hi = mid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return Math.round(((lo + hi) / 2) * 10000) / 10000;
}

// ---------------------------------------------------------------------------
// Full investment model
// ---------------------------------------------------------------------------

export interface CalculatorInputs {
  valuationDate: string; // ISO
  // purchase
  purchasePrice: number;
  floorAreaSqft?: number | null;
  gstApplicable: boolean;
  gstRecoverable: boolean; // GST-registered buyers typically recover input GST
  bsdOverride?: number | null;
  absdAmount: number; // manual - only relevant for mixed-use residential component
  legalFees: number;
  valuationFees: number;
  agentFeePct: number; // of price
  renovationCost: number;
  fitOutCost: number;
  initialRepairs: number;
  otherAcquisitionCost: number;
  // financing
  ltvPct: number;
  loanAmountOverride?: number | null;
  interestRatePct: number;
  loanTenureYears: number;
  interestOnlyMonths: number;
  monthlyPaymentOverride?: number | null;
  // rental
  monthlyBaseRent: number;
  leaseTermMonths: number;
  rentFreeMonths: number;
  occupancyPct: number; // expected structural occupancy
  vacancyAllowancePct: number; // additional allowance on gross rent
  annualEscalationPct: number;
  serviceChargeRecovery: number; // monthly, recovered from tenant
  otherMonthlyIncome: number;
  // operating expenses (monthly unless stated)
  propertyTaxAnnual: number;
  maintenanceFeeMonthly: number;
  managementFeeMonthly: number;
  insuranceAnnual: number;
  repairsMonthly: number;
  utilitiesMonthly: number;
  leasingCommissionMonths: number; // months of rent per new lease
  renewalCommissionMonths: number;
  capexReserveAnnual: number;
  otherExpensesMonthly: number;
  // holding / exit
  holdingPeriodYears: number;
  expectedSalePrice?: number | null;
  annualAppreciationPct: number;
  sellingAgentFeePct: number;
  disposalLegalFee: number;
  otherExitCost: number;
  residualValueAtLeaseExpiry?: number | null;
  discountRatePct: number;
  // lease context (for projections to expiry)
  lease?: LeaseInput | null;
}

export interface MonthlyRow {
  month: number;
  grossRent: number;
  effectiveRent: number;
  operatingExpenses: number;
  noi: number;
  debtService: number;
  interest: number;
  principal: number;
  cashFlow: number;
}

export interface ModelResult {
  // acquisition
  bsd: number;
  gstAmount: number;
  agentFee: number;
  totalAcquisitionCost: number;
  loanAmount: number;
  equityRequired: number;
  totalUpfrontCash: number;
  monthlyMortgagePayment: number;
  // rental year 1
  grossMonthlyRent: number;
  grossAnnualRent: number;
  effectiveMonthlyRent: number;
  effectiveAnnualRent: number;
  monthlyOperatingExpenses: number;
  monthlyNoi: number;
  annualNoi: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  // yields
  grossYieldPct: number | null;
  effectiveGrossYieldPct: number | null;
  netYieldPct: number | null;
  yieldOnTotalCostPct: number | null;
  cashOnCashPct: number | null;
  capRatePct: number | null;
  // debt metrics
  dscr: number | null;
  interestCoverage: number | null;
  breakEvenOccupancyPct: number | null;
  rentalToInstalmentRatio: number | null;
  // holding period totals
  schedule: MonthlyRow[];
  totalGrossRent: number;
  totalEffectiveRent: number;
  totalOperatingExpenses: number;
  totalNoi: number;
  totalDebtService: number;
  totalPreTaxCashFlow: number;
  // exit
  estimatedSalePrice: number;
  sellingCosts: number;
  loanBalanceAtSale: number;
  netSaleProceeds: number;
  totalProfit: number;
  roiPct: number | null;
  equityMultiple: number | null;
  irrPct: number | null;
  npv: number;
  // projections to land-lease expiry
  leaseExpiryProjection: {
    months: number;
    totalGross: number;
    totalEffective: number;
    totalNoi: number;
    longRangeWarning: boolean;
  } | null;
  warnings: string[];
}

function rentAtMonth(base: number, escalationPct: number, month: number): Decimal {
  // Escalation applied at each lease anniversary (every 12 months).
  const yearIndex = Math.floor((month - 1) / 12);
  return D(base).mul(D(1).plus(D(escalationPct).div(100)).pow(yearIndex));
}

function buildOperatingRows(inputs: CalculatorInputs, months: number): MonthlyRow[] {
  const occupancy = D(Math.min(inputs.occupancyPct, 100)).div(100);
  const vacancyFactor = D(1).minus(D(inputs.vacancyAllowancePct).div(100));
  const monthlyOpexFixed = D(inputs.propertyTaxAnnual)
    .div(12)
    .plus(inputs.maintenanceFeeMonthly)
    .plus(inputs.managementFeeMonthly)
    .plus(D(inputs.insuranceAnnual).div(12))
    .plus(inputs.repairsMonthly)
    .plus(inputs.utilitiesMonthly)
    .plus(D(inputs.capexReserveAnnual).div(12))
    .plus(inputs.otherExpensesMonthly);

  // Leasing commission amortised over the lease term.
  const leaseTerm = Math.max(1, inputs.leaseTermMonths || 36);
  const commissionMonthly = D(inputs.monthlyBaseRent)
    .mul(inputs.leasingCommissionMonths || 0)
    .div(leaseTerm);

  const rows: MonthlyRow[] = [];
  for (let m = 1; m <= months; m++) {
    const baseRent = rentAtMonth(inputs.monthlyBaseRent, inputs.annualEscalationPct, m);
    const inRentFree = m <= (inputs.rentFreeMonths || 0);
    const gross = inRentFree
      ? D(0)
      : baseRent.plus(inputs.serviceChargeRecovery || 0).plus(inputs.otherMonthlyIncome || 0);
    const effective = gross.mul(occupancy).mul(vacancyFactor);
    const opex = monthlyOpexFixed.plus(commissionMonthly);
    const noi = effective.minus(opex);
    rows.push({
      month: m,
      grossRent: gross.toDecimalPlaces(2).toNumber(),
      effectiveRent: effective.toDecimalPlaces(2).toNumber(),
      operatingExpenses: opex.toDecimalPlaces(2).toNumber(),
      noi: noi.toDecimalPlaces(2).toNumber(),
      debtService: 0,
      interest: 0,
      principal: 0,
      cashFlow: noi.toDecimalPlaces(2).toNumber(),
    });
  }
  return rows;
}

export function runInvestmentModel(inputs: CalculatorInputs): ModelResult {
  const warnings: string[] = [];
  const valuationDate = new Date(inputs.valuationDate);
  const months = Math.max(1, Math.round(inputs.holdingPeriodYears * 12));

  // --- Acquisition ---------------------------------------------------------
  const bsd = inputs.bsdOverride ?? computeBsd(inputs.purchasePrice, valuationDate).amount;
  const gstRate = getGstRatePct(valuationDate);
  const gstAmount = inputs.gstApplicable
    ? D(inputs.purchasePrice).mul(gstRate).div(100).toDecimalPlaces(2).toNumber()
    : 0;
  const gstCashCost = inputs.gstApplicable && !inputs.gstRecoverable ? gstAmount : 0;
  if (inputs.gstApplicable && inputs.gstRecoverable) {
    warnings.push(
      `GST of ${gstRate}% (${gstAmount.toLocaleString()} SGD) is payable upfront but treated as recoverable input tax, so it is excluded from acquisition cost. Confirm GST treatment with your tax adviser.`
    );
  }
  const agentFee = D(inputs.purchasePrice).mul(inputs.agentFeePct || 0).div(100).toDecimalPlaces(2).toNumber();
  const totalAcquisitionCost = D(inputs.purchasePrice)
    .plus(bsd)
    .plus(inputs.absdAmount || 0)
    .plus(gstCashCost)
    .plus(inputs.legalFees || 0)
    .plus(inputs.valuationFees || 0)
    .plus(agentFee)
    .plus(inputs.renovationCost || 0)
    .plus(inputs.fitOutCost || 0)
    .plus(inputs.initialRepairs || 0)
    .plus(inputs.otherAcquisitionCost || 0)
    .toDecimalPlaces(2)
    .toNumber();

  const loanAmount =
    inputs.loanAmountOverride ??
    D(inputs.purchasePrice).mul(inputs.ltvPct || 0).div(100).toDecimalPlaces(2).toNumber();
  const equityRequired = D(inputs.purchasePrice).minus(loanAmount).toDecimalPlaces(2).toNumber();
  const totalUpfrontCash = D(totalAcquisitionCost).minus(loanAmount).toDecimalPlaces(2).toNumber();

  const pmt =
    inputs.monthlyPaymentOverride ??
    monthlyMortgagePayment(loanAmount, inputs.interestRatePct, inputs.loanTenureYears);

  // --- Schedules ------------------------------------------------------------
  const opRows = buildOperatingRows(inputs, months);
  const amort = amortisationSchedule(
    loanAmount,
    inputs.interestRatePct,
    inputs.loanTenureYears,
    months,
    inputs.interestOnlyMonths || 0,
    inputs.monthlyPaymentOverride ?? undefined
  );
  for (let i = 0; i < opRows.length; i++) {
    const a = amort[i];
    if (a) {
      opRows[i].debtService = a.payment;
      opRows[i].interest = a.interest;
      opRows[i].principal = a.principal;
      opRows[i].cashFlow = D(opRows[i].noi).minus(a.payment).toDecimalPlaces(2).toNumber();
    }
  }

  // --- Year-1 metrics ---------------------------------------------------------
  // Stabilised month (after rent-free) for headline monthly figures.
  const stabIdx = Math.min(opRows.length - 1, inputs.rentFreeMonths || 0);
  const stab = opRows[stabIdx];
  const grossMonthlyRent = D(inputs.monthlyBaseRent)
    .plus(inputs.serviceChargeRecovery || 0)
    .plus(inputs.otherMonthlyIncome || 0)
    .toDecimalPlaces(2)
    .toNumber();
  const grossAnnualRent = D(grossMonthlyRent).mul(12).toNumber();
  const effectiveMonthlyRent = stab.effectiveRent;
  const effectiveAnnualRent = D(effectiveMonthlyRent).mul(12).toNumber();
  const monthlyOperatingExpenses = stab.operatingExpenses;
  const monthlyNoi = stab.noi;
  const annualNoi = D(monthlyNoi).mul(12).toNumber();
  const monthlyCashFlow = D(monthlyNoi).minus(pmt).toDecimalPlaces(2).toNumber();
  const annualCashFlow = D(monthlyCashFlow).mul(12).toNumber();

  const pct = (num: number, den: number): number | null =>
    den > 0 ? D(num).div(den).mul(100).toDecimalPlaces(2).toNumber() : null;

  const grossYieldPct = pct(grossAnnualRent, inputs.purchasePrice);
  const effectiveGrossYieldPct = pct(effectiveAnnualRent, inputs.purchasePrice);
  const netYieldPct = pct(annualNoi, totalAcquisitionCost);
  const yieldOnTotalCostPct = netYieldPct;
  const capRatePct = pct(annualNoi, inputs.purchasePrice);
  const cashOnCashPct = totalUpfrontCash > 0 ? pct(annualCashFlow, totalUpfrontCash) : null;

  const annualDebtService = D(pmt).mul(12).toNumber();
  const dscr = annualDebtService > 0 ? D(annualNoi).div(annualDebtService).toDecimalPlaces(2).toNumber() : null;
  const year1Interest = amort.slice(0, 12).reduce((s, r) => s + r.interest, 0);
  const interestCoverage =
    year1Interest > 0 ? D(annualNoi).div(year1Interest).toDecimalPlaces(2).toNumber() : null;
  const fullOccRent = D(grossMonthlyRent).mul(D(1).minus(D(inputs.vacancyAllowancePct).div(100)));
  const breakEvenOccupancyPct = fullOccRent.gt(0)
    ? D(monthlyOperatingExpenses).plus(pmt).div(fullOccRent).mul(100).toDecimalPlaces(1).toNumber()
    : null;
  const rentalToInstalmentRatio =
    pmt > 0 ? D(effectiveMonthlyRent).div(pmt).toDecimalPlaces(2).toNumber() : null;

  // --- Holding-period totals -----------------------------------------------
  const sum = (fn: (r: MonthlyRow) => number) =>
    opRows.reduce((s, r) => s.plus(fn(r)), D(0)).toDecimalPlaces(2).toNumber();
  const totalGrossRent = sum((r) => r.grossRent);
  const totalEffectiveRent = sum((r) => r.effectiveRent);
  const totalOperatingExpenses = sum((r) => r.operatingExpenses);
  const totalNoi = sum((r) => r.noi);
  const totalDebtService = sum((r) => r.debtService);
  const totalPreTaxCashFlow = sum((r) => r.cashFlow);

  // --- Exit ------------------------------------------------------------------
  let estimatedSalePrice: number;
  if (inputs.expectedSalePrice && inputs.expectedSalePrice > 0) {
    estimatedSalePrice = inputs.expectedSalePrice;
  } else {
    estimatedSalePrice = D(inputs.purchasePrice)
      .mul(D(1).plus(D(inputs.annualAppreciationPct || 0).div(100)).pow(inputs.holdingPeriodYears))
      .toDecimalPlaces(2)
      .toNumber();
  }
  // Leasehold running out during the hold: use explicit residual value if given.
  if (inputs.lease) {
    const balAtExit = computeLeaseBalance(inputs.lease, addMonths(valuationDate, months));
    if (balAtExit.kind === "leasehold" && balAtExit.totalRemainingDays <= 0) {
      estimatedSalePrice = inputs.residualValueAtLeaseExpiry ?? 0;
      warnings.push(
        "The land lease expires before the intended sale date. Sale value has been set to the residual value you provided (default 0). A leasehold interest normally loses market value as expiry approaches, but the exact path depends on redevelopment prospects - this is an assumption, not a fact."
      );
    }
  }
  const sellingCosts = D(estimatedSalePrice)
    .mul(inputs.sellingAgentFeePct || 0)
    .div(100)
    .plus(inputs.disposalLegalFee || 0)
    .plus(inputs.otherExitCost || 0)
    .toDecimalPlaces(2)
    .toNumber();
  const loanBalanceAtSale = amort.length > 0 ? amort[Math.min(months, amort.length) - 1].balance : loanAmount;
  const netSaleProceeds = D(estimatedSalePrice)
    .minus(sellingCosts)
    .minus(loanBalanceAtSale)
    .toDecimalPlaces(2)
    .toNumber();

  const totalProfit = D(totalPreTaxCashFlow)
    .plus(netSaleProceeds)
    .minus(totalUpfrontCash)
    .toDecimalPlaces(2)
    .toNumber();
  const roiPct = totalUpfrontCash > 0 ? pct(totalProfit, totalUpfrontCash) : null;
  const equityMultiple =
    totalUpfrontCash > 0
      ? D(totalPreTaxCashFlow).plus(netSaleProceeds).div(totalUpfrontCash).toDecimalPlaces(2).toNumber()
      : null;

  // --- IRR / NPV -------------------------------------------------------------
  const flows: number[] = [-totalUpfrontCash];
  for (let i = 0; i < opRows.length; i++) flows.push(opRows[i].cashFlow);
  flows[flows.length - 1] = D(flows[flows.length - 1]).plus(netSaleProceeds).toNumber();
  const irrPct = irrMonthly(flows);
  const npv = npvMonthly(inputs.discountRatePct || 0, flows);

  // --- Projection to land-lease expiry ---------------------------------------
  let leaseExpiryProjection: ModelResult["leaseExpiryProjection"] = null;
  if (inputs.lease) {
    const bal = computeLeaseBalance(inputs.lease, valuationDate);
    if (bal.kind === "leasehold" && bal.totalRemainingDays > 0) {
      const expMonths = Math.min(1200, Math.floor(bal.totalRemainingDays / 30.4375));
      const expRows = buildOperatingRows(inputs, expMonths);
      const sumE = (fn: (r: MonthlyRow) => number) =>
        expRows.reduce((s, r) => s.plus(fn(r)), D(0)).toDecimalPlaces(0).toNumber();
      const longRangeWarning = expMonths > 360;
      if (longRangeWarning) {
        warnings.push(
          "The remaining lease exceeds 30 years. Rental projections that far out are highly uncertain and should be treated as illustrative only."
        );
      }
      if (Math.floor(bal.totalRemainingDays / 30.4375) > 1200) {
        warnings.push("Projection to lease expiry capped at 100 years for practicality.");
      }
      leaseExpiryProjection = {
        months: expMonths,
        totalGross: sumE((r) => r.grossRent),
        totalEffective: sumE((r) => r.effectiveRent),
        totalNoi: sumE((r) => r.noi),
        longRangeWarning,
      };
    }
  }

  return {
    bsd,
    gstAmount,
    agentFee,
    totalAcquisitionCost,
    loanAmount,
    equityRequired,
    totalUpfrontCash,
    monthlyMortgagePayment: pmt,
    grossMonthlyRent,
    grossAnnualRent,
    effectiveMonthlyRent,
    effectiveAnnualRent,
    monthlyOperatingExpenses,
    monthlyNoi,
    annualNoi,
    monthlyCashFlow,
    annualCashFlow,
    grossYieldPct,
    effectiveGrossYieldPct,
    netYieldPct,
    yieldOnTotalCostPct,
    cashOnCashPct,
    capRatePct,
    dscr,
    interestCoverage,
    breakEvenOccupancyPct,
    rentalToInstalmentRatio,
    schedule: opRows,
    totalGrossRent,
    totalEffectiveRent,
    totalOperatingExpenses,
    totalNoi,
    totalDebtService,
    totalPreTaxCashFlow,
    estimatedSalePrice,
    sellingCosts,
    loanBalanceAtSale,
    netSaleProceeds,
    totalProfit,
    roiPct,
    equityMultiple,
    irrPct,
    npv,
    leaseExpiryProjection,
    warnings,
  };
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

export function defaultCalculatorInputs(overrides: Partial<CalculatorInputs> = {}): CalculatorInputs {
  return {
    valuationDate: new Date().toISOString().slice(0, 10),
    purchasePrice: 2_000_000,
    floorAreaSqft: null,
    gstApplicable: false,
    gstRecoverable: false,
    bsdOverride: null,
    absdAmount: 0,
    legalFees: 5_000,
    valuationFees: 1_000,
    agentFeePct: 1,
    renovationCost: 0,
    fitOutCost: 0,
    initialRepairs: 0,
    otherAcquisitionCost: 0,
    ltvPct: 70,
    loanAmountOverride: null,
    interestRatePct: 4.0,
    loanTenureYears: 25,
    interestOnlyMonths: 0,
    monthlyPaymentOverride: null,
    monthlyBaseRent: 8_000,
    leaseTermMonths: 36,
    rentFreeMonths: 0,
    occupancyPct: 95,
    vacancyAllowancePct: 5,
    annualEscalationPct: 2,
    serviceChargeRecovery: 0,
    otherMonthlyIncome: 0,
    propertyTaxAnnual: 9_600,
    maintenanceFeeMonthly: 800,
    managementFeeMonthly: 0,
    insuranceAnnual: 600,
    repairsMonthly: 100,
    utilitiesMonthly: 0,
    leasingCommissionMonths: 1,
    renewalCommissionMonths: 0.5,
    capexReserveAnnual: 2_000,
    otherExpensesMonthly: 0,
    holdingPeriodYears: 10,
    expectedSalePrice: null,
    annualAppreciationPct: 1.5,
    sellingAgentFeePct: 2,
    disposalLegalFee: 5_000,
    otherExitCost: 0,
    residualValueAtLeaseExpiry: null,
    discountRatePct: 6,
    lease: null,
    ...overrides,
  };
}
