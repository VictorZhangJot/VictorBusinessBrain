import { Link } from 'react-router-dom';

const BENEFITS = [
  {
    title: 'Singapore-focused salary insights',
    text: 'Every benchmark is specific to the Singapore job market — no blended regional averages.',
    icon: '🇸🇬',
  },
  {
    title: 'Percentile-based benchmark',
    text: 'See where you sit against the 25th, 50th, 75th and 90th percentile, not just one number.',
    icon: '📊',
  },
  {
    title: 'AI, Data Centre, Tech & corporate coverage',
    text: 'Deep coverage of AI, Data Centre, Technology, Healthcare, Sales, Marketing, Finance, HR and Operations roles.',
    icon: '🧠',
  },
  {
    title: 'Job opportunity recommendations',
    text: 'Get matched to open Singapore roles that fit your profile, skills and expected salary.',
    icon: '🎯',
  },
  {
    title: 'Recruiter-backed salary guidance',
    text: 'Built by Jobs of Tomorrow recruiters who place these roles every week.',
    icon: '🤝',
  },
];

const STEPS = [
  ['1', 'Tell us your profile', 'Job title, experience, skills and current salary — about 2 minutes.'],
  ['2', 'See your market position', 'A percentile benchmark, bell curve and recommended asking range.'],
  ['3', 'Act on it', 'Matched jobs, hiring companies, skill gaps — and a free recruiter review if you want one.'],
];

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-navy text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="max-w-2xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide">
              Free · No sign-up needed to see results
            </p>
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
              Find Out Your Market Salary in Singapore
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-300">
              Compare your salary against Singapore job market benchmarks and discover roles
              that match your profile.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/calculator" className="btn-primary !px-8 !py-3.5 !text-base">
                Calculate My Salary →
              </Link>
              <span className="text-sm text-slate-400">Takes ~2 minutes · Results shown instantly</span>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="card p-6">
              <div className="mb-3 text-2xl">{b.icon}</div>
              <h3 className="mb-1.5 font-bold text-navy">{b.title}</h3>
              <p className="text-sm leading-relaxed text-slate-500">{b.text}</p>
            </div>
          ))}
          <div className="card flex flex-col justify-center bg-electric-soft p-6">
            <h3 className="mb-1.5 font-bold text-navy">Ready to see your number?</h3>
            <p className="mb-4 text-sm text-slate-500">Value first — contact details are optional.</p>
            <Link to="/calculator" className="btn-primary w-fit">Calculate My Salary</Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="mb-10 text-center text-2xl font-bold text-navy">How it works</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {STEPS.map(([n, title, text]) => (
              <div key={n} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-electric-soft text-lg font-extrabold text-electric">
                  {n}
                </div>
                <h3 className="mb-1.5 font-bold text-navy">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
