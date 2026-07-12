"use client";

import { useState } from "react";
import { Card, ErrorState, Field } from "@/components/ui";

const KINDS = [
  ["sales", "Sale transactions"],
  ["rentals", "Rental records"],
  ["projects", "Nearby projects / planning items"],
] as const;

export default function ImportPage() {
  const [kind, setKind] = useState<string>("sales");
  const [file, setFile] = useState<File | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [isRealis, setIsRealis] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ imported: number; flagged: number; errors: { line: number; message: string }[]; totalErrorRows: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!file) {
      setError("Choose a CSV or XLSX file first.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("kind", kind);
      form.set("source_name", sourceName);
      form.set("realis", isRealis ? "yes" : "no");
      const res = await fetch("/api/import", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Import failed (HTTP ${res.status})`);
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink-950">Import data</h1>
      <p className="mb-6 text-sm text-ink-500">
        Bring in transaction files you have downloaded from official sources (URA Property Market Information,
        data.gov.sg) or exported legally from your own REALIS subscription. Column templates are in the{" "}
        <code className="rounded bg-ink-100 px-1 py-0.5 text-[11px]">templates/</code> folder of this project -
        also linked in the README. Possible duplicates are flagged for review, never deleted.
      </p>

      <Card>
        <div className="grid gap-4">
          <Field label="What are you importing?">
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
              {KINDS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="File (.csv or .xlsx, max 10 MB / 20,000 rows)">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="input file:mr-3 file:rounded-md file:border-0 file:bg-ink-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-ink-700"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Field>
          <Field label="Source name (recorded against every row)" hint='e.g. "URA PMI commercial transactions, downloaded 12 Jul 2026"'>
            <input className="input" value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="Where does this file come from?" />
          </Field>
          <label className="flex items-start gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={isRealis} onChange={(e) => setIsRealis(e.target.checked)} className="mt-0.5" />
            <span>
              This is an export from my own REALIS subscription.
              <span className="block text-xs text-ink-500">
                REALIS data stays private to this database. This app never automates REALIS access and never sees your REALIS login.
              </span>
            </span>
          </label>
          <div>
            <button onClick={submit} disabled={busy} className="btn-primary">
              {busy ? "Importing…" : "Import file"}
            </button>
          </div>
        </div>
      </Card>

      {error && <div className="mt-4"><ErrorState message={error} onRetry={submit} /></div>}

      {result && (
        <Card className="mt-4" title="Import result">
          <ul className="space-y-1 text-sm text-ink-700">
            <li><strong className="text-accent-700">{result.imported}</strong> rows imported.</li>
            <li>
              <strong className={result.flagged ? "text-amber-600" : "text-ink-700"}>{result.flagged}</strong>{" "}
              flagged as possible duplicates (kept, marked for review).
            </li>
            <li>
              <strong className={result.totalErrorRows ? "text-red-600" : "text-ink-700"}>{result.totalErrorRows}</strong>{" "}
              rows rejected by validation.
            </li>
          </ul>
          {result.errors.length > 0 && (
            <div className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-ink-200 bg-ink-50 p-3 text-xs text-ink-600">
              {result.errors.map((e) => (
                <p key={`${e.line}-${e.message}`}>Row {e.line}: {e.message}</p>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
