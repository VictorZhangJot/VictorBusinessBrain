"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { Card, EmptyState, SourceLine, ConfidenceBadge } from "@/components/ui";
import { AnalysisPayload, NearbyProjectWithImpact } from "./types";
import { fmtDate, fmtNum } from "@/lib/format";

const RADII = [250, 500, 1000, 2000, 5000];

const STATUS_LABELS: Record<string, string> = {
  existing: "Existing",
  under_construction: "Under construction",
  confirmed: "Confirmed",
  tendered: "Tendered",
  gazetted: "Gazetted",
  proposed: "Proposed",
  draft_intention: "Draft planning intention",
  long_term_concept: "Long-term planning concept",
  unverified: "Unverified third-party report",
};

const DIRECTION_META: Record<string, { label: string; cls: string }> = {
  strong_positive: { label: "Strong positive", cls: "bg-accent-100 text-accent-800 ring-accent-200" },
  moderate_positive: { label: "Moderate positive", cls: "bg-accent-50 text-accent-700 ring-accent-200" },
  neutral_uncertain: { label: "Neutral / uncertain", cls: "bg-ink-100 text-ink-600 ring-ink-200" },
  moderate_negative: { label: "Moderate negative", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  strong_negative: { label: "Strong negative", cls: "bg-red-50 text-red-700 ring-red-200" },
};

const HORIZON_LABELS: Record<string, string> = {
  immediate: "Immediate (<1y)",
  near_term: "Near term (1–3y)",
  medium_term: "Medium term (3–5y)",
  long_term: "Long term (>5y)",
};

export default function MapTab({ data }: { data: AnalysisPayload }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<LeafletMap | null>(null);
  const [radius, setRadius] = useState(1000);
  const b = data.building;
  const projects = data.nearbyProjects.filter((p) => p.distanceMetres <= radius);

  useEffect(() => {
    if (!mapRef.current || b.lat == null || b.lng == null) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      const map = L.map(mapRef.current).setView([b.lat!, b.lng!], radius > 2000 ? 13 : radius > 500 ? 14 : 16);
      mapInstance.current = map;
      // OneMap basemap (SLA) with required attribution.
      L.tileLayer("https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png", {
        detectRetina: true,
        maxZoom: 19,
        minZoom: 11,
        attribution:
          '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:16px;width:16px;vertical-align:middle;"/>&nbsp;<a href="https://www.onemap.gov.sg/" target="_blank" rel="noreferrer">OneMap</a>&nbsp;&copy;&nbsp;contributors&nbsp;|&nbsp;<a href="https://www.sla.gov.sg/" target="_blank" rel="noreferrer">Singapore Land Authority</a>',
      }).addTo(map);

      const subjectIcon = L.divIcon({
        className: "",
        html: '<div style="width:18px;height:18px;border-radius:50%;background:#1e7e66;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      L.marker([b.lat!, b.lng!], { icon: subjectIcon }).addTo(map).bindPopup(`<strong>${b.name}</strong><br/>${b.address}`);
      L.circle([b.lat!, b.lng!], { radius, color: "#1e7e66", weight: 1.5, fillOpacity: 0.06 }).addTo(map);

      for (const p of projects) {
        const negative = p.impact.direction.includes("negative");
        const color = negative ? "#d97706" : p.impact.direction.includes("positive") ? "#2b9d7f" : "#67768e";
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.35)"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });
        L.marker([p.lat, p.lng], { icon })
          .addTo(map)
          .bindPopup(
            `<strong>${p.name}</strong><br/>${p.projectType} · ${STATUS_LABELS[p.status] ?? p.status}<br/>${fmtNum(p.distanceMetres)} m away`
          );
      }
    })();
    return () => {
      cancelled = true;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b.lat, b.lng, radius, data.nearbyProjects.length]);

  if (b.lat == null || b.lng == null) {
    return (
      <EmptyState
        title="No coordinates recorded for this property"
        body="Add the property via an official OneMap address match on the search page to enable the vicinity map."
      />
    );
  }

  return (
    <div className="grid gap-5">
      <Card
        title="Vicinity map"
        subtitle={
          <span>
            Basemap: OneMap © Singapore Land Authority. Master Plan zoning for the property:{" "}
            <strong>{b.masterPlanZoning ?? "Not available from the connected sources"}</strong>. Zoning alone does
            not prove a project will be built.
          </span>
        }
      >
        <div className="no-print mb-3 flex gap-1">
          {RADII.map((r) => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${radius === r ? "bg-accent-600 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"}`}
            >
              {r >= 1000 ? `${r / 1000} km` : `${r} m`}
            </button>
          ))}
        </div>
        <div ref={mapRef} className="h-[420px] w-full overflow-hidden rounded-xl border border-ink-200" role="application" aria-label="Vicinity map" />
      </Card>

      <Card title={`Nearby developments within ${radius >= 1000 ? `${radius / 1000} km` : `${radius} m`} (${projects.length})`}>
        {projects.length === 0 ? (
          <p className="text-sm text-ink-500">
            No projects recorded within this radius. Add projects from official announcements via the Import page
            (projects template) - the app does not invent planning projects.
          </p>
        ) : (
          <div className="divide-y divide-ink-100">
            {projects.map((p) => (
              <ProjectRow key={p.id} p={p} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ProjectRow({ p }: { p: NearbyProjectWithImpact }) {
  const dir = DIRECTION_META[p.impact.direction] ?? DIRECTION_META.neutral_uncertain;
  return (
    <div className="py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-ink-900">{p.name}</span>
        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-600">{p.projectType}</span>
        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-sky-200">{STATUS_LABELS[p.status] ?? p.status}</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${dir.cls}`}>{dir.label}</span>
        <span className="text-xs text-ink-400">{HORIZON_LABELS[p.impact.horizon]}</span>
      </div>
      <p className="mt-1 text-xs text-ink-500">
        {fmtNum(p.distanceMetres)} m away
        {p.expectedCompletion ? ` · expected ${p.expectedCompletion}` : " · completion not officially announced"}
        {p.announcedDate ? ` · announced ${fmtDate(p.announcedDate)}` : ""}
      </p>
      {p.description && <p className="mt-1 text-sm text-ink-600">{p.description}</p>}
      <div className="mt-2 rounded-lg bg-ink-50 px-3 py-2 text-xs leading-relaxed text-ink-600">
        <p><strong className="text-ink-800">Assessed effect (opinion, not fact):</strong> {p.impact.reasoning}</p>
        {p.impact.affected.length > 0 && (
          <p className="mt-1"><strong className="text-ink-800">Mainly affects:</strong> {p.impact.affected.map((a) => a.replace(/_/g, " ")).join(", ")}</p>
        )}
        {p.impact.assumptions.length > 0 && (
          <p className="mt-1"><strong className="text-ink-800">Assumptions:</strong> {p.impact.assumptions.join(" ")}</p>
        )}
        <p className="mt-1"><strong className="text-ink-800">Confidence:</strong> {p.impact.confidenceScore}/100</p>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <SourceLine sourceName={p.sourceName} sourceUrl={p.sourceUrl} retrievalDate={p.retrievalDate} />
        <ConfidenceBadge level={p.confidence} />
      </div>
    </div>
  );
}
