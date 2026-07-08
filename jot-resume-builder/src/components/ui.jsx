// Small shared building blocks used across every step.

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-navy-800">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-navy-800/50">{hint}</span>}
    </label>
  );
}

export function TextInput(props) {
  return (
    <input
      {...props}
      className={
        "w-full rounded-lg border border-mist-300 bg-white px-3.5 py-2.5 text-sm text-navy-900 placeholder-navy-800/30 shadow-[0_1px_2px_rgba(10,27,51,0.04)] outline-none transition focus:border-accent-500 focus:ring-2 focus:ring-accent-100 " +
        (props.className || "")
      }
    />
  );
}

export function TextArea(props) {
  return (
    <textarea
      {...props}
      className={
        "w-full rounded-lg border border-mist-300 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-navy-900 placeholder-navy-800/30 shadow-[0_1px_2px_rgba(10,27,51,0.04)] outline-none transition focus:border-accent-500 focus:ring-2 focus:ring-accent-100 " +
        (props.className || "")
      }
    />
  );
}

export function Select({ children, ...props }) {
  return (
    <select
      {...props}
      className="w-full appearance-none rounded-lg border border-mist-300 bg-white px-3.5 py-2.5 text-sm text-navy-900 shadow-[0_1px_2px_rgba(10,27,51,0.04)] outline-none transition focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
    >
      {children}
    </select>
  );
}

export function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition " +
        (active
          ? "border-accent-600 bg-accent-600 text-white shadow-sm"
          : "border-mist-300 bg-white text-navy-800 hover:border-accent-500 hover:text-accent-600")
      }
    >
      {children}
    </button>
  );
}

export function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={
        "inline-flex items-center justify-center gap-2 rounded-lg bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_1px_3px_rgba(37,99,235,0.4)] transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-40 " +
        className
      }
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={
        "inline-flex items-center justify-center gap-2 rounded-lg border border-mist-300 bg-white px-5 py-2.5 text-sm font-semibold text-navy-800 transition hover:border-accent-500 hover:text-accent-600 disabled:opacity-40 " +
        className
      }
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "" }) {
  return (
    <div className={"rounded-xl border border-mist-200 bg-white p-5 shadow-[0_1px_3px_rgba(10,27,51,0.05)] " + className}>
      {children}
    </div>
  );
}

export function StepHeading({ kicker, title, sub }) {
  return (
    <div className="mb-6">
      <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-accent-600">{kicker}</p>
      <h2 className="text-xl font-bold text-navy-900">{title}</h2>
      {sub && <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-navy-800/60">{sub}</p>}
    </div>
  );
}

// A clickable AI suggestion row with an "Use this" affordance.
export function SuggestionCard({ tag, text, added, onUse }) {
  return (
    <button
      type="button"
      onClick={onUse}
      disabled={added}
      className={
        "group w-full rounded-xl border p-4 text-left transition " +
        (added
          ? "border-good-600/40 bg-good-100/50"
          : "border-mist-200 bg-white hover:border-accent-500 hover:shadow-[0_2px_8px_rgba(37,99,235,0.08)]")
      }
    >
      <div className="mb-1.5 flex items-center justify-between gap-3">
        {tag && (
          <span
            className={
              "rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide " +
              (added ? "bg-good-600/10 text-good-600" : "bg-accent-50 text-accent-600")
            }
          >
            {tag}
          </span>
        )}
        <span
          className={
            "text-xs font-semibold " +
            (added ? "text-good-600" : "text-accent-600 opacity-0 transition group-hover:opacity-100")
          }
        >
          {added ? "✓ Added" : "Click to use →"}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-navy-900">{text}</p>
    </button>
  );
}
