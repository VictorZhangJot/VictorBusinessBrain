const BENEFITS = [
  {
    icon: "📄",
    title: "ATS-friendly format",
    body: "A clean structure that applicant tracking systems parse correctly — no tables, columns or graphics that break parsing.",
  },
  {
    icon: "✨",
    title: "AI-powered bullet points",
    body: "Answer simple questions and click to insert recruiter-quality wording. No staring at a blank page.",
  },
  {
    icon: "🇸🇬",
    title: "Singapore recruiter reviewed",
    body: "Built by Jobs of Tomorrow recruiters around what Singapore hiring managers actually shortlist.",
  },
  {
    icon: "🎯",
    title: "Made for your industry",
    body: "Tailored suggestions for AI, Data Centre, Technology and corporate roles — sales, marketing, finance, HR and operations.",
  },
];

const STEPS = [
  ["1", "Tell us your target role", "Pick your role and industry — 2 minutes of clicks, not typing."],
  ["2", "Click to build each section", "Choose from AI-generated summaries, bullet points and skills written for your role."],
  ["3", "Check, polish and download", "Get an ATS score, one-click improvements, then export to PDF or Word."],
];

export default function LandingPage({ onStart, onResume }) {
  return (
    <div className="min-h-screen bg-navy-950 text-white">
      {/* Top bar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-600 text-sm font-extrabold">J</div>
          <span className="text-[15px] font-bold tracking-tight">
            Jobs of Tomorrow <span className="font-medium text-white/50">· Resume Builder</span>
          </span>
        </div>
        <a href="https://jot.com.sg" className="hidden text-sm font-medium text-white/60 transition hover:text-white sm:block">
          jot.com.sg
        </a>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 text-center sm:pt-24">
        <p className="mb-5 inline-block rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[13px] font-medium text-white/70">
          Free tool from Singapore recruiters at Jobs of Tomorrow
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl">
          Build a Job-Winning Resume <span className="text-accent-500">with AI</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/60">
          Create a Singapore-ready resume in minutes with recruiter-backed suggestions. Click to choose strong wording — no need to write from scratch.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={onStart}
            className="rounded-xl bg-accent-600 px-8 py-4 text-base font-bold text-white shadow-[0_4px_20px_rgba(46,107,255,0.4)] transition hover:bg-accent-500 hover:shadow-[0_4px_28px_rgba(46,107,255,0.55)]"
          >
            Start Building My Resume →
          </button>
          {onResume && (
            <button
              onClick={onResume}
              className="rounded-xl border border-white/20 px-8 py-4 text-base font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
            >
              Continue my saved draft
            </button>
          )}
        </div>
        <p className="mt-4 text-[13px] text-white/40">No sign-up needed · Your draft saves automatically in this browser</p>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b) => (
            <div key={b.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-white/20 hover:bg-white/[0.06]">
              <div className="mb-3 text-2xl">{b.icon}</div>
              <h3 className="mb-1.5 text-[15px] font-bold">{b.title}</h3>
              <p className="text-sm leading-relaxed text-white/55">{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="mb-10 text-center text-2xl font-bold sm:text-3xl">Three steps to a resume recruiters shortlist</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map(([n, title, body]) => (
              <div key={n} className="text-center">
                <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-accent-600/15 text-lg font-extrabold text-accent-500">
                  {n}
                </div>
                <h3 className="mb-1.5 font-bold">{title}</h3>
                <p className="text-sm leading-relaxed text-white/55">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <button
              onClick={onStart}
              className="rounded-xl bg-white px-8 py-3.5 text-base font-bold text-navy-900 transition hover:bg-accent-50"
            >
              Build my resume now
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-[13px] text-white/35">
        © {new Date().getFullYear()} Jobs of Tomorrow Pte Ltd · Singapore recruitment for AI, Data Centre & corporate roles
      </footer>
    </div>
  );
}
