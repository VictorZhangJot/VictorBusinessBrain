"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, EmptyState, ErrorState, RecordStatusBadge, Spinner, Field } from "@/components/ui";
import { fmtSGD, fmtDate } from "@/lib/format";

const CATEGORIES = [
  ["", "All commercial types"],
  ["office", "Office"],
  ["retail", "Retail shop"],
  ["mall_unit", "Shopping-mall unit"],
  ["shophouse", "Shophouse"],
  ["mixed_commercial", "Mixed commercial"],
  ["strata_commercial", "Commercial strata unit"],
  ["business_park", "Business park"],
  ["industrial", "Industrial (optional module - kept separate)"],
] as const;

interface SearchPayload {
  buildings: {
    id: string; name: string; address: string; postalCode: string | null; planningArea: string | null;
    propertyCategory: string; tenureType: string; recordStatus: string; saleCount: number; rentalCount: number;
    latestSale: { date: string; price: number; psf: number | null } | null;
  }[];
  oneMap: { buildingName: string; address: string; postalCode: string | null; lat: number; lng: number; source: string }[];
}

export default function SearchPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [planningArea, setPlanningArea] = useState("");
  const [data, setData] = useState<SearchPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  const runSearch = useCallback(async (query: string, cat: string, pa: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: query, category: cat, planningArea: pa });
      const res = await fetch(`/api/search?${params}`);
      if (!res.ok) throw new Error(`Search failed (HTTP ${res.status})`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => runSearch(q, category, planningArea), 300);
    return () => clearTimeout(t);
  }, [q, category, planningArea, runSearch]);

  async function addFromOneMap(r: SearchPayload["oneMap"][number]) {
    setCreating(r.address);
    try {
      const res = await fetch("/api/buildings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: r.buildingName || r.address,
          address: r.address,
          postalCode: r.postalCode,
          lat: r.lat,
          lng: r.lng,
          propertyCategory: category || "mixed_commercial",
          sourceName: r.source,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not add the property");
      router.push(`/property/${json.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add the property");
      setCreating(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 mt-4 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-ink-950">
          Research a Singapore commercial property
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-ink-500">
          Search by building name, street address, postal code or planning area, then open the full
          analysis dashboard: sale history, rentals, comparables, vicinity projects and the investment calculator.
        </p>
      </div>

      <Card className="mb-6">
        <div className="grid gap-4 sm:grid-cols-[1fr_220px_180px]">
          <Field label="Building, address or postal code">
            <input
              className="input"
              placeholder="e.g. International Plaza, Anson Road, 079903…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search by building, address or postal code"
              autoFocus
            />
          </Field>
          <Field label="Property type">
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Property type">
              {CATEGORIES.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Planning area">
            <input className="input" placeholder="e.g. Downtown Core" value={planningArea} onChange={(e) => setPlanningArea(e.target.value)} aria-label="Planning area" />
          </Field>
        </div>
      </Card>

      {error && <div className="mb-4"><ErrorState message={error} onRetry={() => runSearch(q, category, planningArea)} /></div>}
      {loading && <Spinner label="Searching…" />}

      {!loading && data && (
        <>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-ink-700">Properties in your database</h2>
            <span className="text-xs text-ink-400">{data.buildings.length} result(s)</span>
          </div>
          {data.buildings.length === 0 ? (
            <EmptyState
              title="No matching property in the local database yet"
              body="Pick an official OneMap address match below to start a new property record, add data on the Import page, or clear the filters."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.buildings.map((b) => (
                <button
                  key={b.id}
                  onClick={() => router.push(`/property/${b.id}`)}
                  className="card group p-4 text-left transition hover:border-accent-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold tracking-tight text-ink-900 group-hover:text-accent-700">{b.name}</p>
                      <p className="mt-0.5 text-xs text-ink-500">{b.address}</p>
                    </div>
                    <RecordStatusBadge status={b.recordStatus} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
                    <span className="font-medium text-ink-700">{b.propertyCategory.replace(/_/g, " ")}</span>
                    {b.planningArea && <span>{b.planningArea}</span>}
                    <span>{b.saleCount} sales · {b.rentalCount} rentals</span>
                  </div>
                  {b.latestSale && (
                    <p className="mt-2 text-xs text-ink-500">
                      Latest sale <span className="font-semibold text-ink-800">{fmtSGD(b.latestSale.price)}</span>
                      {b.latestSale.psf ? ` (${fmtSGD(b.latestSale.psf)} psf)` : ""} on {fmtDate(b.latestSale.date)}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}

          {data.oneMap.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-1 text-sm font-semibold text-ink-700">Official address matches (OneMap, live)</h2>
              <p className="mb-3 text-xs text-ink-500">
                From the Singapore Land Authority&apos;s OneMap service. Select one to create a property record and start the analysis.
              </p>
              <div className="grid gap-2">
                {data.oneMap.map((r) => (
                  <div key={r.address} className="card flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-ink-800">{r.buildingName || r.address}</p>
                      <p className="text-xs text-ink-500">{r.address}</p>
                    </div>
                    <button
                      onClick={() => addFromOneMap(r)}
                      disabled={creating !== null}
                      className="btn-primary shrink-0 !px-3 !py-1.5 text-xs"
                    >
                      {creating === r.address ? "Adding…" : "Analyse"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
