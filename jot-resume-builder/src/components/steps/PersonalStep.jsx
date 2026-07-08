import { Card, Field, TextInput, StepHeading } from "../ui.jsx";

export default function PersonalStep({ resume, update }) {
  const { personal } = resume;
  const set = (patch) => update({ personal: { ...personal, ...patch } });

  return (
    <div>
      <StepHeading
        kicker="Step 2 of 7"
        title="Your contact details"
        sub="These go at the top of your resume. Singapore tip: no photo, NRIC or date of birth needed — recruiters don't expect them."
      />
      <Card>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name">
            <TextInput value={personal.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Tan Wei Ming" autoComplete="name" />
          </Field>
          <Field label="Email">
            <TextInput type="email" value={personal.email} onChange={(e) => set({ email: e.target.value })} placeholder="e.g. weiming.tan@email.com" autoComplete="email" />
          </Field>
          <Field label="Phone">
            <TextInput type="tel" value={personal.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="e.g. +65 9123 4567" autoComplete="tel" />
          </Field>
          <Field label="Location">
            <TextInput value={personal.location} onChange={(e) => set({ location: e.target.value })} placeholder="Singapore" />
          </Field>
          <Field label="LinkedIn URL" hint="Optional but recommended — most Singapore recruiters will look">
            <TextInput value={personal.linkedin} onChange={(e) => set({ linkedin: e.target.value })} placeholder="linkedin.com/in/yourname" />
          </Field>
          <Field label="Portfolio / GitHub URL" hint="Optional — useful for AI and tech roles">
            <TextInput value={personal.portfolio} onChange={(e) => set({ portfolio: e.target.value })} placeholder="github.com/yourname" />
          </Field>
        </div>
      </Card>
    </div>
  );
}
