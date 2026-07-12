"use client";

import { useMemo } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, Stat, EmptyState, RecordStatusBadge, ConfidenceBadge } from "@/components/ui";
import { AnalysisPayload } from "./types";
import { fmtSGD, fmtDate, fmtNum, fmtPct } from "@/lib/format";

export default function RentalHistoryTab({ data }: { data: AnalysisPayload }) {
  const rs = data.rentalStats;

  const chartData = useMemo(
    () =>
      data.rentals
        .map((r) => {
          const t = r.leaseStartDate
            ? new Date(r.leaseStartDate).getTime()
            : quarterToTime(r.leaseQuarter);
          return t && r.rentPsfMonthly != null ? { t, psf: r.rentPsfMonthly } : null;
        })
        .filter((x): x is { t: number; psf: number } => x !== null)
        .sort((a, b) => a.t - b.t),
    [data.rentals]
  );

  if (data.rentals.length === 0) {
    return (
      <EmptyState
        title="No rental records for this property"
        body="Official rental statistics are often published only at street or locality level. Import what is available on the Import page - the app will label the level of aggregation honestly."
      />
    );
  }

  const aggregated = rs.aggregationLevels.some((l) => l !== "unit");
  const est = rs.marketRentEstimate;

  return (
    <div className="grid gap-5">
      {aggregated && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Some or all rental records here are aggregated at{" "}
          <strong>{rs.aggregationLevels.filter((l) => l !== "unit").join(", ")} level</strong>. A street- or
          building-level figure is <em>not</em> a verified tenancy for a specific unit - treat it as market
          context, not unit evidence.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Rental records" value={fmtNum(rs.count)} />
        <Stat label="Median rent PSF/mo" value={rs.medianRentPsf ? fmtSGD(rs.medianRentPsf, 2) : "—"} />
        <Stat label="Mean rent PSF/mo" value={rs.meanRentPsf ? fmtSGD(rs.meanRentPsf, 2) : "—"} />
        <Stat label="Min – Max" value={rs.min != null && rs.max != null ? `${fmtSGD(rs.min, 2)} – ${fmtSGD(rs.max, 2)}` : "—"} />
        <Stat label="Trend (older vs recent)" value={fmtPct(rs.trendPct)} hint={rs.trendPct == null ? "insufficient comparable data" : "median rent PSF"} tone={rs.trendPct == null ? "default" : rs.trendPct >= 0 ? "good" : "bad"} />
      </div>

      {est && (
        <Card title="Estimated market-rent range" subtitle="An estimate - not a valuation and not a verified tenancy">
          <div className="grid grid-cols-3 gap-3 sm:max-w-md">
            <Stat label="Low" value={`${fmtSGD(est.lowPsf, 2)}`} hint="psf/month" />
            <Stat label="Base" value={`${fmtSGD(est.basePsf, 2)}`} hint="psf/month" tone="good" />
            <Stat label="High" value={`${fmtSGD(est.highPsf, 2)}`} hint="psf/month" />
          </div>
          <div className="mt-4 space-y-1 text-xs leading-relaxed text-ink-500">
            <p><strong className="text-ink-700">Method:</strong> {est.method}</p>
            <p><strong className="text-ink-700">Records used:</strong> {est.recordsUsed} · <ConfidenceBadge level={est.confidence} /></p>
            {est.limitations.map((l) => <p key={l}>• {l}</p>)}
          </div>
        </Card>
      )}

      <Card title="Rent per square foot over time">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: 8, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eceef2" />
              <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(t) => new Date(t).getFullYear().toString()} tick={{ fontSize: 11, fill: "#8694a9" }} />
              <YAxis tick={{ fontSize: 11, fill: "#8694a9" }} tickFormatter={(v) => `$${v}`} width={48} />
              <Tooltip formatter={(v: number) => [fmtSGD(v, 2) + " psf/mo", "Rent"]} labelFormatter={(t) => fmtDate(new Date(Number(t)))} />
              <Line type="monotone" dataKey="psf" stroke="#1e7e66" strokeWidth={2} dot={{ r: 3, fill: "#1e7e66" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card
        title={`Rental records (${data.rentals.length})`}
        subtitle={
          <span className="no-print">
            <a className="mr-3 underline decoration-ink-300 underline-offset-2" href={`/api/export?buildingId=${data.building.id}&what=rentals&format=csv`}>Download CSV</a>
            <a className="underline decoration-ink-300 underline-offset-2" href={`/api/export?buildingId=${data.building.id}&what=rentals&format=xlsx`}>Download XLSX</a>
          </span>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="border-b border-ink-100">
                <th className="th">Period</th><th className="th">Monthly rent</th><th className="th">Rent PSF/mo</th>
                <th className="th">Area (sqm)</th><th className="th">Aggregation</th><th className="th">Obs.</th><th className="th">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {data.rentals.map((r) => (
                <tr key={r.id}>
                  <td className="td whitespace-nowrap">{r.leaseStartDate ? fmtDate(r.leaseStartDate) : r.leaseQuarter ?? "—"}</td>
                  <td className="td tabular-nums">{r.monthlyRentSgd ? fmtSGD(r.monthlyRentSgd) : <span className="italic text-ink-400">aggregated</span>}</td>
                  <td className="td tabular-nums">{r.rentPsfMonthly ? fmtSGD(r.rentPsfMonthly, 2) : "—"}</td>
                  <td className="td tabular-nums">{r.floorAreaSqm ? fmtNum(r.floorAreaSqm) : "—"}</td>
                  <td className="td">{r.aggregationLevel}</td>
                  <td className="td tabular-nums">{r.observations ?? "—"}</td>
                  <td className="td">
                    <div className="flex flex-wrap items-center gap-1">
                      <RecordStatusBadge status={r.recordStatus} />
                      <ConfidenceBadge level={r.confidence} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function quarterToTime(q: string | null): number | null {
  if (!q) return null;
  const m = q.match(/(\d{4})Q([1-4])/);
  if (!m) return null;
  return Date.UTC(Number(m[1]), (Number(m[2]) - 1) * 3 + 1, 15);
}
