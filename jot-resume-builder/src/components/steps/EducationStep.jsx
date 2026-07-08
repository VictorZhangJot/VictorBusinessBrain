import { Card, Field, TextInput, StepHeading, GhostButton, SuggestionCard } from "../ui.jsx";

export default function EducationStep({ resume, setResume, role }) {
  const { education, certifications } = resume;

  const setEdu = (i, patch) =>
    setResume((r) => ({ ...r, education: r.education.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) }));
  const addEdu = () =>
    setResume((r) => ({ ...r, education: [...r.education, { institution: "", qualification: "", year: "" }] }));
  const removeEdu = (i) => setResume((r) => ({ ...r, education: r.education.filter((_, idx) => idx !== i) }));

  const toggleCert = (c) =>
    setResume((r) => ({
      ...r,
      certifications: r.certifications.includes(c) ? r.certifications.filter((x) => x !== c) : [...r.certifications, c],
    }));

  return (
    <div>
      <StepHeading
        kicker="Step 6 of 7"
        title="Education & certifications"
        sub="List your highest qualification first. Certifications matter a lot for technical and data centre roles in Singapore."
      />

      <div className="space-y-4">
        {education.map((e, i) => (
          <Card key={i}>
            <div className="grid gap-4 sm:grid-cols-[2fr_2fr_1fr]">
              <Field label="Institution">
                <TextInput value={e.institution} onChange={(ev) => setEdu(i, { institution: ev.target.value })} placeholder="e.g. Singapore Polytechnic" />
              </Field>
              <Field label="Qualification">
                <TextInput value={e.qualification} onChange={(ev) => setEdu(i, { qualification: ev.target.value })} placeholder="e.g. Diploma in Electrical Engineering" />
              </Field>
              <Field label="Year">
                <TextInput value={e.year} onChange={(ev) => setEdu(i, { year: ev.target.value })} placeholder="e.g. 2021" />
              </Field>
            </div>
            {education.length > 1 && (
              <div className="mt-3 text-right">
                <button type="button" onClick={() => removeEdu(i)} className="text-xs font-semibold text-red-400 hover:text-red-600">
                  Remove
                </button>
              </div>
            )}
          </Card>
        ))}
      </div>
      <div className="mt-3">
        <GhostButton onClick={addEdu}>+ Add another qualification</GhostButton>
      </div>

      {role && (
        <div className="mt-8">
          <p className="mb-3 text-sm font-bold text-navy-900">✨ Certifications recruiters look for in {role.label} candidates</p>
          <p className="mb-3 text-xs text-navy-800/50">Click to add ones you hold (or are actively pursuing — mark those "in progress" after inserting).</p>
          <div className="space-y-2.5">
            {role.certifications.map((c) => (
              <SuggestionCard key={c} text={c} added={certifications.includes(c)} onUse={() => toggleCert(c)} />
            ))}
          </div>
        </div>
      )}

      {certifications.length > 0 && (
        <Card className="mt-5">
          <p className="mb-2 text-[13px] font-semibold text-navy-800">On your resume</p>
          <ul className="space-y-1.5">
            {certifications.map((c) => (
              <li key={c} className="flex items-center justify-between gap-3 text-[13px] text-navy-900">
                <span>• {c}</span>
                <button type="button" onClick={() => toggleCert(c)} className="text-xs font-bold text-navy-800/30 hover:text-red-500">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
