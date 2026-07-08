import { useState } from "react";
import { Card, Chip, StepHeading, TextInput } from "../ui.jsx";

export default function SkillsStep({ resume, setResume, role }) {
  const { skills } = resume;
  const [custom, setCustom] = useState("");

  const toggle = (s) =>
    setResume((r) => ({
      ...r,
      skills: r.skills.includes(s) ? r.skills.filter((x) => x !== s) : [...r.skills, s],
    }));

  const addCustom = () => {
    const s = custom.trim();
    if (s) setResume((r) => (r.skills.includes(s) ? r : { ...r, skills: [...r.skills, s] }));
    setCustom("");
  };

  return (
    <div>
      <StepHeading
        kicker="Step 5 of 7"
        title="Key skills"
        sub="Click to add skills. Aim for 8–12 that you can genuinely back up in an interview — ATS software matches these words against the job ad."
      />

      {role && (
        <Card className="mb-4">
          <p className="mb-3 text-[13px] font-semibold text-navy-800">
            ✨ Suggested for {role.label} <span className="font-normal text-navy-800/45">— click to add or remove</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {role.skills.map((s) => (
              <Chip key={s} active={skills.includes(s)} onClick={() => toggle(s)}>
                {skills.includes(s) ? "✓ " : "+ "}
                {s}
              </Chip>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <p className="mb-3 text-[13px] font-semibold text-navy-800">Add your own skill</p>
        <div className="flex gap-2">
          <TextInput
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
            placeholder="e.g. Mandarin (business fluency)"
          />
          <button type="button" onClick={addCustom} className="shrink-0 rounded-lg bg-navy-900 px-4 text-sm font-semibold text-white transition hover:bg-navy-800">
            Add
          </button>
        </div>

        {skills.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-[13px] font-semibold text-navy-800">On your resume ({skills.length})</p>
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-3 py-1.5 text-[13px] font-medium text-white">
                  {s}
                  <button type="button" onClick={() => toggle(s)} className="text-white/50 transition hover:text-white">
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
