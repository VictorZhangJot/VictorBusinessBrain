"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar,
} from "recharts";
import { Card, Stat, EmptyState, Field, RecordStatusBadge, ConfidenceBadge } from "@/components/ui";
import { AnalysisPayload, Sale } from "./types";
import { fmtSGD, fmtDate, fmtNum, fmtPct } from "@/lib/format";

export default function SaleHistoryTab({ data }: { data: AnalysisPayload }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [minArea, setMinArea] = useState("");
  const [maxArea, setMaxArea] = useState("");
  const [floorBand, setFloorBand] = useState("");
  const [metric, setMetric] = useState<"psf" | "psm" | "price">("psf");

  const bands = useMemo(() => Array.from(new Set(data.sales.map((s) => s.floorLevelBand).filter(Boolean))) as string[], [data.sales]);

  const filtered = useMemo(() => {
    return data.sales.filter((s) => {
      const d = s.transactionDate.slice(0, 10);
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      if (minArea && (s.floorAreaSqft ?? 0) < Number(minArea)) return false;
      if (maxArea && (s.floorAreaSqft ?? Infinity) > Number(maxArea)) return false;
      if (floorBand && s.floorLevelBand !== floorBand) return false;
      return true;
    });
  }, [data.sales, fromDate, toDate, minArea, maxArea, floorBand]);

  const chartData = useMemo(
    () =>
      [...filtered]
        .sort((a, b) => a.transactionDate.localeCompare(b.transactionDate))
        .map((s) => ({
          t: new Date(s.transactionDate).getTime(),
          psf: s.psf,
          psm: s.psm,
          price: s.priceSgd,
        })),
    [filtered]
  );

  const volumeData = useMemo(() => {
    const byYear: Record<string, number> = {};
    for (const s of filtered) {
      const y = s.transactionDate.slice(0, 4);
      byYear[y] = (byYear[y] || 0) + 1;
    }
    return Object.entries(byYear).sort().map(([year, count]) => ({ year, count }));
  }, [filtered]);

  const st = data.saleStats;

  if (data.sales.length === 0) {
    return (
      <EmptyState
        title="No sale transactions recorded for this property"
        body="Import transactions on the Import page (URA PMI download or a REALIS export), or check the comparables tab for evidence from nearby properties."
      />
    );
  }

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <Stat label="Transactions" value={fmtNum(st.count)} />
        <Stat label="Median PSF" value={st.medianPsf ? fmtSGD(st.medianPsf) : "—"} />
        <Stat label="Mean PSF" value={st.meanPsf ? fmtSGD(st.meanPsf) : "—"} />
        <Stat label="Min – Max PSF" value={st.min != null && st.max != null ? `${fmtSGD(st.min)} – ${fmtSGD(st.max)}` : "—"} />
        <Stat label="Year-on-year" value={fmtPct(st.yoyChangePct)} hint={st.yoyChangePct == null ? "insufficient comparable data" : "median PSF"} tone={tone(st.yoyChangePct)} />
        <Stat label="CAGR" value={fmtPct(st.cagrPct)} hint={st.cagrPct == null ? "insufficient comparable data" : "earliest vs latest year"} tone={tone(st.cagrPct)} />
        <Stat label="3-year change" value={fmtPct(st.threeYearChangePct)} hint={st.threeYearChangePct == null ? "insufficient comparable data" : "median PSF"} tone={tone(st.threeYearChangePct)} />
        <Stat label="5-year change" value={fmtPct(st.fiveYearChangePct)} hint={st.fiveYearChangePct == null ? "insufficient comparable data" : "median PSF"} tone={tone(st.fiveYearChangePct)} />
      </div>

      <Card title="Filters" className="no-print">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <Field label="From"><input type="date" className="input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></Field>
          <Field label="To"><input type="date" className="input" value={toDate} onChange={(e) => setToDate(e.target.value)} /></Field>
          <Field label="Min area (sqft)"><input type="number" className="input" value={minArea} onChange={(e) => setMinArea(e.target.value)} /></Field>
          <Field label="Max area (sqft)"><input type="number" className="input" value={maxArea} onChange={(e) => setMaxArea(e.target.value)} /></Field>
          <Field label="Floor band">
            <select className="input" value={floorBand} onChange={(e) => setFloorBand(e.target.value)}>
              <option value="">All</option>
              {bands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Chart metric">
            <select className="input" value={metric} onChange={(e) => setMetric(e.target.value as typeof metric)}>
              <option value="psf">Price per sqft</option>
              <option value="psm">Price per sqm</option>
              <option value="price">Sale price</option>
            </select>
          </Field>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={metric === "psf" ? "Price per square foot over time" : metric === "psm" ? "Price per square metre over time" : "Sale prices over time"}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eceef2" />
                <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(t) => new Date(t).getFullYear().toString()} tick={{ fontSize: 11, fill: "#8694a9" }} />
                <YAxis tick={{ fontSize: 11, fill: "#8694a9" }} tickFormatter={(v) => fmtNum(v)} width={64} />
                <Tooltip
                  formatter={(v: number) => [fmtSGD(v, metric === "price" ? 0 : 2), metric.toUpperCase()]}
                  labelFormatter={(t) => fmtDate(new Date(Number(t)))}
                />
                <Line type="monotone" dataKey={metric} stroke="#1e7e66" strokeWidth={2} dot={{ r: 3, fill: "#1e7e66" }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Transaction volume by year">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eceef2" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#8694a9" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#8694a9" }} width={32} />
                <Tooltip />
                <Bar dataKey="count" fill="#4eb999" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card
        title={`Transactions (${filtered.length})`}
        subtitle={
          <span className="no-print">
            <a className="mr-3 underline decoration-ink-300 underline-offset-2" href={`/api/export?buildingId=${data.building.id}&what=sales&format=csv`}>Download CSV</a>
            <a className="underline decoration-ink-300 underline-offset-2" href={`/api/export?buildingId=${data.building.id}&what=sales&format=xlsx`}>Download XLSX</a>
          </span>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-ink-100">
                <th className="th">Date</th><th className="th">Floor</th><th className="th">Area (sqft)</th><th className="th">Type</th>
                <th className="th">Price</th><th className="th">PSF</th><th className="th">PSM</th><th className="th">Sale type</th>
                <th className="th">Lease left</th><th className="th">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {filtered.map((s: Sale) => (
                <tr key={s.id} className={s.possibleDuplicate ? "bg-amber-50/60" : ""}>
                  <td className="td whitespace-nowrap">{fmtDate(s.transactionDate)}</td>
                  <td className="td">{s.floorLevelBand ?? "—"}</td>
                  <td className="td tabular-nums">{s.floorAreaSqft ? fmtNum(s.floorAreaSqft) : "—"}</td>
                  <td className="td">{s.propertyType.replace(/_/g, " ")}</td>
                  <td className="td tabular-nums font-medium">{fmtSGD(s.priceSgd)}</td>
                  <td className="td tabular-nums">{s.psf ? fmtSGD(s.psf) : "—"}</td>
                  <td className="td tabular-nums">{s.psm ? fmtSGD(s.psm) : "—"}</td>
                  <td className="td">{s.typeOfSale?.replace(/_/g, " ") ?? "—"}</td>
                  <td className="td tabular-nums">{s.remainingLeaseYearsAtSale != null ? `${s.remainingLeaseYearsAtSale}y` : "—"}</td>
                  <td className="td">
                    <div className="flex flex-wrap items-center gap-1">
                      <RecordStatusBadge status={s.recordStatus} />
                      <ConfidenceBadge level={s.confidence} />
                      {s.possibleDuplicate && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">possible duplicate</span>
                      )}
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

function tone(v: number | null): "default" | "good" | "bad" {
  if (v == null) return "default";
  return v >= 0 ? "good" : "bad";
}
