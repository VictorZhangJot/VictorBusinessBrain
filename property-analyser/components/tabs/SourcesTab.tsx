"use client";

import { Card, SourceLine, RecordStatusBadge, ConfidenceBadge } from "@/components/ui";
import { AnalysisPayload } from "./types";

export default function SourcesTab({ data }: { data: AnalysisPayload }) {
  const bySource = new Map<string, { count: number; statuses: Set<string> }>();
  for (const s of data.sales) {
    const e = bySource.get(s.sourceName) ?? { count: 0, statuses: new Set<string>() };
    e.count += 1;
    e.statuses.add(s.recordStatus);
    bySource.set(s.sourceName, e);
  }
  for (const r of data.rentals) {
    const e = bySource.get(r.sourceName) ?? { count: 0, statuses: new Set<string>() };
    e.count += 1;
    e.statuses.add(r.recordStatus);
    bySource.set(r.sourceName, e);
  }

  return (
    <div className="grid gap-5">
      <Card title="Sources used in this analysis">
        <div className="mb-3">
          <SourceLine sourceName={data.building.sourceName ?? "Not recorded"} sourceUrl={data.building.sourceUrl} retrievalDate={data.building.retrievalDate} />
          <span className="ml-2"><RecordStatusBadge status={data.building.recordStatus} /></span>
        </div>
        {bySource.size === 0 ? (
          <p className="text-sm text-ink-500">No transaction or rental records yet.</p>
        ) : (
          <table className="w-full">
            <thead><tr className="border-b border-ink-100"><th className="th">Source</th><th className="th">Records</th><th className="th">Record status</th></tr></thead>
            <tbody className="divide-y divide-ink-50">
              {Array.from(bySource.entries()).map(([name, e]) => (
                <tr key={name}>
                  <td className="td">{name}</td>
                  <td className="td tabular-nums">{e.count}</td>
                  <td className="td"><div className="flex gap-1">{Array.from(e.statuses).map((s) => <RecordStatusBadge key={s} status={s} />)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-3 text-xs text-ink-500">
          Overall data confidence for this property: <ConfidenceBadge level={data.overallConfidence.level} />{" "}
          (score {data.overallConfidence.score}/100). Confidence weighs source authority, recency, geographic
          precision, record volume, completeness and consistency. Data gaps are always shown, never hidden.
        </p>
      </Card>

      <Card title="Documented formulas & assumptions">
        <div className="space-y-4 text-sm leading-relaxed text-ink-700">
          <div>
            <p className="font-semibold text-ink-900">Lease balance</p>
            <p className="text-xs text-ink-500">expiry = commencement + original term · remaining days = expiry − valuation date · marked as an estimate unless verified against an authoritative title record.</p>
          </div>
          <div>
            <p className="font-semibold text-ink-900">Yields & debt</p>
            <p className="text-xs text-ink-500">
              gross yield = annual gross rent ÷ purchase price · net yield = annual NOI ÷ total acquisition cost ·
              cash-on-cash = annual pre-tax cash flow ÷ total cash invested · DSCR = annual NOI ÷ annual debt
              service · rental-to-instalment = effective monthly rent ÷ monthly loan payment · mortgage payment
              uses the standard amortisation formula P·r ÷ (1 − (1+r)⁻ⁿ). Financial arithmetic runs on
              decimal-safe maths, not raw floating point.
            </p>
          </div>
          <div>
            <p className="font-semibold text-ink-900">Comparable similarity score (max 100)</p>
            <p className="text-xs text-ink-500">
              Location proximity 25 · property-type match 15 · floor-area similarity 15 · transaction recency 15 ·
              floor-level similarity 10 · tenure similarity 10 · remaining-lease similarity 10. Missing data scores
              0 for its factor and is disclosed; records missing a major characteristic (location, type or area)
              are never labelled directly comparable. Industrial records are never mixed into commercial comparisons.
            </p>
          </div>
          <div>
            <p className="font-semibold text-ink-900">Scenario derivations</p>
            <p className="text-xs text-ink-500">
              Conservative: rent −10%, vacancy +5pp, expenses +10%, appreciation 0%, interest +1pp. Optimistic:
              rent +8%, vacancy halved, appreciation +1.5pp, interest −0.5pp. Every value is editable.
            </p>
          </div>
          <div>
            <p className="font-semibold text-ink-900">Tax rules</p>
            <p className="text-xs text-ink-500">
              Buyer&apos;s Stamp Duty uses the configurable non-residential schedule keyed by effective date (current
              schedule effective 15 Feb 2023: 1%/2%/3%/4%/5% bands); GST rate by date (9% from 1 Jan 2024). ABSD
              is not applied automatically because it does not apply to purely non-residential purchases - a manual
              field covers mixed-use cases. Verify current rates with IRAS before transacting.
            </p>
          </div>
          <div>
            <p className="font-semibold text-ink-900">Normalisation</p>
            <p className="text-xs text-ink-500">1 sqm = 10.7639 sqft. Original source values are preserved alongside normalised values. Possible duplicate imports are flagged for review, never auto-deleted.</p>
          </div>
        </div>
      </Card>

      <Card title="Disclaimers">
        <ul className="list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-ink-600">
          <li>This application is for information and preliminary analysis only.</li>
          <li>Nothing here is a formal property valuation, nor financial, legal, tax or investment advice.</li>
          <li>Transaction records may not represent every completed transaction in the market.</li>
          <li>Rental information may be aggregated (street/locality level) or estimated; an estimate is not a verified tenancy.</li>
          <li>Master Plan zoning and announced plans do not guarantee that any project will proceed.</li>
          <li>Long-term projections are highly sensitive to assumptions; small changes compound over decades.</li>
          <li>Verify title, tenure and property details through authorised professional and government sources (e.g. SLA INLIS).</li>
          <li>Consult qualified property, valuation, legal, financing and tax professionals before making a transaction.</li>
        </ul>
      </Card>
    </div>
  );
}
