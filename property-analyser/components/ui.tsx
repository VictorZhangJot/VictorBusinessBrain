"use client";

import { ReactNode } from "react";

export function Card({ title, subtitle, children, className = "" }: { title?: string; subtitle?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card p-5 ${className}`}>
      {title && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold tracking-tight text-ink-900">{title}</h3>
          {subtitle && <div className="mt-0.5 text-xs text-ink-500">{subtitle}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone = "default" }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "default" | "good" | "bad" | "warn" }) {
  const toneCls =
    tone === "good" ? "text-accent-700" : tone === "bad" ? "text-red-600" : tone === "warn" ? "text-amber-600" : "text-ink-900";
  return (
    <div className="card px-4 py-3.5">
      <div className="label">{label}</div>
      <div className={`mt-1 text-lg font-semibold tabular-nums tracking-tight ${toneCls}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-ink-500">{hint}</div>}
    </div>
  );
}

const CONF_STYLES: Record<string, string> = {
  high: "bg-accent-50 text-accent-700 ring-accent-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  low: "bg-orange-50 text-orange-700 ring-orange-200",
  insufficient: "bg-ink-100 text-ink-500 ring-ink-200",
};

export function ConfidenceBadge({ level }: { level: string }) {
  const cls = CONF_STYLES[level] ?? CONF_STYLES.insufficient;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${cls}`}>
      {level === "insufficient" ? "insufficient data" : `${level} confidence`}
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  official: "bg-accent-50 text-accent-700 ring-accent-200",
  user: "bg-sky-50 text-sky-700 ring-sky-200",
  demo: "bg-purple-50 text-purple-700 ring-purple-200",
  estimated: "bg-amber-50 text-amber-700 ring-amber-200",
  derived: "bg-ink-100 text-ink-600 ring-ink-200",
};

export function RecordStatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? STATUS_STYLES.derived;
  const label = status === "user" ? "user-provided" : status;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${cls}`}>
      {label}
    </span>
  );
}

export function SourceLine({ sourceName, sourceUrl, retrievalDate, reportingPeriod }: { sourceName: string; sourceUrl?: string | null; retrievalDate?: string | null; reportingPeriod?: string | null }) {
  return (
    <span className="text-xs text-ink-500">
      Source:{" "}
      {sourceUrl ? (
        <a href={sourceUrl} target="_blank" rel="noreferrer" className="underline decoration-ink-300 underline-offset-2 hover:text-ink-700">
          {sourceName}
        </a>
      ) : (
        sourceName
      )}
      {reportingPeriod ? ` · period ${reportingPeriod}` : ""}
      {retrievalDate ? ` · retrieved ${new Date(retrievalDate).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" })}` : ""}
    </span>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 bg-ink-50/50 px-6 py-10 text-center">
      <p className="text-sm font-medium text-ink-700">{title}</p>
      {body && <p className="mt-1 max-w-md text-xs leading-relaxed text-ink-500">{body}</p>}
    </div>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-ink-500" role="status" aria-live="polite">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-300 border-t-accent-600" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 rounded-lg border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100">
          Try again
        </button>
      )}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label mb-1">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink-400">{hint}</span>}
    </label>
  );
}

export function DemoBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="mb-5 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-800">
      <strong className="font-semibold">Demo data in view.</strong> Records marked “demo” are fictional and exist
      only to demonstrate the app. Import real data (Import page) or connect official sources (Sources page)
      before using any figure for a real decision.
    </div>
  );
}
