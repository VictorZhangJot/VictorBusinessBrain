import { ROLES, INDUSTRIES, EXPERIENCE_LEVELS, RESUME_STYLES, detectRole } from "../../data/roles.js";
import { Card, Field, TextInput, Select, StepHeading } from "../ui.jsx";

export default function SetupStep({ resume, update }) {
  const { setup } = resume;
  const set = (patch) => update({ setup: { ...setup, ...patch } });

  const onTitleChange = (e) => {
    const targetTitle = e.target.value;
    const detected = detectRole(targetTitle);
    // Auto-detect the role category, but never overwrite a manual choice
    // unless the detection actually found something.
    set({ targetTitle, ...(detected ? { roleId: detected.id } : {}) });
  };

  return (
    <div>
      <StepHeading
        kicker="Step 1 of 7"
        title="Tell us what you're aiming for"
        sub="This powers every AI suggestion in the next steps — the summaries, bullet points, skills and certifications you'll see are all matched to your target role."
      />
      <Card className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Target job title" hint={setup.roleId ? `Suggestions matched to: ${ROLES.find((r) => r.id === setup.roleId)?.label}` : "e.g. AI Engineer, Data Centre Engineer, Sales Manager"}>
            <TextInput value={setup.targetTitle} onChange={onTitleChange} placeholder="e.g. Data Centre Engineer" />
          </Field>
          <Field label="Suggestion category" hint="Change this if the auto-match isn't right">
            <Select value={setup.roleId} onChange={(e) => set({ roleId: e.target.value })}>
              <option value="">— Choose the closest role —</option>
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Industry">
            <Select value={setup.industry} onChange={(e) => set({ industry: e.target.value })}>
              <option value="">— Select industry —</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Years of experience">
            <Select value={setup.levelId} onChange={(e) => set({ levelId: e.target.value })}>
              <option value="">— Select —</option>
              {EXPERIENCE_LEVELS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Current / most recent role">
            <TextInput value={setup.currentRole} onChange={(e) => set({ currentRole: e.target.value })} placeholder="e.g. Facilities Technician" />
          </Field>
          <Field label="Highest qualification">
            <TextInput value={setup.qualification} onChange={(e) => set({ qualification: e.target.value })} placeholder="e.g. Diploma in Electrical Engineering" />
          </Field>
        </div>

        <Field label="Preferred resume style">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {RESUME_STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => set({ styleId: s.id })}
                className={
                  "rounded-xl border p-3.5 text-left transition " +
                  (setup.styleId === s.id
                    ? "border-accent-600 bg-accent-50 ring-2 ring-accent-100"
                    : "border-mist-200 bg-white hover:border-accent-500")
                }
              >
                <p className="text-sm font-bold text-navy-900">{s.label}</p>
                <p className="mt-0.5 text-xs text-navy-800/55">{s.note}</p>
              </button>
            ))}
          </div>
        </Field>
      </Card>
    </div>
  );
}
