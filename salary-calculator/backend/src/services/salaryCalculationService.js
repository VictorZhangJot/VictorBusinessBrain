/**
 * Turns weighted benchmark matches into a percentile estimate,
 * recommended range, confidence score and plain-English interpretation.
 */

const PCT_KEYS = [
  ['p25', 'p25SalaryMonthly'],
  ['p50', 'p50SalaryMonthly'],
  ['p75', 'p75SalaryMonthly'],
  ['p90', 'p90SalaryMonthly'],
  ['topMarket', 'topMarketSalaryMonthly'],
];

function round50(n) {
  return Math.round(n / 50) * 50;
}

/** Drop records whose median is an extreme outlier vs the weighted median. */
function removeOutliers(matches) {
  if (matches.length < 3) return matches;
  const medians = matches.map((m) => m.record.p50SalaryMonthly).sort((a, b) => a - b);
  const mid = medians[Math.floor(medians.length / 2)];
  const kept = matches.filter(
    (m) => m.record.p50SalaryMonthly >= mid * 0.5 && m.record.p50SalaryMonthly <= mid * 2
  );
  return kept.length >= 2 ? kept : matches;
}

function weightedPercentiles(matches) {
  const totalWeight = matches.reduce((s, m) => s + m.weight, 0);
  const out = {};
  PCT_KEYS.forEach(([key, field]) => {
    const sum = matches.reduce((s, m) => s + m.weight * (m.record[field] || 0), 0);
    out[key] = round50(sum / totalWeight);
  });
  return out;
}

/**
 * Estimate which percentile a salary sits at, interpolating between the
 * known anchors (p25→25, p50→50, p75→75, p90→90, topMarket→~97).
 */
function salaryToPercentile(salary, pcts) {
  if (!salary || salary <= 0) return null;
  const anchors = [
    [pcts.p25, 25],
    [pcts.p50, 50],
    [pcts.p75, 75],
    [pcts.p90, 90],
    [pcts.topMarket, 97],
  ];
  if (salary <= anchors[0][0]) {
    // Below p25: scale down towards the 3rd percentile.
    const ratio = salary / anchors[0][0];
    return Math.max(3, Math.round(3 + ratio * 22));
  }
  for (let i = 0; i < anchors.length - 1; i++) {
    const [loSal, loPct] = anchors[i];
    const [hiSal, hiPct] = anchors[i + 1];
    if (salary <= hiSal) {
      const t = hiSal === loSal ? 0 : (salary - loSal) / (hiSal - loSal);
      return Math.round(loPct + t * (hiPct - loPct));
    }
  }
  return 98;
}

function percentileLabel(p) {
  if (p == null) return null;
  if (p < 35) return 'Entry / Lower Market';
  if (p < 62) return 'Market Median';
  if (p < 85) return 'Competitive';
  return 'Top Market';
}

function confidenceScore(matches, profile) {
  if (!matches.length) return 0;
  const bestSim = Math.max(...matches.map((m) => m.titleSimilarity));
  const countFactor = Math.min(1, matches.length / 5); // 5+ records = full marks
  const industryHit = matches.some(
    (m) =>
      profile.industry &&
      m.record.industry &&
      m.record.industry.toLowerCase() === profile.industry.toLowerCase()
  );
  const now = Date.now();
  const recency =
    matches.reduce((s, m) => {
      const months = (now - new Date(m.record.sourceDate).getTime()) / (1000 * 3600 * 24 * 30);
      return s + (Number.isNaN(months) ? 0.3 : Math.max(0, 1 - months / 18));
    }, 0) / matches.length;

  // Consistency: how tightly the matched medians cluster.
  const medians = matches.map((m) => m.record.p50SalaryMonthly);
  const avg = medians.reduce((a, b) => a + b, 0) / medians.length;
  const spread = Math.sqrt(medians.reduce((s, v) => s + (v - avg) ** 2, 0) / medians.length) / avg;
  const consistency = Math.max(0, 1 - spread * 1.5);

  const sourceConfidence =
    matches.reduce((s, m) => s + (m.record.confidenceScore || 70), 0) / matches.length / 100;

  const score =
    countFactor * 25 +
    bestSim * 25 +
    (industryHit ? 10 : 4) +
    recency * 15 +
    consistency * 15 +
    sourceConfidence * 10;
  return Math.round(Math.min(95, Math.max(15, score)));
}

function buildInterpretation({ profile, pcts, currentPct, expectedPct, confidence, matches, skillSuggestions }) {
  const lines = [];
  const role = profile.targetTitle || profile.currentTitle || 'this role';

  if (currentPct != null) {
    lines.push(
      `Your current salary appears to be around the ${currentPct}th percentile for similar ${role} roles in Singapore (${percentileLabel(currentPct)}).`
    );
    if (currentPct < 40) {
      lines.push(
        `Your current pay sits below the estimated market median of S$${pcts.p50.toLocaleString()} per month, which suggests room to negotiate upwards in your next move.`
      );
    } else if (currentPct >= 75) {
      lines.push(
        'Your current pay is already in the competitive-to-top band, so a move should be weighed against scope, growth and total package rather than base salary alone.'
      );
    }
  } else {
    lines.push(
      `The estimated market median for ${role} in Singapore is S$${pcts.p50.toLocaleString()} per month.`
    );
  }

  if (expectedPct != null) {
    if (expectedPct <= 80) {
      lines.push(`Your expected salary is within the competitive range for this role (around the ${expectedPct}th percentile).`);
    } else {
      lines.push(
        `Your expected salary sits around the ${expectedPct}th percentile — achievable, but usually reserved for candidates with niche skills, leadership scope or high-demand specialization.`
      );
    }
  }

  if (skillSuggestions && skillSuggestions.length) {
    lines.push(
      `To move closer to the 75th percentile, you may need stronger evidence of: ${skillSuggestions.slice(0, 4).join(', ')}.`
    );
  }

  if (confidence < 45) {
    lines.push(
      'Limited matching Singapore salary data is available for this profile. Treat this as a directional estimate.'
    );
  } else if (confidence < 65) {
    lines.push(
      `This estimate has medium confidence (${confidence}/100) because a moderate number of matching Singapore records were found (${matches.length}).`
    );
  } else {
    lines.push(
      `This estimate has good confidence (${confidence}/100), based on ${matches.length} closely matching Singapore benchmark records.`
    );
  }

  return lines;
}

function calculate(profile, matches, skillSuggestions = []) {
  if (!matches.length) {
    return {
      matchedBenchmarks: [],
      p25: null, p50: null, p75: null, p90: null, topMarket: null,
      recommendedMin: null, recommendedMax: null,
      currentSalaryPercentile: null, expectedSalaryPercentile: null,
      confidenceScore: 0,
      interpretation: [
        'No matching Singapore salary data was found for this profile. Try a broader job title or a different specialization, or ask a JOT recruiter for a manual benchmark.',
      ],
    };
  }

  const cleaned = removeOutliers(matches);
  const pcts = weightedPercentiles(cleaned);

  const currentPct = salaryToPercentile(Number(profile.currentMonthlySalary), pcts);
  const expectedPct = salaryToPercentile(Number(profile.expectedMonthlySalary), pcts);
  const confidence = confidenceScore(cleaned, profile);

  // Recommended asking range: median → ~80th percentile, nudged up slightly
  // when the candidate already earns above median.
  let recommendedMin = pcts.p50;
  let recommendedMax = round50(pcts.p75 + (pcts.p90 - pcts.p75) * 0.35);
  if (currentPct != null && currentPct > 55) {
    recommendedMin = round50(Number(profile.currentMonthlySalary) * 1.08);
    recommendedMax = Math.max(recommendedMax, round50(Number(profile.currentMonthlySalary) * 1.2));
  }
  recommendedMin = Math.min(recommendedMin, recommendedMax);

  return {
    matchedBenchmarks: cleaned.map((m) => ({
      title: m.record.title,
      seniority: m.record.seniority,
      industry: m.record.industry,
      weight: Math.round(m.weight),
      matchReasons: m.matchReasons,
      source: m.record.source,
      sourceType: m.record.sourceType,
      sourceDate: m.record.sourceDate,
      confidenceScore: m.record.confidenceScore,
      p50SalaryMonthly: m.record.p50SalaryMonthly,
    })),
    p25: pcts.p25,
    p50: pcts.p50,
    p75: pcts.p75,
    p90: pcts.p90,
    topMarket: pcts.topMarket,
    recommendedMin,
    recommendedMax,
    currentSalaryPercentile: currentPct,
    expectedSalaryPercentile: expectedPct,
    confidenceScore: confidence,
    interpretation: buildInterpretation({
      profile, pcts, currentPct, expectedPct, confidence, matches: cleaned, skillSuggestions,
    }),
  };
}

module.exports = { calculate, salaryToPercentile, percentileLabel };
