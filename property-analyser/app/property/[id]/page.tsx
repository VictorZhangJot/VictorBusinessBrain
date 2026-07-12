"use client";

import { useCallback, useEffect, useState } from "react";
import { DemoBanner, ErrorState, Spinner, ConfidenceBadge, RecordStatusBadge } from "@/components/ui";
import { AnalysisPayload } from "@/components/tabs/types";
import OverviewTab from "@/components/tabs/OverviewTab";
import SaleHistoryTab from "@/components/tabs/SaleHistoryTab";
import RentalHistoryTab from "@/components/tabs/RentalHistoryTab";
import ComparablesTab from "@/components/tabs/ComparablesTab";
import MapTab from "@/components/tabs/MapTab";
import SwotTab from "@/components/tabs/SwotTab";
import CalculatorTab from "@/components/tabs/CalculatorTab";
import ScenariosTab from "@/components/tabs/ScenariosTab";
import SourcesTab from "@/components/tabs/SourcesTab";
import { CalculatorInputs, defaultCalculatorInputs } from "@/lib/finance";
import { sqmToSqft } from "@/lib/units";

const TABS = [
  "Property Overview",
  "Sale History",
  "Rental History",
  "Comparable Properties",
  "Map & Master Plan",
  "Strengths & Weaknesses",
  "Financial Calculator",
  "Scenarios & Sensitivity",
  "Sources & Assumptions",
] as const;

export default function PropertyPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<AnalysisPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Property Overview");
  const [valuationDate, setValuationDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [calcInputs, setCalcInputs] = useState<CalculatorInputs | null>(null);
  const [watched, setWatched] = useState<boolean | null>(null);

  const load = useCallback(async (vd: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/property/${params.id}?valuationDate=${vd}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Failed to load (HTTP ${res.status})`);
      setData(json);
      setCalcInputs((prev) => {
        if (prev) return prev;
        const b = json.building;
        const latest = json.saleStats?.latest;
        const areaSqft = latest?.areaSqft ?? (b.properties?.[0]?.floorAreaSqm ? sqmToSqft(b.properties[0].floorAreaSqm) : null);
        const rentPsf = json.rentalStats?.marketRentEstimate?.basePsf ?? null;
        return defaultCalculatorInputs({
          valuationDate: vd,
          purchasePrice: latest?.price ?? 2_000_000,
          floorAreaSqft: areaSqft,
          monthlyBaseRent: rentPsf && areaSqft ? Math.round(rentPsf * areaSqft) : 8000,
          lease: {
            tenureType: b.tenureType,
            leaseCommencement: b.leaseCommencement,
            leaseTermYears: b.leaseTermYears,
            leaseSourceQuality: b.leaseSourceQuality,
          },
        });
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [params.id]);

  useEffect(() => {
    load(valuationDate);
  }, [load, valuationDate]);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((j) => setWatched(j.user ? (j.watchlistBuildingIds ?? []).includes(params.id) : null))
      .catch(() => setWatched(null));
  }, [params.id]);

  async function toggleWatch() {
    if (watched === null) return;
    const action = watched ? "remove" : "add";
    setWatched(!watched);
    await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buildingId: params.id, action }),
    }).catch(() => setWatched(watched));
  }

  if (error) return <ErrorState message={error} onRetry={() => load(valuationDate)} />;
  if (!data || !calcInputs) return <Spinner label="Building the analysis…" />;

  const b = data.building;

  return (
    <div>
      <DemoBanner show={data.hasDemoData} />

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-ink-950">{b.name}</h1>
            <RecordStatusBadge status={b.recordStatus} />
            <ConfidenceBadge level={data.overallConfidence.level} />
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {b.address}
            {b.planningArea ? ` · ${b.planningArea}` : ""}
            {b.subzone ? ` (${b.subzone})` : ""} · {b.propertyCategory.replace(/_/g, " ")}
          </p>
        </div>
        <div className="no-print flex items-center gap-2">
          {watched !== null && (
            <button onClick={toggleWatch} className="btn-ghost text-xs">
              {watched ? "★ Watching" : "☆ Watch"}
            </button>
          )}
          <button onClick={() => window.print()} className="btn-ghost text-xs">Print report</button>
        </div>
      </div>

      <nav className="no-print mb-6 flex gap-1 overflow-x-auto rounded-xl border border-ink-200/70 bg-white p-1 shadow-card" aria-label="Analysis sections">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
              tab === t ? "bg-accent-600 text-white" : "text-ink-600 hover:bg-ink-100"
            }`}
            aria-current={tab === t ? "page" : undefined}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "Property Overview" && (
        <OverviewTab data={data} valuationDate={valuationDate} onValuationDateChange={setValuationDate} calcInputs={calcInputs} />
      )}
      {tab === "Sale History" && <SaleHistoryTab data={data} />}
      {tab === "Rental History" && <RentalHistoryTab data={data} />}
      {tab === "Comparable Properties" && <ComparablesTab data={data} />}
      {tab === "Map & Master Plan" && <MapTab data={data} />}
      {tab === "Strengths & Weaknesses" && <SwotTab data={data} />}
      {tab === "Financial Calculator" && <CalculatorTab data={data} inputs={calcInputs} onChange={setCalcInputs} />}
      {tab === "Scenarios & Sensitivity" && <ScenariosTab data={data} baseInputs={calcInputs} />}
      {tab === "Sources & Assumptions" && <SourcesTab data={data} />}
    </div>
  );
}
