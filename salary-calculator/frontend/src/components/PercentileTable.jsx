import { Tooltip } from './ui.jsx';

const fmt = (n) => (n != null ? `S$${Math.round(n).toLocaleString()}` : '—');

const ROWS = [
  {
    key: 'p25',
    name: '25th percentile',
    band: 'Entry / Lower Market',
    tip: 'This usually represents the lower end of the market range, often for candidates with less direct experience or fewer matching skills.',
  },
  {
    key: 'p50',
    name: '50th percentile',
    band: 'Market Median',
    tip: 'This is the market median. Half of comparable roles are estimated below this point and half above it.',
  },
  {
    key: 'p75',
    name: '75th percentile',
    band: 'Competitive',
    tip: 'This represents a competitive salary range, often for candidates with strong relevant skills or better role fit.',
  },
  {
    key: 'p90',
    name: '90th percentile',
    band: 'Top Market',
    tip: 'This represents top-market compensation and may require strong experience, niche skills, leadership scope or high-demand specialization.',
  },
  {
    key: 'topMarket',
    name: 'Top Market Range',
    band: 'Exceptional cases',
    tip: 'The upper end seen in the market. We show this instead of a "100th percentile" because the absolute top is distorted by rare outliers.',
  },
];

export default function PercentileTable({ salary }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="pb-2.5 font-semibold">Benchmark</th>
            <th className="pb-2.5 font-semibold">Market band</th>
            <th className="pb-2.5 text-right font-semibold">Monthly (S$)</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.key} className="border-b border-slate-100 last:border-0">
              <td className="py-3 font-medium text-navy">
                {row.name}
                <Tooltip text={row.tip} />
              </td>
              <td className="py-3 text-slate-500">{row.band}</td>
              <td className="py-3 text-right font-semibold text-navy">{fmt(salary[row.key])}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Recommended asking range — full-width band below the table */}
      <div className="mt-5 rounded-2xl border border-green-200 bg-green-50/70 p-5">
        <p className="mb-4 text-sm font-semibold text-green-800">Recommended asking range</p>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-green-600">Minimum</p>
            <p className="text-2xl font-extrabold text-green-800">{fmt(salary.recommendedMin)}</p>
            <p className="text-[11px] text-green-600">per month</p>
          </div>
          <div className="mb-4 h-1.5 flex-1 rounded-full bg-gradient-to-r from-green-300 to-green-600" />
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-green-600">Maximum</p>
            <p className="text-2xl font-extrabold text-green-800">{fmt(salary.recommendedMax)}</p>
            <p className="text-[11px] text-green-600">per month</p>
          </div>
        </div>
      </div>
    </div>
  );
}
