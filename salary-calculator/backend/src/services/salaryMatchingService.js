/**
 * Matches a candidate profile against benchmark records and returns
 * weighted matches. Weighting follows the product spec:
 *  - exact/similar target title: very high / medium-high
 *  - specialization: high, industry: medium-high
 *  - years-of-experience band + seniority: high
 *  - skills overlap: medium, qualification: low-medium
 *  - recent source date: higher weight
 *  - Singapore location: mandatory
 */
const { titleSimilarity, skillsOverlap } = require('../utils/titleUtils');
const { getAllBenchmarks } = require('../providers');

const WEIGHTS = {
  titleExact: 40,
  titleSimilarScale: 28, // multiplied by similarity when not exact
  specialization: 15,
  industry: 10,
  experienceBand: 12,
  seniority: 10,
  skillsScale: 8,
  qualification: 4,
  recencyScale: 6,
};

// A record must reach this share of the max score to count as a match.
const MIN_SCORE = 18;

function recencyFactor(sourceDate) {
  if (!sourceDate) return 0.3;
  const ageMonths = (Date.now() - new Date(sourceDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (Number.isNaN(ageMonths)) return 0.3;
  if (ageMonths <= 3) return 1;
  if (ageMonths <= 6) return 0.8;
  if (ageMonths <= 12) return 0.55;
  if (ageMonths <= 24) return 0.3;
  return 0.15;
}

function scoreRecord(profile, record) {
  // Singapore location is mandatory for this product.
  const loc = `${record.country || ''} ${record.location || ''}`.toLowerCase();
  if (!loc.includes('singapore')) return null;

  const targetTitle = profile.targetTitle || profile.currentTitle || '';
  const sim = titleSimilarity(targetTitle, record.title);
  let score = 0;
  const reasons = [];

  if (sim >= 0.95) {
    score += WEIGHTS.titleExact;
    reasons.push('Exact title match');
  } else if (sim > 0.25) {
    score += sim * WEIGHTS.titleSimilarScale;
    reasons.push('Similar title');
  }

  if (
    profile.specialization &&
    record.specialization &&
    record.specialization.toLowerCase() === profile.specialization.toLowerCase()
  ) {
    score += WEIGHTS.specialization;
    reasons.push('Same specialization');
  }

  if (
    profile.industry &&
    record.industry &&
    record.industry.toLowerCase() === profile.industry.toLowerCase()
  ) {
    score += WEIGHTS.industry;
    reasons.push('Same industry');
  }

  const years = Number(profile.yearsExperience);
  if (!Number.isNaN(years) && record.yearsExperienceMin != null && record.yearsExperienceMax != null) {
    if (years >= record.yearsExperienceMin && years <= record.yearsExperienceMax) {
      score += WEIGHTS.experienceBand;
      reasons.push('Experience band match');
    } else if (
      years >= record.yearsExperienceMin - 2 &&
      years <= record.yearsExperienceMax + 2
    ) {
      score += WEIGHTS.experienceBand * 0.4;
    }
  }

  if (
    profile.seniority &&
    record.seniority &&
    record.seniority.toLowerCase() === profile.seniority.toLowerCase()
  ) {
    score += WEIGHTS.seniority;
    reasons.push('Same seniority');
  }

  const overlap = skillsOverlap(profile.skills || [], record.skills || []);
  if (overlap > 0) {
    score += overlap * WEIGHTS.skillsScale;
    if (overlap >= 0.4) reasons.push('Strong skills overlap');
  }

  if (
    profile.qualification &&
    record.qualification &&
    record.qualification.toLowerCase() === profile.qualification.toLowerCase()
  ) {
    score += WEIGHTS.qualification;
  }

  score += recencyFactor(record.sourceDate) * WEIGHTS.recencyScale;

  if (score < MIN_SCORE) return null;
  return { record, weight: score, titleSimilarity: sim, matchReasons: reasons };
}

function matchProfile(profile) {
  const benchmarks = getAllBenchmarks();
  return benchmarks
    .map((record) => scoreRecord(profile, record))
    .filter(Boolean)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8);
}

module.exports = { matchProfile };
