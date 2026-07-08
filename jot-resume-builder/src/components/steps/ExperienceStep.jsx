import { useState } from "react";
import { ACHIEVEMENT_CATEGORIES, buildAchievement } from "../../data/achievements.js";
import { Card, Field, TextInput, StepHeading, PrimaryButton, GhostButton } from "../ui.jsx";

const emptyJob = () => ({ company: "", title: "", start: "", end: "", current: false, bullets: [] });

export default function ExperienceStep({ resume, setResume, role }) {
  const { experiences } = resume;
  const [openIndex, setOpenIndex] = useState(experiences.length ? 0 : -1);

  // patch can be an object or a function of the current job — the functional
  // form keeps rapid suggestion clicks from overwriting each other.
  const setJob = (i, patch) =>
    setResume((r) => ({
      ...r,
      experiences: r.experiences.map((j, idx) =>
        idx === i ? { ...j, ...(typeof patch === "function" ? patch(j) : patch) } : j
      ),
    }));

  const addJob = () => {
    setResume((r) => ({ ...r, experiences: [...r.experiences, emptyJob()] }));
    setOpenIndex(experiences.length);
  };
  const removeJob = (i) => {
    setResume((r) => ({ ...r, experiences: r.experiences.filter((_, idx) => idx !== i) }));
    setOpenIndex(-1);
  };

  return (
    <div>
      <StepHeading
        kicker="Step 4 of 7"
        title="Work experience"
        sub="Add each job, then click AI-suggested bullet points instead of writing them. Each suggestion comes in three strengths — pick the one that matches what you actually did."
      />

      {experiences.length === 0 && (
        <Card className="mb-4 text-center">
          <p className="mb-3 text-sm text-navy-800/60">No jobs added yet. Fresh graduate? Internships and school projects count too.</p>
          <PrimaryButton onClick={addJob}>+ Add my first job</PrimaryButton>
        </Card>
      )}

      <div className="space-y-4">
        {experiences.map((job, i) => (
          <JobEditor
            key={i}
            job={job}
            index={i}
            open={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
            onChange={(patch) => setJob(i, patch)}
            onRemove={() => removeJob(i)}
            role={role}
          />
        ))}
      </div>

      {experiences.length > 0 && (
        <div className="mt-4">
          <GhostButton onClick={addJob}>+ Add another job</GhostButton>
        </div>
      )}
    </div>
  );
}

function JobEditor({ job, index, open, onToggle, onChange, onRemove, role }) {
  const [tab, setTab] = useState("resp");

  const addBullet = (text) =>
    onChange((j) => (j.bullets.includes(text) ? {} : { bullets: [...j.bullets, text] }));
  const removeBullet = (idx) => onChange((j) => ({ bullets: j.bullets.filter((_, i) => i !== idx) }));
  const editBullet = (idx, text) => onChange((j) => ({ bullets: j.bullets.map((b, i) => (i === idx ? text : b)) }));

  return (
    <Card className="!p-0 overflow-hidden">
      {/* Job header row */}
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
        <div>
          <p className="text-sm font-bold text-navy-900">
            {job.title || `Job ${index + 1}`}
            {job.company && <span className="font-medium text-navy-800/60"> · {job.company}</span>}
          </p>
          <p className="text-xs text-navy-800/45">
            {job.bullets.length} bullet point{job.bullets.length === 1 ? "" : "s"}
          </p>
        </div>
        <span className="text-navy-800/40">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="border-t border-mist-200 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name">
              <TextInput value={job.company} onChange={(e) => onChange({ company: e.target.value })} placeholder="e.g. ST Telemedia GDC" />
            </Field>
            <Field label="Job title">
              <TextInput value={job.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="e.g. Facilities Engineer" />
            </Field>
            <Field label="Start (month & year)">
              <TextInput value={job.start} onChange={(e) => onChange({ start: e.target.value })} placeholder="e.g. Mar 2022" />
            </Field>
            <Field label="End (month & year)">
              <div className="flex items-center gap-3">
                <TextInput value={job.current ? "" : job.end} disabled={job.current} onChange={(e) => onChange({ end: e.target.value })} placeholder="e.g. Jun 2025" />
                <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-semibold text-navy-800">
                  <input type="checkbox" checked={job.current} onChange={(e) => onChange({ current: e.target.checked })} className="accent-accent-600" />
                  Current
                </label>
              </div>
            </Field>
          </div>

          {/* Selected bullets */}
          <div className="mt-5">
            <p className="mb-2 text-[13px] font-semibold text-navy-800">Bullet points on your resume</p>
            {job.bullets.length === 0 ? (
              <p className="rounded-lg border border-dashed border-mist-300 px-4 py-3 text-[13px] text-navy-800/45">
                Nothing yet — click suggestions below to add them here.
              </p>
            ) : (
              <ul className="space-y-2">
                {job.bullets.map((b, i) => (
                  <li key={i} className="group flex items-start gap-2 rounded-lg border border-mist-200 bg-mist-50 px-3 py-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-600" />
                    <input
                      value={b}
                      onChange={(e) => editBullet(i, e.target.value)}
                      className="w-full bg-transparent text-[13px] leading-relaxed text-navy-900 outline-none"
                    />
                    <button type="button" onClick={() => removeBullet(i)} className="shrink-0 text-xs font-bold text-navy-800/30 transition hover:text-red-500" title="Remove">
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Suggestion tabs */}
          <div className="mt-6">
            <div className="mb-3 flex gap-1 rounded-lg bg-mist-100 p-1">
              <button
                type="button"
                onClick={() => setTab("resp")}
                className={"flex-1 rounded-md px-3 py-1.5 text-[13px] font-semibold transition " + (tab === "resp" ? "bg-white text-navy-900 shadow-sm" : "text-navy-800/55")}
              >
                ✨ Responsibility suggestions
              </button>
              <button
                type="button"
                onClick={() => setTab("achv")}
                className={"flex-1 rounded-md px-3 py-1.5 text-[13px] font-semibold transition " + (tab === "achv" ? "bg-white text-navy-900 shadow-sm" : "text-navy-800/55")}
              >
                🏆 Achievement builder
              </button>
            </div>

            {tab === "resp" ? (
              role ? (
                <ResponsibilityPicker role={role} bullets={job.bullets} onAdd={addBullet} />
              ) : (
                <p className="text-[13px] text-navy-800/55">Choose a role category in Setup to see responsibility suggestions.</p>
              )
            ) : (
              <AchievementPicker bullets={job.bullets} onAdd={addBullet} />
            )}
          </div>

          <div className="mt-5 text-right">
            <button type="button" onClick={onRemove} className="text-xs font-semibold text-red-400 transition hover:text-red-600">
              Remove this job
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

const VERSION_META = [
  { key: "basic", label: "Basic", cls: "bg-mist-100 text-navy-800/70" },
  { key: "stronger", label: "Stronger", cls: "bg-accent-50 text-accent-600" },
  { key: "achievement", label: "Achievement-focused", cls: "bg-good-100 text-good-600" },
];

function ResponsibilityPicker({ role, bullets, onAdd }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-navy-800/50">
        Suggestions for <b>{role.label}</b> — click any version to add it. Only pick what you genuinely did.
      </p>
      {role.responsibilities.map((r, i) => (
        <div key={i} className="rounded-xl border border-mist-200 p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            {VERSION_META.map((v) => {
              const text = r[v.key];
              const added = bullets.includes(text);
              return (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => onAdd(text)}
                  disabled={added}
                  className={
                    "rounded-lg border p-2.5 text-left transition " +
                    (added ? "border-good-600/40 bg-good-100/40" : "border-mist-200 hover:border-accent-500 hover:shadow-sm")
                  }
                >
                  <span className={"mb-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide " + v.cls}>
                    {added ? "✓ Added" : v.label}
                  </span>
                  <p className="text-[12px] leading-relaxed text-navy-900">{text}</p>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function AchievementPicker({ bullets, onAdd }) {
  const [checked, setChecked] = useState({});
  const [numbers, setNumbers] = useState({});

  const toggle = (id) => setChecked((c) => ({ ...c, [id]: !c[id] }));

  return (
    <div className="space-y-3">
      <p className="text-xs text-navy-800/50">
        Tick what applies to this job. Add a rough number only if it's true — we never invent metrics for you.
      </p>
      {ACHIEVEMENT_CATEGORIES.map((cat) => (
        <div key={cat.id} className="rounded-xl border border-mist-200 p-3">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input type="checkbox" checked={!!checked[cat.id]} onChange={() => toggle(cat.id)} className="h-4 w-4 accent-accent-600" />
            <span className="text-[13px] font-semibold text-navy-900">{cat.question}</span>
          </label>

          {checked[cat.id] && (
            <div className="mt-3 space-y-2 pl-6">
              <input
                value={numbers[cat.id] || ""}
                onChange={(e) => setNumbers((n) => ({ ...n, [cat.id]: e.target.value }))}
                placeholder={cat.numberLabel}
                className="w-full max-w-[240px] rounded-lg border border-mist-300 px-3 py-1.5 text-xs outline-none focus:border-accent-500 sm:w-auto"
              />
              {cat.templates.map((t, i) => {
                const text = buildAchievement(t, numbers[cat.id]);
                const added = bullets.includes(text);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onAdd(text)}
                    disabled={added}
                    className={
                      "block w-full rounded-lg border p-2.5 text-left text-[12.5px] leading-relaxed transition " +
                      (added ? "border-good-600/40 bg-good-100/40 text-navy-900" : "border-mist-200 text-navy-900 hover:border-accent-500 hover:shadow-sm")
                    }
                  >
                    {added ? "✓ " : "+ "}
                    {text}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
