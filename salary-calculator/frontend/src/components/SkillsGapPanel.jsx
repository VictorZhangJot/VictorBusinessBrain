export default function SkillsGapPanel({ skillsGap }) {
  if (!skillsGap?.length) {
    return <p className="text-sm text-slate-500">Your listed skills already cover the common requirements we see for this profile.</p>;
  }
  return (
    <div>
      <p className="mb-4 text-sm text-slate-500">
        Adding evidence of these skills is the most direct way to move your profile towards the
        75th–90th percentile for your target role:
      </p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {skillsGap.map((s) => (
          <div key={s.skill} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5">
            <span className="text-sm font-medium text-navy">{s.skill}</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                s.inDemand ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {s.inDemand ? 'In demand now' : 'Sector staple'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
