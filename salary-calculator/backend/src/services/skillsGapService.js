/**
 * Recommends skills that could lift the candidate's salary potential,
 * based on their target sector and what they already have.
 */
const SECTOR_SKILLS = {
  ai: [
    'Python', 'SQL', 'Machine Learning', 'Deep Learning', 'LLM Application Development',
    'MLOps', 'Cloud Deployment', 'Docker', 'Kubernetes', 'Data Engineering',
  ],
  'data centre': [
    'Data Centre Operations', 'UPS', 'PDU', 'CRAC / CRAH', 'BMS',
    'Fire Suppression Systems', 'Structured Cabling', 'Incident Response',
    'Preventive Maintenance', 'Vendor Management', 'Network Infrastructure',
  ],
  technology: [
    'Cloud Deployment', 'AWS', 'Kubernetes', 'Python', 'SQL', 'CI/CD',
    'Terraform', 'Security', 'Data Engineering', 'Project Management',
  ],
  healthcare: [
    'Patient Care', 'Clinical Leadership', 'Quality Improvement', 'Preceptorship',
    'Critical Care', 'Clinical Documentation', 'Infection Control', 'Roster Management',
  ],
  corporate: [
    'Stakeholder Management', 'CRM', 'Sales Pipeline Management', 'Digital Marketing',
    'Financial Analysis', 'HR Operations', 'Business Partnering', 'Project Management',
  ],
};

const CORPORATE_INDUSTRIES = ['sales', 'marketing', 'finance', 'hr', 'operations'];

function sectorFor(profile) {
  const industry = (profile.industry || '').toLowerCase();
  if (SECTOR_SKILLS[industry]) return industry;
  if (CORPORATE_INDUSTRIES.includes(industry)) return 'corporate';
  return 'corporate';
}

/**
 * Returns skills the candidate does not yet list, ordered by how often
 * they appear in the matched benchmark records (market demand first).
 */
function recommendSkills(profile, matchedBenchmarkSkills = []) {
  const have = new Set((profile.skills || []).map((s) => s.toLowerCase().trim()));
  const sector = sectorFor(profile);

  const demandCount = {};
  matchedBenchmarkSkills.flat().forEach((s) => {
    const key = String(s).trim();
    demandCount[key] = (demandCount[key] || 0) + 1;
  });

  const pool = [...new Set([...Object.keys(demandCount), ...SECTOR_SKILLS[sector]])];
  return pool
    .filter((s) => !have.has(s.toLowerCase()))
    .sort((a, b) => (demandCount[b] || 0) - (demandCount[a] || 0))
    .slice(0, 8)
    .map((skill) => ({
      skill,
      inDemand: (demandCount[skill] || 0) > 0,
      reason:
        (demandCount[skill] || 0) > 0
          ? 'Appears in matching Singapore benchmark roles'
          : 'Commonly requested in this sector',
    }));
}

module.exports = { recommendSkills, sectorFor };
