"use client";

import { useEffect, useState } from "react";
import { Card, ErrorState, Spinner } from "@/components/ui";
import { fmtDate } from "@/lib/format";

interface SourcesPayload {
  adapters: { name: string; label: string; kind: string; termsUrl: string | null; available: boolean; reason: string | null; whatIsNeeded: string | null }[];
  sources: { id: string; name: string; kind: string; baseUrl: string | null; termsUrl: string | null; authority: string; notes: string | null }[];
  retrievals: { id: string; sourceName: string; retrievedAt: string; recordCount: number | null; status: string; requestInfo: string | null }[];
  uploads: { id: string; fileName: string; kind: string; rowsImported: number; rowsFlagged: number; createdAt: string }[];
}

export default function SourcesPage() {
  const [data, setData] = useState<SourcesPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sources")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <ErrorState message={`Could not load sources: ${error}`} />;
  if (!data) return <Spinner label="Loading source status…" />;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink-950">Data sources</h1>
      <p className="mb-6 text-sm text-ink-500">
        Live status of every connector, plus a log of imports and retrievals. Review each source&apos;s terms of
        use before enabling it. Where live access needs credentials, the app tells you exactly what is required
        - it never bypasses logins, CAPTCHAs or subscription controls.
      </p>

      <Card title="Connectors" className="mb-5">
        <div className="divide-y divide-ink-100">
          {data.adapters.map((a) => (
            <div key={a.name} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="pr-4">
                <p className="text-sm font-medium text-ink-800">{a.label}</p>
                <p className="text-xs text-ink-500">
                  {a.kind.replace(/_/g, " ")}
                  {a.termsUrl && (
                    <> · <a className="underline decoration-ink-300 underline-offset-2" href={a.termsUrl} target="_blank" rel="noreferrer">terms of use</a></>
                  )}
                </p>
                {!a.available && a.whatIsNeeded && <p className="mt-1 max-w-xl text-xs leading-relaxed text-ink-500">{a.whatIsNeeded}</p>}
              </div>
              <span
                className={`inline-flex h-fit shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${
                  a.available ? "bg-accent-50 text-accent-700 ring-accent-200" : "bg-amber-50 text-amber-700 ring-amber-200"
                }`}
              >
                {a.available ? "ready" : "needs setup"}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Recent imports" className="mb-5">
        {data.uploads.length === 0 ? (
          <p className="text-sm text-ink-500">No files imported yet.</p>
        ) : (
          <table className="w-full">
            <thead><tr className="border-b border-ink-100"><th className="th">File</th><th className="th">Type</th><th className="th">Rows</th><th className="th">Flagged</th><th className="th">When</th></tr></thead>
            <tbody className="divide-y divide-ink-50">
              {data.uploads.map((u) => (
                <tr key={u.id}>
                  <td className="td">{u.fileName}</td>
                  <td className="td">{u.kind.replace(/_/g, " ")}</td>
                  <td className="td tabular-nums">{u.rowsImported}</td>
                  <td className="td tabular-nums">{u.rowsFlagged}</td>
                  <td className="td">{fmtDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Retrieval log">
        {data.retrievals.length === 0 ? (
          <p className="text-sm text-ink-500">No retrievals recorded yet.</p>
        ) : (
          <div className="divide-y divide-ink-50">
            {data.retrievals.map((r) => (
              <p key={r.id} className="py-2 text-xs text-ink-600">
                <span className="font-medium text-ink-800">{r.sourceName}</span> · {r.status}
                {r.recordCount != null ? ` · ${r.recordCount} records` : ""} · {fmtDate(r.retrievedAt)}
                {r.requestInfo ? ` · ${r.requestInfo}` : ""}
              </p>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
