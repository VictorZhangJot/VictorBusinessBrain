/**
 * Scores mock job opportunities against the candidate profile.
 * Match score (0-100): title 30, skills 25, industry 10, specialization 10,
 * experience fit 10, salary fit 10, work arrangement 5.
 */
const fs = require('fs');
const path = require('path');
const { titleSimilarity, skillsOverlap } = require('../utils/titleUtils');

const JOBS_FILE = path.join(__dirname, '..', 'data', 'mockJobs.json');

function loadJobs() {
  try {
    return JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function scoreJob(profile, job) {
  let score = 0;
  const reasons = [];

  const sim = titleSimilarity(profile.targetTitle || profile.currentTitle || '', job.jobTitle);
  score += sim * 30;
  if (sim >= 0.95) reasons.push('Job title matches your target role');
  else if (sim >= 0.4) reasons.push('Job title is close to your target role');

  const overlap = skillsOverlap(profile.skills || [], job.skillsRequired || []);
  score += overlap * 25;
  if (overlap >= 0.5) reasons.push('Strong overlap with your skills');
  else if (overlap > 0) reasons.push('Some of your skills are required');

  if (profile.industry && job.industry && profile.industry.toLowerCase() === job.industry.toLowerCase()) {
    score += 10;
    reasons.push('Same industry');
  }
  if (
    profile.specialization &&
    job.specialization &&
    profile.specialization.toLowerCase() === job.specialization.toLowerCase()
  ) {
    score += 10;
    reasons.push('Same specialization');
  }

  const years = Number(profile.yearsExperience);
  if (!Number.isNaN(years) && job.yearsExperienceRequired != null) {
    const diff = years - job.yearsExperienceRequired;
    if (diff >= 0 && diff <= 4) {
      score += 10;
      reasons.push('Experience level fits');
    } else if (diff >= -1) {
      score += 5;
    }
  }

  const expected = Number(profile.salaryExpectation || profile.expectedMonthlySalary);
  if (expected > 0 && job.salaryMin != null && job.salaryMax != null) {
    if (expected >= job.salaryMin && expected <= job.salaryMax) {
      score += 10;
      reasons.push('Salary range fits your expectation');
    } else if (expected <= job.salaryMax * 1.15 && expected >= job.salaryMin * 0.85) {
      score += 5;
    }
  } else {
    score += 5; // no expectation given — neutral
  }

  if (
    profile.workArrangement &&
    job.workArrangement &&
    job.workArrangement.toLowerCase().includes(profile.workArrangement.toLowerCase().split(' ')[0])
  ) {
    score += 5;
    reasons.push('Matches your preferred work arrangement');
  }

  return { ...job, matchScore: Math.min(100, Math.round(score)), matchReasons: reasons };
}

function recommendJobs(profile, limit = 6) {
  return loadJobs()
    .map((job) => scoreJob(profile, job))
    .filter((j) => j.matchScore >= 25)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

module.exports = { recommendJobs };
