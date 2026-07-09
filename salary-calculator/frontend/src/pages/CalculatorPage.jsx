import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  JOB_TITLES, INDUSTRIES, SPECIALIZATIONS, QUALIFICATIONS, SENIORITY_LEVELS,
  EMPLOYMENT_TYPES, WORK_ARRANGEMENTS, COMPANY_SIZES, WORK_ELIGIBILITY,
  SKILL_SUGGESTIONS, CERTIFICATION_SUGGESTIONS, TOOL_SUGGESTIONS,
} from '../data/formOptions.js';
import {
  Field, AutocompleteInput, ChipInput, OptionCards, Slider, SelectInput,
} from '../components/ui.jsx';
import { calculateSalary, recommendJobs, recommendCompanies } from '../services/api.js';

const STEPS = ['Current profile', 'Target role', 'Skills', 'Preferences'];

const INITIAL = {
  currentTitle: '',
  yearsExperience: 5,
  qualification: '',
  currentMonthlySalary: '',
  currentAnnualPackage: '',
  targetTitle: '',
  industry: '',
  specialization: '',
  seniority: '',
  employmentType: 'Full-time',
  skills: [],
  certifications: [],
  tools: [],
  workArrangement: '',
  companySize: '',
  expectedMonthlySalary: '',
  workEligibility: '',
};

export default function CalculatorPage({ onResult }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const validateStep = () => {
    if (step === 0) {
      if (!form.currentTitle.trim()) return 'Please enter your current job title.';
      if (!form.currentMonthlySalary || Number(form.currentMonthlySalary) <= 0)
        return 'Please enter your current monthly base salary so we can show your market position.';
    }
    if (step === 1) {
      if (!form.targetTitle.trim()) return 'Please enter your target job title.';
      if (!form.industry) return 'Please select an industry.';
    }
    return '';
  };

  const next = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0 });
  };

  const submit = async () => {
    setError('');
    setLoading(true);
    const profile = {
      ...form,
      yearsExperience: Number(form.yearsExperience),
      currentMonthlySalary: Number(form.currentMonthlySalary) || null,
      currentAnnualPackage: Number(form.currentAnnualPackage) || null,
      expectedMonthlySalary: Number(form.expectedMonthlySalary) || null,
      salaryExpectation: Number(form.expectedMonthlySalary) || null,
      skills: [...form.skills, ...form.tools],
    };
    try {
      const [salary, jobs, companies] = await Promise.all([
        calculateSalary(profile),
        recommendJobs(profile),
        recommendCompanies(profile),
      ]);
      onResult({ salary, jobs, companies }, profile);
      navigate('/results');
    } catch (e) {
      setError(
        e?.response?.data?.error ||
        'Something went wrong while calculating. Please check the backend is running and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="mb-2 flex justify-between text-xs font-medium text-slate-400">
          {STEPS.map((label, i) => (
            <span key={label} className={i <= step ? 'text-electric' : ''}>
              {label}
            </span>
          ))}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-electric transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="card p-6 sm:p-8">
        <h1 className="mb-1 text-xl font-bold text-navy">
          Step {step + 1}: {STEPS[step]}
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          {step === 0 && 'Where you are today — this anchors your market position.'}
          {step === 1 && 'The role you want to benchmark against.'}
          {step === 2 && 'Skills sharpen the match. Pick from suggestions or type your own.'}
          {step === 3 && 'Almost done — a few optional preferences.'}
        </p>

        {step === 0 && (
          <div className="space-y-5">
            <Field label="Current job title">
              <AutocompleteInput
                value={form.currentTitle}
                onChange={set('currentTitle')}
                suggestions={JOB_TITLES}
                placeholder="e.g. Data Centre Engineer"
              />
            </Field>
            <Field label="Years of experience">
              <Slider value={form.yearsExperience} onChange={set('yearsExperience')} />
            </Field>
            <Field label="Highest qualification">
              <SelectInput value={form.qualification} onChange={set('qualification')} options={QUALIFICATIONS} />
            </Field>
            <Field label="Current monthly base salary (S$)" hint="Base salary only, before bonus and allowances.">
              <input
                type="number"
                min="0"
                className="field-input"
                value={form.currentMonthlySalary}
                onChange={(e) => set('currentMonthlySalary')(e.target.value)}
                placeholder="e.g. 6000"
              />
            </Field>
            <Field label="Current annual package (S$)" optional hint="Including bonus, AWS and allowances, if you know it.">
              <input
                type="number"
                min="0"
                className="field-input"
                value={form.currentAnnualPackage}
                onChange={(e) => set('currentAnnualPackage')(e.target.value)}
                placeholder="e.g. 90000"
              />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <Field label="Target job title" hint="Can be the same as your current title.">
              <AutocompleteInput
                value={form.targetTitle}
                onChange={set('targetTitle')}
                suggestions={JOB_TITLES}
                placeholder="e.g. Senior Data Centre Engineer"
              />
            </Field>
            <Field label="Industry">
              <OptionCards options={INDUSTRIES} value={form.industry} onChange={(v) => {
                set('industry')(v);
                set('specialization')('');
              }} />
            </Field>
            {form.industry && SPECIALIZATIONS[form.industry] && (
              <Field label="Specialization">
                <OptionCards options={SPECIALIZATIONS[form.industry]} value={form.specialization} onChange={set('specialization')} />
              </Field>
            )}
            <Field label="Seniority level">
              <OptionCards options={SENIORITY_LEVELS} value={form.seniority} onChange={set('seniority')} />
            </Field>
            <Field label="Employment type">
              <OptionCards options={EMPLOYMENT_TYPES} value={form.employmentType} onChange={set('employmentType')} />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <Field label="Key skills" hint="Press Enter to add a skill that isn't suggested.">
              <ChipInput values={form.skills} onChange={set('skills')} suggestions={SKILL_SUGGESTIONS} placeholder="Type a skill..." />
            </Field>
            <Field label="Certifications" optional>
              <ChipInput values={form.certifications} onChange={set('certifications')} suggestions={CERTIFICATION_SUGGESTIONS} placeholder="Type a certification..." />
            </Field>
            <Field label="Tools and platforms used" optional>
              <ChipInput values={form.tools} onChange={set('tools')} suggestions={TOOL_SUGGESTIONS} placeholder="Type a tool..." />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <Field label="Preferred work arrangement">
              <OptionCards options={WORK_ARRANGEMENTS} value={form.workArrangement} onChange={set('workArrangement')} />
            </Field>
            <Field label="Preferred company size">
              <OptionCards options={COMPANY_SIZES} value={form.companySize} onChange={set('companySize')} />
            </Field>
            <Field
              label="Expected monthly salary (S$)"
              optional
              hint="We'll show where this sits on the market curve."
            >
              <input
                type="number"
                min="0"
                className="field-input"
                value={form.expectedMonthlySalary}
                onChange={(e) => set('expectedMonthlySalary')(e.target.value)}
                placeholder="e.g. 7500"
              />
            </Field>
            <Field label="Singapore work eligibility" optional>
              <SelectInput value={form.workEligibility} onChange={set('workEligibility')} options={WORK_ELIGIBILITY} />
            </Field>
          </div>
        )}

        {error && (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => { setError(''); setStep((s) => Math.max(0, s - 1)); }}
            disabled={step === 0 || loading}
          >
            ← Back
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn-primary" onClick={next}>
              Continue →
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={submit} disabled={loading}>
              {loading ? 'Calculating…' : 'Show My Salary Benchmark'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
