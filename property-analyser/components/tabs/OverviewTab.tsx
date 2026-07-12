"use client";

import { Card, Stat, Field, SourceLine } from "@/components/ui";
import { AnalysisPayload } from "./types";
import { fmtSGD, fmtDate, fmtNum, fmtPct, NOT_AVAILABLE } from "@/lib/format";
import { sqmToSqft } from "@/lib/units";
import { CalculatorInputs, runInvestmentModel } from "@/lib/finance";
import { useMemo } from "react";

export default function OverviewTab({
  data,
  valuationDate,
  onValuationDateChange,
  calcInputs,
}: {
  data: AnalysisPayload;
  valuationDate: string;
  onValuationDateChange: (d: string) => void;
  calcInputs: CalculatorInputs;
}) {
  const b = data.building;
  const model = useMemo(() => {
    try {
      return runInvestmentModel(calcInputs);
    } catch {
      return null;
    }
  }, [calcInputs]);

  const lease = data.leaseBalance;
  const strengths = data.swot.filter((s) => s.kind === "strength").slice(0, 3);
  const risks = data.swot.filter((s) => s.kind === "weakness").slice(0, 3);

  const profileRows: [string, React.ReactNode][] = [
    ["Building name", b.name],
    ["Address", b.address],
    ["Postal code", b.postalCode ?? na()],
    ["Coordinates", b.lat != null && b.lng != null ? `${b.lat.toFixed(6)}, ${b.lng.toFixed(6)}` : na()],
    ["Planning area / subzone", b.planningArea ? `${b.planningArea}${b.subzone ? ` / ${b.subzone}` : ""}` : na()],
    ["Property category", b.propertyCategory.replace(/_/g, " ")],
    ["Development type", b.developmentType ?? na()],
    ["Completion / TOP", b.completionYear ? `${b.completionYear}${b.topDate ? ` (TOP ${fmtDate(b.topDate)})` : ""}` : na()],
    ["Building age", b.completionYear ? `${new Date().getFullYear() - b.completionYear} years` : na()],
    ["Tenure", tenureLabel(b.tenureType)],
    ["Lease commencement", b.leaseCommencement ? fmtDate(b.leaseCommencement) : b.tenureType === "freehold" ? "—" : na()],
    ["Original lease term", b.leaseTermYears ? `${b.leaseTermYears} years` : b.tenureType === "freehold" ? "—" : na()],
    ["Gross floor area", b.grossFloorAreaSqm ? `${fmtNum(b.grossFloorAreaSqm)} sqm (${fmtNum(sqmToSqft(b.grossFloorAreaSqm))} sqft)` : na()],
    ["Plot ratio", b.plotRatio ?? na()],
    ["Master Plan zoning", b.masterPlanZoning ?? na()],
    ["Allowable use", b.allowableUse ?? na()],
    ["Conservation status", b.conservationStatus ?? "None recorded"],
    ["Number of units", b.numUnits ?? na()],
    ["Car-park lots", b.carParkLots ?? na()],
    ["Nearest MRT", b.nearestMrt ? `${b.nearestMrt}${b.nearestMrtMetres ? ` (~${fmtNum(b.nearestMrtMetres)} m)` : ""}` : na()],
  ];

  return (
    <div className="grid gap-5">
      {/* headline stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Latest sale" value={data.saleStats.latest ? fmtSGD(data.saleStats.latest.price) : "—"} hint={data.saleStats.latest ? `${fmtDate(data.saleStats.latest.date)}${data.saleStats.latest.psf ? ` · ${fmtSGD(data.saleStats.latest.psf)} psf` : ""}` : NOT_AVAILABLE} />
        <Stat label="Median PSF (all records)" value={data.saleStats.medianPsf ? fmtSGD(data.saleStats.medianPsf) : "—"} hint={`${data.saleStats.count} transactions`} />
        <Stat
          label="Est. market rent (base)"
          value={data.rentalStats.marketRentEstimate ? `${fmtSGD(data.rentalStats.marketRentEstimate.basePsf, 2)} psf/mo` : "—"}
          hint={data.rentalStats.marketRentEstimate ? `${data.rentalStats.marketRentEstimate.recordsUsed} records · ${data.rentalStats.marketRentEstimate.confidence} confidence` : NOT_AVAILABLE}
        />
        <Stat
          label="Remaining lease"
          value={lease.kind === "freehold" ? "Freehold" : lease.kind === "leasehold" ? `${lease.remainingYears}y ${lease.remainingMonths}m` : "—"}
          hint={lease.kind === "freehold" ? "No fixed lease expiry" : lease.kind === "leasehold" ? `expires ${fmtDate(lease.expiryDate)}${lease.isEstimate ? " · estimate" : ""}` : NOT_AVAILABLE}
          tone={lease.kind === "leasehold" && lease.remainingYears < 30 ? "warn" : "default"}
        />
        {model && (
          <>
            <Stat label="Gross yield (calculator)" value={fmtPct(model.grossYieldPct)} hint="From your calculator assumptions" />
            <Stat label="Net yield" value={fmtPct(model.netYieldPct)} hint="NOI ÷ total acquisition cost" />
            <Stat label="Monthly mortgage" value={fmtSGD(model.monthlyMortgagePayment)} hint={`${calcInputs.ltvPct}% LTV · ${calcInputs.interestRatePct}% · ${calcInputs.loanTenureYears}y`} />
            <Stat
              label="Monthly cash flow"
              value={fmtSGD(model.monthlyCashFlow)}
              hint={`Rent÷instalment ${model.rentalToInstalmentRatio ?? "—"} · DSCR ${model.dscr ?? "—"}`}
              tone={model.monthlyCashFlow >= 0 ? "good" : "bad"}
            />
          </>
        )}
      </div>

      {/* lease balance */}
      <Card title="Lease balance" subtitle="expiry = commencement + original term; remaining = expiry − valuation date">
        <div className="flex flex-wrap items-end gap-6">
          <Field label="Valuation date">
            <input type="date" className="input w-44" value={valuationDate} onChange={(e) => onValuationDateChange(e.target.value)} />
          </Field>
          {lease.kind === "freehold" && (
            <p className="pb-1 text-sm font-medium text-accent-700">Freehold – no fixed lease expiry</p>
          )}
          {lease.kind === "insufficient" && <p className="max-w-md pb-1 text-sm text-ink-500">{lease.reason}</p>}
          {lease.kind === "leasehold" && (
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 pb-1 text-sm sm:grid-cols-4">
              <span><span className="label">Remaining</span><strong className="text-ink-900">{lease.remainingYears}y {lease.remainingMonths}m {lease.remainingDays}d</strong></span>
              <span><span className="label">Total days</span><strong className="tabular-nums text-ink-900">{fmtNum(lease.totalRemainingDays)}</strong></span>
              <span><span className="label">% of term left</span><strong className="tabular-nums text-ink-900">{fmtPct(lease.pctRemaining)}</strong></span>
              <span><span className="label">Expiry</span><strong className="text-ink-900">{fmtDate(lease.expiryDate)}</strong></span>
            </div>
          )}
        </div>
        {lease.kind === "leasehold" && lease.isEstimate && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Estimate: the lease commencement date has not been verified against an authoritative title or land
            record (e.g. an SLA INLIS extract). Verify before relying on it.
          </p>
        )}
      </Card>

      {/* profile + snapshot side by side */}
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Property profile">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
            {profileRows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-ink-50 py-1.5 text-sm">
                <dt className="shrink-0 text-ink-500">{k}</dt>
                <dd className="text-right font-medium text-ink-900">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3">
            <SourceLine sourceName={b.sourceName ?? "Not recorded"} sourceUrl={b.sourceUrl} retrievalDate={b.retrievalDate} />
          </div>
        </Card>

        <div className="grid content-start gap-5">
          <Card title="Top strengths">
            {strengths.length === 0 ? (
              <p className="text-sm text-ink-500">No strengths could be evidenced from the connected data.</p>
            ) : (
              <ul className="space-y-2">
                {strengths.map((s) => (
                  <li key={s.title} className="text-sm">
                    <span className="font-medium text-accent-700">{s.title}</span>
                    <span className="block text-xs leading-relaxed text-ink-500">{s.evidence}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Key risks">
            {risks.length === 0 ? (
              <p className="text-sm text-ink-500">No risks could be evidenced from the connected data - which itself may reflect thin data.</p>
            ) : (
              <ul className="space-y-2">
                {risks.map((s) => (
                  <li key={s.title} className="text-sm">
                    <span className="font-medium text-red-600">{s.title}</span>
                    <span className="block text-xs leading-relaxed text-ink-500">{s.evidence}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function na() {
  return <span className="font-normal italic text-ink-400">{NOT_AVAILABLE}</span>;
}

function tenureLabel(t: string): string {
  const map: Record<string, string> = {
    freehold: "Freehold",
    leasehold_99: "Leasehold (99-year)",
    leasehold_999: "Leasehold (999-year)",
    leasehold_other: "Leasehold (other term)",
    unknown: "Unknown",
  };
  return map[t] ?? t;
}
