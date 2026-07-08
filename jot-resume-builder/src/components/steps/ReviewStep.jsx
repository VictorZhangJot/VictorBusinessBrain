import { useMemo, useState } from "react";
import { scoreResume } from "../../lib/ats.js";
import { IMPROVEMENTS, SG_TIPS } from "../../lib/improve.js";
import { downloadDoc, copyResumeText, printResume } from "../../lib/exporters.js";
import { Card, StepHeading, PrimaryButton, GhostButton, Field, TextInput } from "../ui.jsx";

export default function ReviewStep({ resume, update, role }) {
  const ats = useMemo(() => scoreResume(resume, role), [resume, role]);
  const [copied, setCopied] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [pendingExport, setPendingExport] = useState(null);

  const runExport = (kind) => {
    if (kind === "pdf") printResume();
    if (kind === "doc") downloadDoc(resume);
    if (kind === "copy") {
      copyResumeText(resume).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  // First download triggers the (optional) recruiter-review offer.
  const requestExport = (kind) => {
    const seen = localStorage.getItem("jot-lead-prompted");
    if (!seen && kind !== "copy") {
      setPendingExport(kind);
      setLeadOpen(true);
    } else {
      runExport(kind);
    }
  };

  const closeLead = () => {
    localStorage.setItem("jot-lead-prompted", "1");
    setLeadOpen(false);
    if (pendingExport) {
      runExport(pendingExport);
      setPendingExport(null);
    }
  };

  return (
    <div>
      <StepHeading
        kicker="Step 7 of 7"
        title="Check, polish and download"
        sub="Your ATS score estimates how well applicant tracking systems and recruiters will read this resume. Fix what's flagged, then export."
      />

      {/* ATS score */}
      <Card className="mb-4">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <ScoreDial score={ats.score} />
          <div className="min-w-0 flex-1 space-y-3">
            {ats.strengths.length > 0 && (
              <div>
                <p className="mb-1 text-[12px] font-bold uppercase tracking-wide text-good-600">Strengths</p>
                <ul className="space-y-0.5">
                  {ats.strengths.map((s) => (
                    <li key={s} className="text-[13px] text-navy-900">✓ {s}</li>
                  ))}
                </ul>
              </div>
            )}
            {ats.improvements.length > 0 && (
              <div>
                <p className="mb-1 text-[12px] font-bold uppercase tracking-wide text-warn-600">Improvements</p>
                <ul className="space-y-0.5">
                  {ats.improvements.map((s) => (
                    <li key={s} className="text-[13px] text-navy-900">→ {s}</li>
                  ))}
                </ul>
              </div>
            )}
            {ats.missingKeywords.length > 0 && (
              <div>
                <p className="mb-1.5 text-[12px] font-bold uppercase tracking-wide text-navy-800/50">Missing keywords for your target role</p>
                <div className="flex flex-wrap gap-1.5">
                  {ats.missingKeywords.map((k) => (
                    <span key={k} className="rounded-full bg-mist-100 px-2.5 py-1 text-[12px] font-medium text-navy-800">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* AI improvement assistant */}
      <Card className="mb-4">
        <p className="mb-1 text-sm font-bold text-navy-900">✨ AI improvement assistant</p>
        <p className="mb-4 text-[13px] text-navy-800/55">
          One click rewrites your career summary and every bullet point. It sharpens wording honestly — it never invents numbers or achievements.
        </p>
        <div className="flex flex-wrap gap-2">
          {IMPROVEMENTS.map((imp) => (
            <button
              key={imp.id}
              type="button"
              title={imp.hint}
              onClick={() => {
                update({
                  summary: resume.summary ? imp.fn(resume.summary) : resume.summary,
                  experiences: resume.experiences.map((j) => ({ ...j, bullets: j.bullets.map(imp.fn) })),
                });
              }}
              className="rounded-lg border border-mist-300 bg-white px-3.5 py-2 text-[13px] font-semibold text-navy-800 transition hover:border-accent-500 hover:text-accent-600"
            >
              {imp.label}
            </button>
          ))}
        </div>
        <div className="mt-5 rounded-xl bg-mist-50 p-4">
          <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-navy-800/50">🇸🇬 Singapore employer checklist</p>
          <ul className="space-y-1">
            {SG_TIPS.map((t) => (
              <li key={t} className="text-[13px] leading-relaxed text-navy-900/80">• {t}</li>
            ))}
          </ul>
        </div>
      </Card>

      {/* Export */}
      <Card>
        <p className="mb-1 text-sm font-bold text-navy-900">Download your resume</p>
        <p className="mb-4 text-[13px] text-navy-800/55">
          PDF opens your browser's print window — choose "Save as PDF" there. Your draft also stays saved in this browser.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <PrimaryButton onClick={() => requestExport("pdf")}>⬇ Download as PDF</PrimaryButton>
          <GhostButton onClick={() => requestExport("doc")}>⬇ Download as Word</GhostButton>
          <GhostButton onClick={() => requestExport("copy")}>{copied ? "✓ Copied!" : "Copy resume text"}</GhostButton>
        </div>
      </Card>

      {leadOpen && <LeadCaptureModal resume={resume} onClose={closeLead} />}
    </div>
  );
}

function ScoreDial({ score }) {
  const color = score >= 75 ? "var(--color-good-600)" : score >= 50 ? "var(--color-warn-600)" : "#dc2626";
  const label = score >= 75 ? "Strong" : score >= 50 ? "Getting there" : "Needs work";
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex shrink-0 flex-col items-center">
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={r} fill="none" stroke="var(--color-mist-200)" strokeWidth="10" />
        <circle
          cx="65"
          cy="65"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          transform="rotate(-90 65 65)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text x="65" y="62" textAnchor="middle" fontSize="28" fontWeight="800" fill="var(--color-navy-900)">
          {score}
        </text>
        <text x="65" y="82" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--color-navy-800)" opacity="0.5">
          ATS score
        </text>
      </svg>
      <span className="mt-1 rounded-full px-3 py-1 text-[12px] font-bold" style={{ color, background: color + "18" }}>
        {label}
      </span>
    </div>
  );
}

function LeadCaptureModal({ resume, onClose }) {
  const [form, setForm] = useState({
    name: resume.personal.name || "",
    email: resume.personal.email || "",
    phone: resume.personal.phone || "",
    targetRole: resume.setup.targetTitle || "",
    consent: false,
  });
  const [sent, setSent] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = () => {
    // v1 stores the request locally; a backend or form service can pick this up later.
    const leads = JSON.parse(localStorage.getItem("jot-review-requests") || "[]");
    leads.push({ ...form, requestedAt: new Date().toISOString() });
    localStorage.setItem("jot-review-requests", JSON.stringify(leads));
    setSent(true);
    setTimeout(onClose, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-sm print:hidden">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        {sent ? (
          <div className="py-8 text-center">
            <p className="text-3xl">🎉</p>
            <p className="mt-3 text-base font-bold text-navy-900">Request received!</p>
            <p className="mt-1 text-sm text-navy-800/60">A JOT recruiter will be in touch. Your download will start now.</p>
          </div>
        ) : (
          <>
            <p className="text-lg font-bold text-navy-900">Want a free recruiter review?</p>
            <p className="mt-1 text-sm leading-relaxed text-navy-800/60">
              Before you download — would you like a Jobs of Tomorrow recruiter to review your resume for free? We place candidates in AI, Data Centre and corporate roles across Singapore.
            </p>
            <div className="mt-4 space-y-3">
              <Field label="Name">
                <TextInput value={form.name} onChange={(e) => set({ name: e.target.value })} />
              </Field>
              <Field label="Email">
                <TextInput type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
              </Field>
              <Field label="Phone">
                <TextInput value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
              </Field>
              <Field label="Target role">
                <TextInput value={form.targetRole} onChange={(e) => set({ targetRole: e.target.value })} />
              </Field>
              <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-relaxed text-navy-800/70">
                <input type="checkbox" checked={form.consent} onChange={(e) => set({ consent: e.target.checked })} className="mt-0.5 h-4 w-4 accent-accent-600" />
                I agree to Jobs of Tomorrow contacting me about my resume and relevant job opportunities.
              </label>
            </div>
            <div className="mt-5 flex gap-2.5">
              <PrimaryButton className="flex-1" disabled={!form.consent || !form.email.trim()} onClick={submit}>
                Yes, review my resume
              </PrimaryButton>
              <GhostButton onClick={onClose}>No thanks, just download</GhostButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
