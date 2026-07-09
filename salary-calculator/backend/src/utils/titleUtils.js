const STOP_WORDS = new Set(['of', 'and', 'the', 'a', 'an', '&', '/', '-']);

// Words that mean roughly the same thing when comparing job titles.
const SYNONYMS = {
  ml: 'machine learning',
  ai: 'artificial intelligence',
  dc: 'data centre',
  'data center': 'data centre',
  sr: 'senior',
  jr: 'junior',
  mgr: 'manager',
  exec: 'executive',
  hr: 'human resources',
  bd: 'business development',
};

function normalizeTitle(title) {
  let t = String(title || '').toLowerCase().trim();
  Object.entries(SYNONYMS).forEach(([from, to]) => {
    t = t.replace(new RegExp(`\\b${from}\\b`, 'g'), to);
  });
  return t.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenize(title) {
  return normalizeTitle(title)
    .split(' ')
    .filter((w) => w && !STOP_WORDS.has(w));
}

/**
 * 0..1 similarity between two job titles based on token overlap,
 * with a bonus when the core role noun (last token) matches.
 */
function titleSimilarity(a, b) {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (!ta.length || !tb.length) return 0;
  if (normalizeTitle(a) === normalizeTitle(b)) return 1;
  const setB = new Set(tb);
  const overlap = ta.filter((w) => setB.has(w)).length;
  const jaccard = overlap / new Set([...ta, ...tb]).size;
  const coreMatch = ta[ta.length - 1] === tb[tb.length - 1] ? 0.2 : 0;
  return Math.min(1, jaccard + coreMatch);
}

function skillsOverlap(candidateSkills = [], recordSkills = []) {
  if (!candidateSkills.length || !recordSkills.length) return 0;
  const norm = (s) => String(s).toLowerCase().trim();
  const recordSet = new Set(recordSkills.map(norm));
  const matched = candidateSkills.filter((s) => recordSet.has(norm(s))).length;
  return matched / Math.min(candidateSkills.length, recordSkills.length);
}

module.exports = { normalizeTitle, tokenize, titleSimilarity, skillsOverlap };
