import {
  AreaChart, Area, XAxis, YAxis, ReferenceLine, ReferenceArea,
  ResponsiveContainer, Tooltip as ChartTooltip,
} from 'recharts';

const fmt = (n) => `S$${Math.round(n).toLocaleString()}`;

/**
 * Bell curve approximated from the percentile anchors:
 * mean ≈ p50, sd ≈ (p75 - p25) / 1.349 (normal distribution IQR rule).
 */
function buildCurve(salary) {
  const mean = salary.p50;
  const sd = Math.max((salary.p75 - salary.p25) / 1.349, mean * 0.08);
  const lo = Math.max(0, mean - 3.2 * sd);
  const hi = Math.max(salary.topMarket * 1.1, mean + 3.2 * sd);
  const points = [];
  const stepSize = (hi - lo) / 120;
  for (let x = lo; x <= hi; x += stepSize) {
    const y = Math.exp(-((x - mean) ** 2) / (2 * sd * sd));
    points.push({ x: Math.round(x), y });
  }
  return points;
}

const MARKERS = [
  { key: 'p25', label: 'P25 · Entry / Lower Market', color: '#94A3B8' },
  { key: 'p50', label: 'P50 · Market Median', color: '#2563EB' },
  { key: 'p75', label: 'P75 · Competitive', color: '#16A34A' },
  { key: 'p90', label: 'P90 · Top Market', color: '#D97706' },
];

export default function BellCurveChart({ salary, currentSalary, expectedSalary }) {
  const data = buildCurve(salary);

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 30, right: 16, left: 16, bottom: 6 }}>
          <defs>
            <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#2563EB" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="x"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            tick={{ fontSize: 11, fill: '#94A3B8' }}
            axisLine={{ stroke: '#E2E8F0' }}
            tickLine={false}
          />
          <YAxis hide domain={[0, 1.15]} />
          <ChartTooltip
            content={({ label, active }) =>
              active && label != null ? (
                <div
                  style={{
                    background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12,
                    padding: '6px 12px', fontSize: 12, color: '#334155',
                    boxShadow: '0 4px 12px rgba(11,31,59,0.08)',
                  }}
                >
                  Monthly salary: {fmt(label)}
                </div>
              ) : null
            }
          />

          {/* Recommended asking range */}
          <ReferenceArea
            x1={salary.recommendedMin}
            x2={salary.recommendedMax}
            fill="#16A34A"
            fillOpacity={0.08}
            label={{ value: 'Recommended range', position: 'insideTop', fontSize: 11, fill: '#16A34A', fontWeight: 600 }}
          />

          <Area type="monotone" dataKey="y" stroke="#2563EB" strokeWidth={2} fill="url(#curveFill)" dot={false} />

          {MARKERS.map((m) => (
            <ReferenceLine
              key={m.key}
              x={salary[m.key]}
              stroke={m.color}
              strokeDasharray="4 3"
              label={{ value: m.key.toUpperCase(), position: 'top', fontSize: 10, fill: m.color, fontWeight: 700 }}
            />
          ))}

          {currentSalary > 0 && (
            <ReferenceLine
              x={currentSalary}
              stroke="#0B1F3B"
              strokeWidth={2}
              label={{ value: 'You today', position: 'top', fontSize: 11, fill: '#0B1F3B', fontWeight: 700, dy: -12 }}
            />
          )}
          {expectedSalary > 0 && (
            <ReferenceLine
              x={expectedSalary}
              stroke="#7C3AED"
              strokeWidth={2}
              strokeDasharray="6 3"
              label={{ value: 'Your target', position: 'top', fontSize: 11, fill: '#7C3AED', fontWeight: 700, dy: -12 }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-500">
        {MARKERS.map((m) => (
          <span key={m.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
            {m.label}: <strong className="text-slate-700">{fmt(salary[m.key])}</strong>
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-navy" />
          Your current salary
        </span>
        {expectedSalary > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#7C3AED' }} />
            Your expected salary
          </span>
        )}
      </div>
    </div>
  );
}
