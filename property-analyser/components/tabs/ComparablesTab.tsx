"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, EmptyState, ErrorState, Field, Spinner, ConfidenceBadge, RecordStatusBadge } from "@/components/ui";
import { AnalysisPayload, ComparableRow } from "./types";
import { fmtSGD, fmtDate, fmtNum, fmtPct } from "@/lib/format";

const BAND_LABELS: Record<string, { label: string; cls: string }> = {
  significantly_below: { label: "Significantly below comparable range", cls: "bg-accent-50 text-accent-700 ring-accent-200" },
  below: { label: "Below comparable range", cls: "bg-accent-50 text-accent-700 ring-accent-200" },
  within: { label: "Within comparable range", cls: "bg-sky-50 text-sky-700 ring-sky-200" },
  above: { label: "Above comparable range", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  significantly_above: { label: "Significantly above comparable range", cls: "bg-red-50 text-red-700 ring-red-200" },
  insufficient: { label: "Insufficient evidence", cls: "bg-ink-100 text-ink-500 ring-ink-200" },
};

interface ApiResult {
  comparables: ComparableRow[];
  askingAssessment: {
    band: string; impliedPsf: number | null; comparableMedianPsf: number | null; premiumPct: number | null;
    valuationRangePsf: { low: number; high: number } | null; comparablesUsed: number; confidence: string; disclaimer: string;
  } | null;
}

export default function ComparablesTab({ data }: { data: AnalysisPayload }) {
  const [radius, setRadius] = useState(1000);
  const [area, setArea] = useState<string>(data.building.properties?.[0]?.floorAreaSqm?.toString() ?? "");
  const [askingPrice, setAskingPrice] = useState("");
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ buildingId: data.building.id, radiusM: String(radius) });
      if (area) params.set("floorAreaSqm", area);
      if (askingPrice) params.set("askingPrice", askingPrice.replace(/[,\s]/g, ""));
      const res = await fetch(`/api/comparables?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load comparables");
    } finally {
      setLoading(false);
    }
  }, [data.building.id, radius, area, askingPrice]);

  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
  }, [load]);

  const assessment = result?.askingAssessment;

  return (
    <div className="grid gap-5">
      <Card title="Comparable search" subtitle="Scored out of 100 - the formula is documented under Sources & Assumptions" className="no-print">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Radius">
            <select className="input" value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
              {[250, 500, 1000, 2000].map((r) => (
                <option key={r} value={r}>{r >= 1000 ? `${r / 1000} km` : `${r} m`}</option>
              ))}
            </select>
          </Field>
          <Field label="Subject floor area (sqm)">
            <input className="input" type="number" value={area} onChange={(e) => setArea(e.target.value)} placeholder="for similarity scoring" />
          </Field>
          <Field label="Asking price (SGD)" hint="optional - triggers the asking-price assessment">
            <input className="input" inputMode="numeric" value={askingPrice} onChange={(e) => setAskingPrice(e.target.value)} placeholder="e.g. 2,500,000" />
          </Field>
          <div className="flex items-end"><button onClick={load} className="btn-ghost w-full">Refresh</button></div>
        </div>
      </Card>

      {assessment && (
        <Card title="Indicative asking-price assessment">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ring-1 ${BAND_LABELS[assessment.band]?.cls}`}>
              {BAND_LABELS[assessment.band]?.label}
            </span>
            <ConfidenceBadge level={assessment.confidence} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
            <span><span className="label">Implied PSF</span><strong>{assessment.impliedPsf ? fmtSGD(assessment.impliedPsf) : "—"}</strong></span>
            <span><span className="label">Comparable median PSF</span><strong>{assessment.comparableMedianPsf ? fmtSGD(assessment.comparableMedianPsf) : "—"}</strong></span>
            <span><span className="label">Premium / discount</span><strong className={assessment.premiumPct != null && assessment.premiumPct > 0 ? "text-amber-600" : "text-accent-700"}>{fmtPct(assessment.premiumPct)}</strong></span>
            <span><span className="label">Indicative range (PSF)</span><strong>{assessment.valuationRangePsf ? `${fmtSGD(assessment.valuationRangePsf.low)} – ${fmtSGD(assessment.valuationRangePsf.high)}` : "—"}</strong></span>
          </div>
          <p className="mt-3 text-xs text-ink-500">{assessment.comparablesUsed} comparable records used. {assessment.disclaimer}</p>
        </Card>
      )}

      {error && <ErrorState message={error} onRetry={load} />}
      {loading && <Spinner label="Scoring comparables…" />}

      {!loading && result && (
        result.comparables.length === 0 ? (
          <EmptyState title="No comparable transactions found" body="Widen the radius or import more transaction data. Industrial records are never mixed into commercial comparisons." />
        ) : (
          <Card title={`Comparable transactions (${result.comparables.length})`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="border-b border-ink-100">
                    <th className="th">Score</th><th className="th">Building</th><th className="th">Date</th><th className="th">Type</th>
                    <th className="th">Area (sqft)</th><th className="th">Price</th><th className="th">PSF</th>
                    <th className="th">Distance</th><th className="th">Lease left</th><th className="th">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50">
                  {result.comparables.map((c) => (
                    <tr key={c.id}>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${c.similarity.score >= 70 ? "bg-accent-100 text-accent-800" : c.similarity.score >= 45 ? "bg-amber-100 text-amber-700" : "bg-ink-100 text-ink-500"}`}>
                            {Math.round(c.similarity.score)}
                          </span>
                          {!c.similarity.directlyComparable && (
                            <span className="text-[10px] leading-tight text-ink-400" title={`Missing: ${c.similarity.missingFactors.join(", ") || "low score"}`}>
                              not directly<br />comparable
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="td max-w-[180px] truncate font-medium">{c.buildingName}</td>
                      <td className="td whitespace-nowrap">{fmtDate(c.transactionDate)}</td>
                      <td className="td">{c.propertyType.replace(/_/g, " ")}</td>
                      <td className="td tabular-nums">{c.floorAreaSqft ? fmtNum(c.floorAreaSqft) : "—"}</td>
                      <td className="td tabular-nums">{fmtSGD(c.priceSgd)}</td>
                      <td className="td tabular-nums font-medium">{c.psf ? fmtSGD(c.psf) : "—"}</td>
                      <td className="td tabular-nums">{c.similarity.distanceMetres != null ? (c.similarity.distanceMetres === 0 ? "same bldg" : `${fmtNum(c.similarity.distanceMetres)} m`) : "—"}</td>
                      <td className="td tabular-nums">{c.remainingLeaseYearsAtSale != null ? `${c.remainingLeaseYearsAtSale}y` : "—"}</td>
                      <td className="td"><RecordStatusBadge status={c.recordStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      )}
    </div>
  );
}
