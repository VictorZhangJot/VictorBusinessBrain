"use client";

import { Card, EmptyState } from "@/components/ui";
import { AnalysisPayload, SwotItem } from "./types";

export default function SwotTab({ data }: { data: AnalysisPayload }) {
  const strengths = data.swot.filter((s) => s.kind === "strength");
  const weaknesses = data.swot.filter((s) => s.kind === "weakness");

  if (data.swot.length === 0) {
    return (
      <EmptyState
        title="Not enough data to evidence strengths or weaknesses"
        body="This analysis only states what the connected data supports. Import transactions, rentals, lease details and nearby projects to enable it."
      />
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title={`Potential strengths (${strengths.length})`}>
        {strengths.length === 0 ? (
          <p className="text-sm text-ink-500">None could be evidenced from the connected data.</p>
        ) : (
          <div className="divide-y divide-ink-100">{strengths.map((s) => <Item key={s.title} item={s} positive />)}</div>
        )}
      </Card>
      <Card title={`Potential weaknesses (${weaknesses.length})`}>
        {weaknesses.length === 0 ? (
          <p className="text-sm text-ink-500">None could be evidenced from the connected data - thin data can hide risks.</p>
        ) : (
          <div className="divide-y divide-ink-100">{weaknesses.map((s) => <Item key={s.title} item={s} />)}</div>
        )}
      </Card>
    </div>
  );
}

const IMPORTANCE_CLS: Record<string, string> = {
  high: "bg-ink-900 text-white",
  medium: "bg-ink-200 text-ink-700",
  low: "bg-ink-100 text-ink-500",
};

function Item({ item, positive = false }: { item: SwotItem; positive?: boolean }) {
  return (
    <div className="py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-sm font-semibold ${positive ? "text-accent-700" : "text-red-600"}`}>{item.title}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${IMPORTANCE_CLS[item.importance]}`}>{item.importance}</span>
        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium text-ink-500">
          {item.basis === "verified" ? "based on recorded data" : "inference"} · {item.confidence} confidence
        </span>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-ink-600">{item.evidence}</p>
      <p className="mt-0.5 text-xs text-ink-400">Source: {item.source}</p>
    </div>
  );
}
