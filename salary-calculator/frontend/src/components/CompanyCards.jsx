const fmt = (n) => `S$${Math.round(n).toLocaleString()}`;

export default function CompanyCards({ companies }) {
  if (!companies?.length) {
    return <p className="text-sm text-slate-500">No company matches in the current mock dataset.</p>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {companies.map((c) => (
        <div key={c.company} className="card p-5">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="font-bold text-navy">{c.company}</h3>
            <span className="shrink-0 rounded-full bg-electric-soft px-2.5 py-1 text-xs font-bold text-electric">
              {c.hiringLikelihood}% hiring
            </span>
          </div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">{c.industry}</p>
          <p className="mb-1 text-xs text-slate-500">
            <span className="font-semibold text-slate-600">Common roles:</span> {(c.commonRoles || []).slice(0, 3).join(', ')}
          </p>
          <p className="mb-3 text-xs text-slate-500">
            <span className="font-semibold text-slate-600">Typical range:</span> {fmt(c.typicalSalaryMin)} – {fmt(c.typicalSalaryMax)}
          </p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {(c.keySkills || []).slice(0, 4).map((s) => (
              <span key={s} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                {s}
              </span>
            ))}
          </div>
          {c.matchReasons?.length > 0 && (
            <p className="mb-2 text-xs text-slate-500">✓ {c.matchReasons[0]}</p>
          )}
          <p className="border-t border-slate-100 pt-2 text-[11px] text-slate-400">Source: {c.source}</p>
        </div>
      ))}
    </div>
  );
}
