import { useEffect, useRef, useState } from 'react';

/** Small info tooltip used to explain percentile / confidence jargon. */
export function Tooltip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block align-middle">
      <button
        type="button"
        aria-label="More information"
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-500 hover:bg-electric hover:text-white"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        i
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-xl bg-navy px-3 py-2 text-xs font-normal leading-relaxed text-white shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}

export function Field({ label, hint, tooltip, optional, children }) {
  return (
    <div>
      <label className="field-label">
        {label}
        {optional && <span className="ml-1 text-xs font-normal text-slate-400">(optional)</span>}
        {tooltip && <Tooltip text={tooltip} />}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

/** Text input with autocomplete suggestions. */
export function AutocompleteInput({ value, onChange, suggestions = [], placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filtered = value
    ? suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value).slice(0, 6)
    : suggestions.slice(0, 6);

  return (
    <div className="relative" ref={ref}>
      <input
        className="field-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {filtered.map((s) => (
            <li key={s}>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm hover:bg-electric-soft hover:text-electric"
                onClick={() => { onChange(s); setOpen(false); }}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Multi-select chips with free-text add + suggestions. */
export function ChipInput({ values = [], onChange, suggestions = [], placeholder }) {
  const [draft, setDraft] = useState('');
  const add = (skill) => {
    const s = skill.trim();
    if (s && !values.some((v) => v.toLowerCase() === s.toLowerCase())) {
      onChange([...values, s]);
    }
    setDraft('');
  };
  const remaining = suggestions
    .filter((s) => !values.some((v) => v.toLowerCase() === s.toLowerCase()))
    .filter((s) => !draft || s.toLowerCase().includes(draft.toLowerCase()))
    .slice(0, 10);

  return (
    <div>
      {values.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span key={v} className="chip chip-active">
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                className="ml-0.5 font-bold"
                onClick={() => onChange(values.filter((x) => x !== v))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        className="field-input"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); add(draft); }
        }}
      />
      {remaining.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {remaining.map((s) => (
            <button key={s} type="button" className="chip" onClick={() => add(s)}>
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Selectable option cards (single select). */
export function OptionCards({ options, value, onChange, columns = 3 }) {
  return (
    <div className={`grid gap-2 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt === value ? '' : opt)}
          className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
            value === opt
              ? 'border-electric bg-electric-soft text-electric'
              : 'border-slate-200 bg-white text-slate-600 hover:border-electric/50'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function Slider({ value, onChange, min = 0, max = 30, unit = 'years' }) {
  return (
    <div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#2563EB]"
      />
      <div className="mt-1 flex justify-between text-xs text-slate-400">
        <span>{min}</span>
        <span className="rounded-full bg-electric-soft px-3 py-0.5 text-sm font-semibold text-electric">
          {value} {unit}
        </span>
        <span>{max}+</span>
      </div>
    </div>
  );
}

/** Salary input that shows thousands separators (8,000) while storing digits only. */
export function MoneyInput({ value, onChange, placeholder }) {
  const display = value ? Number(value).toLocaleString('en-US') : '';
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
        S$
      </span>
      <input
        inputMode="numeric"
        className="field-input !pl-10"
        value={display}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
      />
    </div>
  );
}

export function SelectInput({ value, onChange, options, placeholder = 'Select...' }) {
  return (
    <select
      className="field-input appearance-none"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

export function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div className="mb-6">
      {eyebrow && (
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-electric">{eyebrow}</p>
      )}
      <h2 className="text-xl font-bold text-navy sm:text-2xl">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}
