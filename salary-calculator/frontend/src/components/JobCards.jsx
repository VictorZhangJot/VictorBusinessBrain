const fmt = (n) => `S$${Math.round(n).toLocaleString()}`;

function scoreColor(score) {
  if (score >= 75) return 'bg-green-100 text-green-700';
  if (score >= 50) return 'bg-electric-soft text-electric';
  return 'bg-amber-100 text-amber-700';
}

export default function JobCards({ jobs }) {
  if (!jobs?.length) {
    return <p className="text-sm text-slate-500">No matching open roles in our current mock dataset — a recruiter review can surface unlisted opportunities.</p>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {jobs.map((job) => (
        <div key={`${job.company}-${job.jobTitle}`} className="card flex flex-col p-5">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-navy">{job.jobTitle}</h3>
              <p className="text-sm text-slate-500">{job.company} · {job.industry}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${scoreColor(job.matchScore)}`}>
              {job.matchScore}% match
            </span>
          </div>
          <p className="mb-1 text-sm font-semibold text-navy">
            {fmt(job.salaryMin)} – {fmt(job.salaryMax)} / month
          </p>
          <p className="mb-3 text-xs text-slate-400">
            {job.location} · {job.employmentType} · {job.workArrangement} · {job.yearsExperienceRequired}+ yrs
          </p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {(job.skillsRequired || []).slice(0, 5).map((s) => (
              <span key={s} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                {s}
              </span>
            ))}
          </div>
          {job.matchReasons?.length > 0 && (
            <p className="mb-3 text-xs text-slate-500">✓ {job.matchReasons.slice(0, 2).join(' · ')}</p>
          )}
          <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
            <span>Posted {job.postedDate} · {job.source}</span>
            <a href={job.applyUrl} className="font-semibold text-electric hover:underline">Apply →</a>
          </div>
        </div>
      ))}
    </div>
  );
}
