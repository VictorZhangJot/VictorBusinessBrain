import { useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import BellCurveChart from '../components/BellCurveChart.jsx';
import PercentileTable from '../components/PercentileTable.jsx';
import JobCards from '../components/JobCards.jsx';
import CompanyCards from '../components/CompanyCards.jsx';
import SkillsGapPanel from '../components/SkillsGapPanel.jsx';
import SourcesPanel from '../components/SourcesPanel.jsx';
import LeadCaptureForm from '../components/LeadCaptureForm.jsx';
import { SectionHeading, Tooltip } from '../components/ui.jsx';
import { exportSalaryReport } from '../utils/pdfExport.js';

const fmt = (n) => (n != null ? `S$${Math.round(n).toLocaleString()}` : '—');

function positionLabel(p) {
  if (p == null) return null;
  if (p < 35) return { text: 'Entry / Lower Market', cls: 'bg-amber-100 text-amber-700' };
  if (p < 62) return { text: 'Around Market Median', cls: 'bg-electric-soft text-electric' };
  if (p < 85) return { text: 'Competitive', cls: 'bg-green-100 text-green-700' };
  return { text: 'Top Market', cls: 'bg-green-100 text-green-700' };
}

export default function ResultsPage({ result, profile }) {
  const chartRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  if (!result?.salary) return <Navigate to="/calculator" replace />;

  const { salary, jobs, companies } = result;
  const noData = salary.p50 == null;
  const pos = positionLabel(salary.currentSalaryPercentile);

  const downloadPdf = async () => {
    setExporting(true);
    try {
      await exportSalaryReport({ profile, salary, jobs, chartEl: chartRef.current });
    } finally {
      setExporting(false);
    }
  };

  if (noData) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="mb-3 text-2xl font-bold text-navy">No close match found</h1>
        {salary.interpretation.map((line) => (
          <p key={line} className="mb-4 text-sm text-slate-500">{line}</p>
        ))}
        <Link to="/calculator" className="btn-primary">← Adjust my profile</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Header + summary tiles */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-electric">Your salary benchmark</p>
          <h1 className="text-2xl font-extrabold text-navy sm:text-3xl">
            {profile.currentTitle} · Singapore
          </h1>
          {pos && salary.currentSalaryPercentile != null && (
            <p className="mt-2 text-sm text-slate-500">
              Your current salary is around the{' '}
              <strong className="text-navy">{salary.currentSalaryPercentile}th percentile</strong>{' '}
              <span className={`ml-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${pos.cls}`}>{pos.text}</span>
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary" onClick={downloadPdf} disabled={exporting}>
            {exporting ? 'Preparing PDF…' : '⬇ Download PDF report'}
          </button>
          <Link to="/calculator" className="btn-secondary">Edit profile</Link>
        </div>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-4">
        {[
          ['Market median (P50)', fmt(salary.p50), 'Half of comparable roles are estimated below this point and half above it.'],
          ['Competitive (P75)', fmt(salary.p75), 'A competitive salary, often for candidates with strong relevant skills or better role fit.'],
          ['Top market (P90)', fmt(salary.p90), 'Top-market compensation — usually needs strong experience, niche skills or leadership scope.'],
          ['Recommended ask', `${fmt(salary.recommendedMin)} – ${fmt(salary.recommendedMax)}`, 'The range we recommend asking for, based on your profile and the market data.'],
        ].map(([label, value, tip]) => (
          <div key={label} className="card p-5">
            <p className="mb-1 text-xs font-medium text-slate-400">
              {label}
              <Tooltip text={tip} />
            </p>
            <p className="text-lg font-extrabold text-navy">{value}</p>
            <p className="text-[11px] text-slate-400">per month</p>
          </div>
        ))}
      </div>

      {/* Bell curve */}
      <section className="card mb-8 p-6 sm:p-8">
        <SectionHeading
          eyebrow="Market distribution"
          title="Where you sit on the Singapore salary curve"
          subtitle="Estimated distribution of monthly salaries for comparable roles."
        />
        <div ref={chartRef} className="bg-white">
          <BellCurveChart
            salary={salary}
            currentSalary={Number(profile.currentMonthlySalary)}
          />
        </div>
      </section>

      <div className="mb-8 grid gap-8 lg:grid-cols-2">
        {/* Percentile table */}
        <section className="card p-6 sm:p-8">
          <SectionHeading eyebrow="Benchmark" title="Percentile breakdown" />
          <PercentileTable salary={salary} />
        </section>

        {/* Interpretation */}
        <section className="card p-6 sm:p-8">
          <SectionHeading eyebrow="Plain English" title="What this means for you" />
          <ul className="space-y-3">
            {salary.interpretation.map((line) => (
              <li key={line} className="flex gap-2.5 text-sm leading-relaxed text-slate-600">
                <span className="mt-0.5 text-electric">●</span>
                {line}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Jobs */}
      <section className="mb-8">
        <SectionHeading
          eyebrow="Opportunities"
          title="Open roles that match your profile"
          subtitle="Version 1 shows sample opportunities — live roles are added as data sources connect."
        />
        <JobCards jobs={jobs} />
      </section>

      {/* Companies */}
      <section className="mb-8">
        <SectionHeading eyebrow="Employers" title="Companies likely to hire your profile" />
        <CompanyCards companies={companies} />
      </section>

      {/* Skills gap */}
      <section className="card mb-8 p-6 sm:p-8">
        <SectionHeading eyebrow="Level up" title="Skills that could lift your salary potential" />
        <SkillsGapPanel skillsGap={salary.skillsGap} />
      </section>

      {/* Sources */}
      <section className="card mb-8 p-6 sm:p-8">
        <SectionHeading eyebrow="Transparency" title="Where these numbers come from" />
        <SourcesPanel dataSources={salary.dataSources} confidenceScore={salary.confidenceScore} />
      </section>

      {/* Lead capture */}
      <section className="card mb-8 bg-navy p-6 text-white sm:p-10">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-2 text-center text-2xl font-bold">Want a recruiter to review your market value?</h2>
          <p className="mb-6 text-center text-sm text-slate-300">
            A Jobs of Tomorrow consultant will sanity-check this estimate against live mandates —
            free, no obligation.
          </p>
          <div className="rounded-2xl bg-white p-6 text-slate-800">
            <LeadCaptureForm defaultTargetRole={profile.currentTitle} />
          </div>
        </div>
      </section>

      <p className="mx-auto max-w-3xl text-center text-xs leading-relaxed text-slate-400">
        {salary.disclaimer}
      </p>
    </div>
  );
}
