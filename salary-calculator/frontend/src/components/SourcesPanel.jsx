export default function SourcesPanel({ dataSources, confidenceScore }) {
  if (!dataSources?.length) return null;
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full bg-electric-soft px-4 py-1.5">
          <span className="text-xs font-semibold text-electric">Confidence score</span>
          <span className="text-sm font-extrabold text-electric">{confidenceScore}/100</span>
        </div>
        <p className="text-xs text-slate-400">
          This reflects how closely your profile matches available Singapore salary data.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="pb-2 font-semibold">Source</th>
              <th className="pb-2 font-semibold">Type</th>
              <th className="pb-2 font-semibold">Latest data</th>
              <th className="pb-2 text-right font-semibold">Records used</th>
            </tr>
          </thead>
          <tbody>
            {dataSources.map((s) => (
              <tr key={s.source} className="border-b border-slate-100 last:border-0">
                <td className="py-2.5 font-medium text-navy">{s.source}</td>
                <td className="py-2.5 text-slate-500">{s.sourceTypeLabel}</td>
                <td className="py-2.5 text-slate-500">{s.sourceDate || '—'}</td>
                <td className="py-2.5 text-right font-semibold text-navy">{s.recordsUsed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
