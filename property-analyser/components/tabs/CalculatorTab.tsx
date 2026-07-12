"use client";

import { useMemo, useState } from "react";
import { Card, Stat, Field, ErrorState } from "@/components/ui";
import { AnalysisPayload } from "./types";
import { CalculatorInputs, runInvestmentModel } from "@/lib/finance";
import { fmtSGD, fmtNum, fmtPct } from "@/lib/format";

type NumKey = NonNullable<
  {
    [K in keyof CalculatorInputs]: CalculatorInputs[K] extends number | null | undefined ? K : never;
  }[keyof CalculatorInputs]
>;

export default function CalculatorTab({
  data,
  inputs,
  onChange,
}: {
  data: AnalysisPayload;
  inputs: CalculatorInputs;
  onChange: (i: CalculatorInputs) => void;
}) {
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const model = useMemo(() => {
    try {
      return { ok: true as const, m: runInvestmentModel(inputs) };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
    }
  }, [inputs]);

  function num(key: NumKey, label: string, opts: { step?: number; hint?: string; nullable?: boolean } = {}) {
    const v = inputs[key];
    return (
      <Field label={label} hint={opts.hint}>
        <input
          type="number"
          step={opts.step ?? "any"}
          className="input"
          value={v === null || v === undefined ? "" : String(v)}
          placeholder={opts.nullable ? "auto" : undefined}
          onChange={(e) => {
            const raw = e.target.value;
            const parsed = raw === "" ? (opts.nullable ? null : 0) : Number(raw);
            onChange({ ...inputs, [key]: parsed });
          }}
        />
      </Field>
    );
  }

  async function save() {
    setSaveMsg(null);
    const res = await fetch("/api/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `${data.building.name} – assumptions`, buildingId: data.building.id, inputs }),
    });
    const json = await res.json();
    setSaveMsg(res.ok ? "Saved to your account." : json.error || "Could not save (sign in first).");
  }

  const m = model.ok ? model.m : null;

  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
      {/* ------------------------- inputs ------------------------- */}
      <div className="grid content-start gap-5">
        <Card title="Purchase assumptions" subtitle="BSD is computed from the configurable tax-rules table (IRAS schedule by effective date) - override it if needed">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {num("purchasePrice", "Purchase price (SGD)")}
            {num("floorAreaSqft", "Floor area (sqft)", { nullable: true })}
            {num("bsdOverride", "BSD override (SGD)", { nullable: true, hint: m ? `auto: ${fmtSGD(m.bsd)}` : undefined })}
            {num("absdAmount", "ABSD (SGD)", { hint: "Not applicable to purely non-residential purchases" })}
            {num("legalFees", "Legal fees")}
            {num("valuationFees", "Valuation fees")}
            {num("agentFeePct", "Agent fee (% of price)", { step: 0.1 })}
            {num("renovationCost", "Renovation")}
            {num("fitOutCost", "Fit-out")}
            {num("initialRepairs", "Initial repairs")}
            {num("otherAcquisitionCost", "Other costs")}
            <Field label="GST applies">
              <select
                className="input"
                value={inputs.gstApplicable ? (inputs.gstRecoverable ? "recoverable" : "cost") : "no"}
                onChange={(e) => {
                  const v = e.target.value;
                  onChange({ ...inputs, gstApplicable: v !== "no", gstRecoverable: v === "recoverable" });
                }}
              >
                <option value="no">No (e.g. seller not GST-registered)</option>
                <option value="recoverable">Yes - recoverable input tax</option>
                <option value="cost">Yes - treat as cost</option>
              </select>
            </Field>
          </div>
        </Card>

        <Card title="Financing assumptions">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {num("ltvPct", "Loan-to-value (%)", { step: 1 })}
            {num("loanAmountOverride", "Loan amount override", { nullable: true, hint: m ? `auto: ${fmtSGD(m.loanAmount)}` : undefined })}
            {num("interestRatePct", "Interest rate (% p.a.)", { step: 0.05 })}
            {num("loanTenureYears", "Loan tenure (years)", { step: 1 })}
            {num("interestOnlyMonths", "Interest-only period (months)", { step: 1 })}
            {num("monthlyPaymentOverride", "Monthly payment override", { nullable: true, hint: m ? `auto: ${fmtSGD(m.monthlyMortgagePayment)}` : undefined })}
          </div>
        </Card>

        <Card title="Rental assumptions">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {num("monthlyBaseRent", "Monthly base rent", { hint: data.rentalStats.marketRentEstimate ? `market est. ${fmtSGD(data.rentalStats.marketRentEstimate.basePsf, 2)} psf/mo` : undefined })}
            {num("leaseTermMonths", "Lease term (months)", { step: 1 })}
            {num("rentFreeMonths", "Rent-free (months)", { step: 1 })}
            {num("occupancyPct", "Occupancy (%)", { step: 1 })}
            {num("vacancyAllowancePct", "Vacancy allowance (%)", { step: 1 })}
            {num("annualEscalationPct", "Annual escalation (%)", { step: 0.5 })}
            {num("serviceChargeRecovery", "Service charge recovered /mo")}
            {num("otherMonthlyIncome", "Other income /mo")}
          </div>
        </Card>

        <Card title="Operating expenses">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {num("propertyTaxAnnual", "Property tax /yr")}
            {num("maintenanceFeeMonthly", "Maintenance /mo")}
            {num("managementFeeMonthly", "Management /mo")}
            {num("insuranceAnnual", "Insurance /yr")}
            {num("repairsMonthly", "Repairs /mo")}
            {num("utilitiesMonthly", "Utilities (owner) /mo")}
            {num("leasingCommissionMonths", "Leasing commission (months of rent)", { step: 0.5 })}
            {num("renewalCommissionMonths", "Renewal commission (months)", { step: 0.5 })}
            {num("capexReserveAnnual", "Capex reserve /yr")}
            {num("otherExpensesMonthly", "Other expenses /mo")}
          </div>
        </Card>

        <Card title="Holding period & exit">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {num("holdingPeriodYears", "Holding period (years)", { step: 1 })}
            {num("expectedSalePrice", "Expected sale price", { nullable: true, hint: "blank = grow price by appreciation" })}
            {num("annualAppreciationPct", "Annual appreciation (%)", { step: 0.25 })}
            {num("sellingAgentFeePct", "Selling agent fee (%)", { step: 0.25 })}
            {num("disposalLegalFee", "Disposal legal fee")}
            {num("otherExitCost", "Other exit cost")}
            {num("residualValueAtLeaseExpiry", "Residual value at lease expiry", { nullable: true, hint: "used only if the lease ends during the hold" })}
            {num("discountRatePct", "Discount rate for NPV (%)", { step: 0.25 })}
            <Field label="Valuation date">
              <input type="date" className="input" value={inputs.valuationDate} onChange={(e) => onChange({ ...inputs, valuationDate: e.target.value })} />
            </Field>
          </div>
          <button onClick={save} className="btn-ghost no-print mt-4 text-xs">Save assumptions to my account</button>
          {saveMsg && <span className="ml-3 text-xs text-ink-500">{saveMsg}</span>}
        </Card>
      </div>

      {/* ------------------------- results ------------------------- */}
      <div className="grid content-start gap-5">
        {!model.ok && <ErrorState message={`Calculation failed: ${model.error}`} />}
        {m && (
          <>
            {m.warnings.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
                {m.warnings.map((w) => <p key={w} className="mb-1 last:mb-0">• {w}</p>)}
              </div>
            )}

            <Card title="Acquisition">
              <Rows rows={[
                ["Buyer's Stamp Duty", fmtSGD(m.bsd)],
                ["GST", inputs.gstApplicable ? `${fmtSGD(m.gstAmount)}${inputs.gstRecoverable ? " (recoverable)" : ""}` : "not applicable"],
                ["Agent fee", fmtSGD(m.agentFee)],
                ["Total acquisition cost", fmtSGD(m.totalAcquisitionCost), true],
                ["Loan amount", fmtSGD(m.loanAmount)],
                ["Equity required", fmtSGD(m.equityRequired)],
                ["Total upfront cash", fmtSGD(m.totalUpfrontCash), true],
                ["Monthly mortgage payment", fmtSGD(m.monthlyMortgagePayment), true],
              ]} />
            </Card>

            <Card title="Rental & cash flow (stabilised month)">
              <Rows rows={[
                ["1. Current gross monthly rent", fmtSGD(m.grossMonthlyRent)],
                ["2. Effective monthly rent (after occupancy & vacancy)", fmtSGD(m.effectiveMonthlyRent)],
                ["3. Annual rental income (effective)", fmtSGD(m.effectiveAnnualRent)],
                ["Monthly operating expenses", fmtSGD(m.monthlyOperatingExpenses)],
                ["Monthly net operating income (NOI)", fmtSGD(m.monthlyNoi), true],
                ["Monthly mortgage payment", fmtSGD(m.monthlyMortgagePayment)],
                ["Monthly cash flow after financing", fmtSGD(m.monthlyCashFlow), true],
                ["Annual cash flow after financing", fmtSGD(m.annualCashFlow)],
              ]} />
              <p className="mt-2 text-[11px] leading-relaxed text-ink-400">
                NOI excludes financing. Principal repayment is part of debt service, not an operating expense -
                the amortisation split is shown in the holding-period totals below.
              </p>
            </Card>

            <Card title="Yields & debt metrics">
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Gross yield" value={fmtPct(m.grossYieldPct)} hint="annual gross rent ÷ price" />
                <Stat label="Effective gross yield" value={fmtPct(m.effectiveGrossYieldPct)} />
                <Stat label="Net yield (on total cost)" value={fmtPct(m.netYieldPct)} hint="NOI ÷ total acquisition cost" />
                <Stat label="Cap rate (on price)" value={fmtPct(m.capRatePct)} />
                <Stat label="Cash-on-cash return" value={fmtPct(m.cashOnCashPct)} hint="pre-tax cash flow ÷ cash invested" />
                <Stat label="DSCR" value={m.dscr != null ? fmtNum(m.dscr, 2) : "—"} tone={m.dscr != null && m.dscr < 1 ? "bad" : "good"} hint="annual NOI ÷ annual debt service" />
                <Stat label="Interest coverage" value={m.interestCoverage != null ? fmtNum(m.interestCoverage, 2) : "—"} />
                <Stat label="Break-even occupancy" value={fmtPct(m.breakEvenOccupancyPct)} tone={m.breakEvenOccupancyPct != null && m.breakEvenOccupancyPct > 100 ? "bad" : "default"} />
                <Stat label="Rental-to-instalment" value={m.rentalToInstalmentRatio != null ? fmtNum(m.rentalToInstalmentRatio, 2) : "—"} hint="effective rent ÷ mortgage payment" tone={m.rentalToInstalmentRatio != null && m.rentalToInstalmentRatio < 1 ? "warn" : "good"} />
              </div>
            </Card>

            <Card title={`Holding period (${inputs.holdingPeriodYears} years) & exit`}>
              <Rows rows={[
                ["Total gross rental over hold", fmtSGD(m.totalGrossRent)],
                ["Total effective rental over hold", fmtSGD(m.totalEffectiveRent)],
                ["Total operating expenses", fmtSGD(m.totalOperatingExpenses)],
                ["Total NOI", fmtSGD(m.totalNoi)],
                ["Total debt service (interest + principal)", fmtSGD(m.totalDebtService)],
                ["Total pre-tax cash flow", fmtSGD(m.totalPreTaxCashFlow), true],
                ["Estimated sale price", fmtSGD(m.estimatedSalePrice)],
                ["Selling costs", fmtSGD(m.sellingCosts)],
                ["Loan redemption at sale", fmtSGD(m.loanBalanceAtSale)],
                ["Net sale proceeds", fmtSGD(m.netSaleProceeds), true],
                ["Total profit", fmtSGD(m.totalProfit), true],
                ["Return on investment", fmtPct(m.roiPct)],
                ["Equity multiple", m.equityMultiple != null ? `${fmtNum(m.equityMultiple, 2)}×` : "—"],
                ["IRR (annualised)", m.irrPct != null ? fmtPct(m.irrPct) : "not defined for these cash flows"],
                [`NPV @ ${inputs.discountRatePct}%`, fmtSGD(m.npv), true],
              ]} />
            </Card>

            {m.leaseExpiryProjection && (
              <Card title="Projection to land-lease expiry" subtitle={`${fmtNum(m.leaseExpiryProjection.months)} months remain on the lease`}>
                <Rows rows={[
                  ["4. Total projected gross rental until lease expiry", fmtSGD(m.leaseExpiryProjection.totalGross)],
                  ["5. Total projected effective rental until lease expiry", fmtSGD(m.leaseExpiryProjection.totalEffective)],
                  ["6. Total projected NOI until lease expiry", fmtSGD(m.leaseExpiryProjection.totalNoi), true],
                ]} />
                {m.leaseExpiryProjection.longRangeWarning && (
                  <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    More than 30 years remain - projections this long are highly uncertain and illustrative only.
                  </p>
                )}
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Rows({ rows }: { rows: [string, string, boolean?][] }) {
  return (
    <dl>
      {rows.map(([k, v, strong]) => (
        <div key={k} className={`flex items-baseline justify-between gap-4 border-b border-ink-50 py-1.5 text-sm ${strong ? "font-semibold text-ink-900" : "text-ink-700"}`}>
          <dt>{k}</dt>
          <dd className="tabular-nums">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
