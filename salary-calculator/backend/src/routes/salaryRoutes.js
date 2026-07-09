const express = require('express');
const router = express.Router();

const { matchProfile } = require('../services/salaryMatchingService');
const { calculate } = require('../services/salaryCalculationService');
const { recommendSkills } = require('../services/skillsGapService');
const { attributeSources } = require('../services/sourceAttributionService');

/**
 * POST /api/salary/calculate
 * Body: candidate profile (see README). Returns percentile estimates,
 * recommended range, confidence, interpretation, skills gap and sources.
 */
router.post('/calculate', (req, res) => {
  const profile = req.body || {};
  if (!profile.targetTitle && !profile.currentTitle) {
    return res.status(400).json({ error: 'Provide at least a current or target job title.' });
  }

  const matches = matchProfile(profile);
  const matchedSkills = matches.map((m) => m.record.skills || []);
  const skillsGap = recommendSkills(profile, matchedSkills);
  const result = calculate(profile, matches, skillsGap.map((s) => s.skill));

  res.json({
    ...result,
    skillsGap,
    dataSources: attributeSources(result.matchedBenchmarks),
    disclaimer:
      'This salary estimate is based on available Singapore market data, uploaded benchmarks, public job information and internal modelling. Actual compensation may vary depending on company size, bonus structure, benefits, candidate profile, interview performance, visa status, market demand and hiring urgency. This tool should be used as a guide, not a guaranteed salary outcome.',
  });
});

module.exports = router;
