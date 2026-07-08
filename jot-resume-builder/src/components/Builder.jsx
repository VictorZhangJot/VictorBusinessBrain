import { useMemo, useState } from "react";
import { getRole } from "../data/roles.js";
import ResumePreview from "./ResumePreview.jsx";
import SetupStep from "./steps/SetupStep.jsx";
import PersonalStep from "./steps/PersonalStep.jsx";
import SummaryStep from "./steps/SummaryStep.jsx";
import ExperienceStep from "./steps/ExperienceStep.jsx";
import SkillsStep from "./steps/SkillsStep.jsx";
import EducationStep from "./steps/EducationStep.jsx";
import ReviewStep from "./steps/ReviewStep.jsx";
import { GhostButton, PrimaryButton } from "./ui.jsx";

const STEPS = [
  { id: "setup", label: "Setup", component: SetupStep },
  { id: "personal", label: "Details", component: PersonalStep },
  { id: "summary", label: "Summary", component: SummaryStep },
  { id: "experience", label: "Experience", component: ExperienceStep },
  { id: "skills", label: "Skills", component: SkillsStep },
  { id: "education", label: "Education", component: EducationStep },
  { id: "review", label: "Check & Export", component: ReviewStep },
];

export default function Builder({ resume, setResume, onExit }) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  const StepComponent = step.component;
  const role = useMemo(() => getRole(resume.setup.roleId), [resume.setup.roleId]);

  const update = (patch) => setResume((r) => ({ ...r, ...patch }));

  return (
    <div className="min-h-screen bg-mist-50">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-mist-200 bg-white/90 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <button onClick={onExit} className="flex items-center gap-2.5 text-left">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-900 text-sm font-extrabold text-white">J</div>
            <div className="hidden sm:block">
              <p className="text-[13px] font-bold leading-tight text-navy-900">JOT Resume Builder</p>
              <p className="text-[11px] leading-tight text-navy-800/50">Draft saves automatically</p>
            </div>
          </button>

          {/* Step pills */}
          <nav className="flex max-w-full items-center gap-1 overflow-x-auto">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setStepIndex(i)}
                className={
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-semibold transition " +
                  (i === stepIndex
                    ? "bg-navy-900 text-white"
                    : i < stepIndex
                      ? "text-good-600 hover:bg-mist-100"
                      : "text-navy-800/50 hover:bg-mist-100 hover:text-navy-800")
                }
              >
                {i < stepIndex ? "✓ " : ""}
                {s.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Two-pane layout: form left, live preview right (stacked on mobile) */}
      <main className="mx-auto grid max-w-[1400px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
        <div className="min-w-0">
          <StepComponent resume={resume} setResume={setResume} update={update} role={role} goNext={() => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))} />

          {/* Prev / next */}
          <div className="mt-8 flex items-center justify-between print:hidden">
            <GhostButton onClick={() => setStepIndex((i) => Math.max(i - 1, 0))} disabled={stepIndex === 0}>
              ← Back
            </GhostButton>
            {stepIndex < STEPS.length - 1 && (
              <PrimaryButton onClick={() => setStepIndex((i) => i + 1)}>
                Next: {STEPS[stepIndex + 1].label} →
              </PrimaryButton>
            )}
          </div>
        </div>

        <aside className="min-w-0 print:contents">
          <div className="lg:sticky lg:top-20 print:contents">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-navy-800/40 print:hidden">Live preview</p>
            <ResumePreview resume={resume} />
          </div>
        </aside>
      </main>
    </div>
  );
}
