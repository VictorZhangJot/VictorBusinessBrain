import { useMemo, useState } from "react";
import { buildSummaries, INDUSTRIES } from "../../data/roles.js";
import { Card, Chip, StepHeading, SuggestionCard, TextArea, Field } from "../ui.jsx";

export default function SummaryStep({ resume, update, setResume, role }) {
  const { setup, strengths } = resume;
  const [pastIndustries, setPastIndustries] = useState(() =>
    setup.industry ? [setup.industry] : []
  );

  const toggleStrength = (s) =>
    setResume((r) => {
      const has = r.strengths.includes(s);
      if (!has && r.strengths.length >= 3) return r; // top 3 only
      return { ...r, strengths: has ? r.strengths.filter((x) => x !== s) : [...r.strengths, s] };
    });

  const toggleIndustry = (i) =>
    setPastIndustries((list) => (list.includes(i) ? list.filter((x) => x !== i) : list.length < 3 ? [...list, i] : list));

  const options = useMemo(
    () =>
      buildSummaries(role, {
        levelId: setup.levelId,
        styleId: setup.styleId,
        strengths,
        industries: pastIndustries,
        targetTitle: setup.targetTitle,
      }),
    [role, setup.levelId, setup.styleId, strengths, pastIndustries, setup.targetTitle]
  );

  if (!role) {
    return (
      <div>
        <StepHeading kicker="Step 3 of 7" title="Career summary" />
        <Card>
          <p className="text-sm text-navy-800/70">
            ← Go back to <b>Setup</b> and choose a role category first — the AI summaries are written for your specific target role.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <StepHeading
        kicker="Step 3 of 7"
        title="Generate your career summary"
        sub="Answer two quick questions by clicking, then choose the summary that sounds most like you. You can edit it after inserting."
      />

      <Card className="mb-4">
        <Field label={`Your top strengths (pick up to 3) — ${strengths.length}/3 selected`}>
          <div className="flex flex-wrap gap-2">
            {role.strengths.map((s) => (
              <Chip key={s} active={strengths.includes(s)} onClick={() => toggleStrength(s)}>
                {s}
              </Chip>
            ))}
          </div>
        </Field>
        <div className="mt-5">
          <Field label="Industries you've worked in (pick up to 3)">
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((i) => (
                <Chip key={i} active={pastIndustries.includes(i)} onClick={() => toggleIndustry(i)}>
                  {i}
                </Chip>
              ))}
            </div>
          </Field>
        </div>
      </Card>

      <p className="mb-3 text-sm font-bold text-navy-900">✨ AI-generated options — click one to use it</p>
      <div className="space-y-3">
        {options.map((o) => (
          <SuggestionCard
            key={o.tag}
            tag={o.tag}
            text={o.text}
            added={resume.summary === o.text}
            onUse={() => update({ summary: o.text })}
          />
        ))}
      </div>

      <Card className="mt-5">
        <Field label="Your summary (edit freely)" hint="2–4 sentences is the sweet spot for Singapore recruiters">
          <TextArea rows={4} value={resume.summary} onChange={(e) => update({ summary: e.target.value })} placeholder="Pick an option above, or write your own…" />
        </Field>
      </Card>
    </div>
  );
}
