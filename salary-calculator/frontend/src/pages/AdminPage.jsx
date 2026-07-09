import { useEffect, useState } from 'react';
import { uploadSalaryCsv, getSources } from '../services/api.js';
import { SectionHeading } from '../components/ui.jsx';

const CSV_COLUMNS = [
  'title', 'normalizedTitle', 'industry', 'specialization', 'seniority',
  'yearsExperienceMin', 'yearsExperienceMax', 'qualification', 'skills',
  'p25SalaryMonthly', 'p50SalaryMonthly', 'p75SalaryMonthly', 'p90SalaryMonthly',
  'topMarketSalaryMonthly', 'source', 'sourceType', 'sourceDate', 'country',
  'location', 'confidenceScore',
];

const SAMPLE_ROW =
  'Cloud Architect,cloud architect,Technology,Cloud Infrastructure,Senior,7,12,"Bachelor\'s Degree","AWS; Kubernetes; Terraform",9500,12000,15000,18500,22000,Internal Benchmark Jul 2026,uploaded_csv,2026-07-01,Singapore,Singapore,85';

export default function AdminPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [sources, setSources] = useState(null);

  const loadSources = () => getSources().then(setSources).catch(() => {});
  useEffect(() => { loadSources(); }, []);

  const downloadTemplate = () => {
    const csv = `${CSV_COLUMNS.join(',')}\n${SAMPLE_ROW}\n`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'jot-salary-benchmark-template.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const upload = async () => {
    if (!file) { setError('Choose a CSV file first.'); return; }
    setError('');
    setUploading(true);
    setResult(null);
    try {
      const res = await uploadSalaryCsv(file);
      setResult(res);
      loadSources();
    } catch (e) {
      setError(e?.response?.data?.error || 'Upload failed — please check the file and try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <SectionHeading
        eyebrow="Admin"
        title="Salary benchmark data"
        subtitle="Upload benchmark CSVs and see which sources power the calculator."
      />

      {/* Upload card */}
      <div className="card mb-8 p-6 sm:p-8">
        <h2 className="mb-1 font-bold text-navy">Upload benchmark CSV</h2>
        <p className="mb-4 text-sm text-slate-500">
          Rows are validated (title, salary numbers, source date, Singapore location) and merged
          into the benchmark dataset used by the calculator.
        </p>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block text-sm text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-electric-soft file:px-4 file:py-2 file:text-sm file:font-semibold file:text-electric hover:file:bg-blue-100"
          />
          <button className="btn-primary" onClick={upload} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload & validate'}
          </button>
          <button className="btn-secondary" onClick={downloadTemplate}>
            ⬇ Download CSV template
          </button>
        </div>

        <details className="text-xs text-slate-400">
          <summary className="cursor-pointer font-medium text-slate-500">Expected columns</summary>
          <p className="mt-2 leading-relaxed">{CSV_COLUMNS.join(' · ')}</p>
          <p className="mt-1">Separate multiple skills with semicolons. Dates must be YYYY-MM-DD. Salaries are monthly S$ figures.</p>
        </details>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}

        {result && (
          <div className="mt-5 space-y-3">
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full bg-green-100 px-4 py-1.5 text-sm font-semibold text-green-700">
                ✓ {result.validRows} row(s) accepted
              </span>
              <span className={`rounded-full px-4 py-1.5 text-sm font-semibold ${result.rejectedRows ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                {result.rejectedRows} row(s) rejected
              </span>
            </div>
            {result.validationErrors?.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="mb-1.5 text-sm font-semibold text-red-700">Validation errors</p>
                <ul className="list-inside list-disc space-y-0.5 text-xs text-red-600">
                  {result.validationErrors.map((e) => <li key={e}>{e}</li>)}
                </ul>
              </div>
            )}
            {result.warnings?.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="mb-1.5 text-sm font-semibold text-amber-700">Warnings</p>
                <ul className="list-inside list-disc space-y-0.5 text-xs text-amber-700">
                  {result.warnings.map((w) => <li key={w}>{w}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sources overview */}
      {sources && (
        <div className="card p-6 sm:p-8">
          <h2 className="mb-1 font-bold text-navy">Data sources in use</h2>
          <p className="mb-4 text-sm text-slate-500">
            {sources.totalRecords} benchmark records · latest data point: {sources.latestSourceDate || '—'}
          </p>
          <div className="mb-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-semibold">Source</th>
                  <th className="pb-2 font-semibold">Type</th>
                  <th className="pb-2 font-semibold">Latest date</th>
                  <th className="pb-2 text-right font-semibold">Records</th>
                </tr>
              </thead>
              <tbody>
                {sources.recordsBySource.map((s) => (
                  <tr key={s.source} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 font-medium text-navy">{s.source}</td>
                    <td className="py-2.5 text-slate-500">{s.sourceTypeLabel}</td>
                    <td className="py-2.5 text-slate-500">{s.latestSourceDate || '—'}</td>
                    <td className="py-2.5 text-right font-semibold text-navy">{s.records}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mb-2 text-sm font-bold text-navy">Connector status</h3>
          <div className="flex flex-wrap gap-2">
            {sources.providers.map((p) => (
              <span
                key={p.name}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  p.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {p.name} · {p.status === 'active' ? 'active' : 'not connected'}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Greyed-out connectors are legal placeholders — they activate only when approved API
            access or licensed data is connected. No scraping of protected platforms.
          </p>
        </div>
      )}
    </div>
  );
}
