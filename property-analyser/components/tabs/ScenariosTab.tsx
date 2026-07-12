"use client";

import { useMemo, useState } from "react";
import { Card, Field } from "@/components/ui";
import { AnalysisPayload } from "./types";
import { CalculatorInputs, runInvestmentModel, ModelResult } from "@/lib/finance";
import { deriveScenario, ScenarioName } from "@/lib/scenarios";
import { fmtSGD, fmtNum, fmtPct } from "@/lib/format";

const SCENARIOS: ScenarioName[] = ["conservative", "base", "optimistic"];
const EDITABLE: { key: keyof CalculatorInputs; label: string; step?: number }[] = [
  { key: "monthlyBaseRent", label: "Monthly rent" },
  { key: "vacancyAllowancePct", label: "Vacancy allowance %", step: 1 },
  { key: "annualEscalationPct", label: "Escalation %", step: 0.5 },
  { key: "interestRatePct", label: "Interest rate %", step: 0.05 },
  { key: "annualAppreciationPct", label: "Appreciation %", step: 0.25 },
  { key: "purchasePrice", label: "Purchase price" },
  { key: "holdingPeriodYears", label: "Holding years", step: 1 },
];

export default function ScenariosTab({ data, baseInputs }: { data: AnalysisPayload; baseInputs: CalculatorInputs }) {
  const [overrides, setOverrides] = useState<Record<ScenarioName, Partial<CalculatorInputs>>>({
    conservative: {},
    base: {},
    optimistic: {},
  });

  const scenarioInputs = useMemo(() => {
    const out = {} as Record<ScenarioName, CalculatorInputs>;
    for (const s of SCENARIOS) out[s] = { ...deriveScenario(baseInputs, s), ...overrides[s] };
    return out;
  }, [baseInputs, overrides]);

  const results = useMemo(() => {
    const out = {} as Record<ScenarioName, ModelResult | null>;
    for (const s of SCENARIOS) {
      try {
        out[s] = runInvestmentModel(scenarioInputs[s]);
      } catch {
        out[s] = null;
      }
    }
    return out;
  }, [scenarioInputs]);

  function setOverride(s: ScenarioName, key: keyof CalculatorInputs, value: number) {
    setOverrides((prev) => ({ ...prev, [s]: { ...prev[s], [key]: value } }));
  }

  const metricRows: { label: string; get: (m: ModelResult) => string; tone?: (m: ModelResult) => string }[] = [
    { label: "Monthly cash flow", get: (m) => fmtSGD(m.monthlyCashFlow), tone: (m) => (m.monthlyCashFlow >= 0 ? "text-accent-700" : "text-red-600") },
    { label: "Annual NOI", get: (m) => fmtSGD(m.annualNoi) },
    { label: "Gross yield", get: (m) => fmtPct(m.grossYieldPct) },
    { label: "Net yield", get: (m) => fmtPct(m.netYieldPct) },
    { label: "DSCR", get: (m) => (m.dscr != null ? fmtNum(m.dscr, 2) : "—"), tone: (m) => (m.dscr != null && m.dscr < 1 ? "text-red-600" : "") },
    { label: "Break-even occupancy", get: (m) => fmtPct(m.breakEvenOccupancyPct) },
    { label: "Total effective rental", get: (m) => fmtSGD(m.totalEffectiveRent) },
    { label: "Net sale proceeds", get: (m) => fmtSGD(m.netSaleProceeds) },
    { label: "Total return (profit)", get: (m) => fmtSGD(m.totalProfit), tone: (m) => (m.totalProfit >= 0 ? "text-accent-700" : "text-red-600") },
    { label: "IRR", get: (m) => (m.irrPct != null ? fmtPct(m.irrPct) : "—") },
    { label: `NPV @ ${baseInputs.discountRatePct}%`, get: (m) => fmtSGD(m.npv), tone: (m) => (m.npv >= 0 ? "text-accent-700" : "text-red-600") },
  ];

  return (
    <div className="grid gap-5">
      <Card
        title="Scenario comparison"
        subtitle="Conservative and optimistic start from documented derivations of your base case (see Sources & Assumptions) - every cell below the table is editable"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-ink-100">
                <th className="th">Metric</th>
                {SCENARIOS.map((s) => (
                  <th key={s} className="th capitalize">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {metricRows.map((row) => (
                <tr key={row.label}>
                  <td className="td text-ink-500">{row.label}</td>
                  {SCENARIOS.map((s) => {
                    const m = results[s];
                    return (
                      <td key={s} className={`td tabular-nums font-medium ${m && row.tone ? row.tone(m) : ""}`}>
                        {m ? row.get(m) : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        {SCENARIOS.map((s) => (
          <Card key={s} title={`${s[0].toUpperCase()}${s.slice(1)} assumptions`} className="no-print">
            <div className="grid gap-2.5">
              {EDITABLE.map(({ key, label, step }) => (
                <Field key={String(key)} label={label}>
                  <input
                    type="number"
                    step={step ?? "any"}
                    className="input"
                    value={String(scenarioInputs[s][key] ?? "")}
                    onChange={(e) => setOverride(s, key, Number(e.target.value))}
                  />
                </Field>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <SensitivitySection baseInputs={baseInputs} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sensitivity analysis
// ---------------------------------------------------------------------------

type SensChoice = "price_rent" | "rate_rent" | "vacancy_escalation" | "exit_holding" | "price_exit";

const SENS_OPTIONS: { value: SensChoice; label: string }[] = [
  { value: "price_rent", label: "Purchase price × monthly rent" },
  { value: "rate_rent", label: "Interest rate × monthly rent" },
  { value: "vacancy_escalation", label: "Vacancy rate × rental escalation" },
  { value: "exit_holding", label: "Exit price × holding period" },
  { value: "price_exit", label: "Purchase price × exit price" },
];

function SensitivitySection({ baseInputs }: { baseInputs: CalculatorInputs }) {
  const [choice, setChoice] = useState<SensChoice>("price_rent");
  const [metric, setMetric] = useState<"cashflow" | "irr" | "dscr" | "netYield">("cashflow");
  const [minYield, setMinYield] = useState(3);
  const [minIrr, setMinIrr] = useState(5);

  const grid = useMemo(() => {
    const steps = [-0.2, -0.1, 0, 0.1, 0.2];
    const cfg: Record<SensChoice, { rowKey: keyof CalculatorInputs; colKey: keyof CalculatorInputs; rowVals: number[]; colVals: number[]; rowFmt: (v: number) => string; colFmt: (v: number) => string }> = {
      price_rent: {
        rowKey: "purchasePrice", colKey: "monthlyBaseRent",
        rowVals: steps.map((s) => Math.round(baseInputs.purchasePrice * (1 + s))),
        colVals: steps.map((s) => Math.round(baseInputs.monthlyBaseRent * (1 + s))),
        rowFmt: (v) => fmtSGD(v), colFmt: (v) => fmtSGD(v),
      },
      rate_rent: {
        rowKey: "interestRatePct", colKey: "monthlyBaseRent",
        rowVals: [-2, -1, 0, 1, 2].map((d) => Math.max(0.5, baseInputs.interestRatePct + d)),
        colVals: steps.map((s) => Math.round(baseInputs.monthlyBaseRent * (1 + s))),
        rowFmt: (v) => `${fmtNum(v, 2)}%`, colFmt: (v) => fmtSGD(v),
      },
      vacancy_escalation: {
        rowKey: "vacancyAllowancePct", colKey: "annualEscalationPct",
        rowVals: [0, 5, 10, 15, 20],
        colVals: [0, 1, 2, 3, 4],
        rowFmt: (v) => `${v}% vac`, colFmt: (v) => `${v}% esc`,
      },
      exit_holding: {
        rowKey: "expectedSalePrice", colKey: "holdingPeriodYears",
        rowVals: steps.map((s) => Math.round(baseInputs.purchasePrice * (1 + s))),
        colVals: [3, 5, 7, 10, 15],
        rowFmt: (v) => fmtSGD(v), colFmt: (v) => `${v}y`,
      },
      price_exit: {
        rowKey: "purchasePrice", colKey: "expectedSalePrice",
        rowVals: steps.map((s) => Math.round(baseInputs.purchasePrice * (1 + s))),
        colVals: steps.map((s) => Math.round(baseInputs.purchasePrice * (1 + s))),
        rowFmt: (v) => fmtSGD(v), colFmt: (v) => fmtSGD(v),
      },
    };
    const c = cfg[choice];
    const cells = c.rowVals.map((rv) =>
      c.colVals.map((cv) => {
        try {
          const m = runInvestmentModel({ ...baseInputs, [c.rowKey]: rv, [c.colKey]: cv });
          return m;
        } catch {
          return null;
        }
      })
    );
    return { ...c, cells };
  }, [baseInputs, choice]);

  function cellValue(m: ModelResult | null): { text: string; cls: string } {
    if (!m) return { text: "—", cls: "" };
    if (metric === "cashflow") {
      return { text: fmtSGD(m.monthlyCashFlow), cls: m.monthlyCashFlow >= 0 ? "bg-accent-50 text-accent-800" : "bg-red-50 text-red-700" };
    }
    if (metric === "irr") {
      const v = m.irrPct;
      return { text: v != null ? fmtPct(v) : "—", cls: v == null ? "" : v >= minIrr ? "bg-accent-50 text-accent-800" : "bg-red-50 text-red-700" };
    }
    if (metric === "dscr") {
      const v = m.dscr;
      return { text: v != null ? fmtNum(v, 2) : "—", cls: v == null ? "" : v < 1 ? "bg-red-50 text-red-700" : "bg-accent-50 text-accent-800" };
    }
    const v = m.netYieldPct;
    return { text: v != null ? fmtPct(v) : "—", cls: v == null ? "" : v >= minYield ? "bg-accent-50 text-accent-800" : "bg-red-50 text-red-700" };
  }

  return (
    <Card title="Sensitivity analysis" subtitle="Green cells meet your thresholds; red cells breach them (negative cash flow, DSCR below 1.0, or below your minimum yield/IRR)">
      <div className="no-print mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Field label="Table">
          <select className="input" value={choice} onChange={(e) => setChoice(e.target.value as SensChoice)}>
            {SENS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Metric">
          <select className="input" value={metric} onChange={(e) => setMetric(e.target.value as typeof metric)}>
            <option value="cashflow">Monthly cash flow</option>
            <option value="irr">IRR</option>
            <option value="dscr">DSCR</option>
            <option value="netYield">Net yield</option>
          </select>
        </Field>
        <Field label="Min net yield (%)"><input type="number" step="0.25" className="input" value={minYield} onChange={(e) => setMinYield(Number(e.target.value))} /></Field>
        <Field label="Min IRR (%)"><input type="number" step="0.25" className="input" value={minIrr} onChange={(e) => setMinIrr(Number(e.target.value))} /></Field>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-0.5">
          <thead>
            <tr>
              <th className="th" />
              {grid.colVals.map((cv, i) => (
                <th key={i} className="th text-center">{grid.colFmt(cv)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.rowVals.map((rv, ri) => (
              <tr key={ri}>
                <td className="td whitespace-nowrap font-medium text-ink-600">{grid.rowFmt(rv)}</td>
                {grid.cells[ri].map((m, ci) => {
                  const { text, cls } = cellValue(m);
                  return (
                    <td key={ci} className={`rounded-md px-3 py-2 text-center text-sm tabular-nums ${cls}`}>
                      {text}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
