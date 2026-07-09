/**
 * Scores mock company hiring data against the candidate profile.
 */
const fs = require('fs');
const path = require('path');
const { titleSimilarity, skillsOverlap } = require('../utils/titleUtils');

const COMPANIES_FILE = path.join(__dirname, '..', 'data', 'mockCompanies.json');

function loadCompanies() {
  try {
    return JSON.parse(fs.readFileSync(COMPANIES_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function scoreCompany(profile, company) {
  let score = 0;
  const reasons = [];
  const target = profile.targetTitle || profile.currentTitle || '';

  const bestRoleSim = Math.max(
    0,
    ...(company.commonRoles || []).map((r) => titleSimilarity(target, r))
  );
  score += bestRoleSim * 45;
  if (bestRoleSim >= 0.95) reasons.push('Regularly hires for your target role');
  else if (bestRoleSim >= 0.4) reasons.push('Hires for roles similar to your target');

  if (profile.industry && company.industry && profile.industry.toLowerCase() === company.industry.toLowerCase()) {
    score += 15;
    reasons.push('Same industry');
  }

  const overlap = skillsOverlap(profile.skills || [], company.keySkills || []);
  score += overlap * 20;
  if (overlap >= 0.4) reasons.push('Your skills match what they typically look for');

  score += ((company.hiringLikelihood || 50) / 100) * 20;
  if ((company.hiringLikelihood || 0) >= 85) reasons.push('Currently hiring actively');

  return {
    ...company,
    recommendationScore: Math.min(100, Math.round(score)),
    matchReasons: reasons,
  };
}

function recommendCompanies(profile, limit = 5) {
  return loadCompanies()
    .map((c) => scoreCompany(profile, c))
    .filter((c) => c.recommendationScore >= 25)
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, limit);
}

module.exports = { recommendCompanies };
