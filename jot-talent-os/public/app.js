/* JOT TalentOS — recruitment CRM + market intelligence + CV rapid review */
'use strict';

/* ============================== State ==================================== */
const state = {
  db: null,
  route: 'dashboard',
  routeArg: null,
  candidateQuery: '',
  compareCandId: '',   // candidate being compared against a JD
  market: { query: '', loading: false, results: null, live: null, error: null, prereqs: {} },
  matchContext: null, // { title, sourceLabel, prereqs, jdText, results: [...] }
  review: null,       // { title, items, index, decisions }
};

/* ============================== Utilities ================================ */
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const money = (n) => (n == null ? '—' : '$' + Number(n).toLocaleString('en-SG'));
const uid = (p) => p + '-' + Math.random().toString(36).slice(2, 8);
const today = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

let toastTimer = null;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

let saveTimer = null;
function saveDb() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      const body = JSON.stringify(state.db, (k, v) => (k.startsWith('__') ? undefined : v), 2);
      await fetch('/api/db', { method: 'POST', body });
    } catch (e) { toast('Could not save — is the server running?'); }
  }, 400);
}

function logActivity(type, text, refType, refId) {
  state.db.activities.unshift({ id: uid('act'), date: today(), type, text, refType, refId });
  saveDb();
}

const clientById = (id) => state.db.clients.find((c) => c.id === id);
const candById = (id) => state.db.candidates.find((c) => c.id === id);
const jobById = (id) => state.db.jobs.find((j) => j.id === id);

/* ===================== Prerequisite extraction engine ==================== */
/* Canonical skills with synonyms, tuned for JOT's niches:
   healthcare, data centre, AI / technology, plus general business roles. */
const TAXONOMY = [
  // Healthcare
  { name: 'SNB Registration', syn: ['snb', 'singapore nursing board', 'registered nurse', ' rn '], cert: true },
  { name: 'BCLS', syn: ['bcls', 'basic cardiac life support'], cert: true },
  { name: 'ACLS', syn: ['acls', 'advanced cardiac life support'], cert: true },
  { name: 'AHPC Registration', syn: ['ahpc', 'allied health professions council'], cert: true },
  { name: 'Medical-Surgical Nursing', syn: ['medical-surgical', 'med-surg', 'medical surgical', 'general ward'] },
  { name: 'Acute Care', syn: ['acute care', 'acute setting'] },
  { name: 'Intensive Care', syn: ['icu', 'intensive care', 'critical care nursing', 'high dependency'] },
  { name: 'Ventilator Management', syn: ['ventilator', 'mechanical ventilation'] },
  { name: 'Patient Assessment', syn: ['patient assessment', 'clinical assessment', 'triage'] },
  { name: 'Wound Care', syn: ['wound care', 'wound management'] },
  { name: 'IV Therapy', syn: ['iv therapy', 'intravenous', 'iv cannulation', 'phlebotomy'] },
  { name: 'Oncology Nursing', syn: ['oncology', 'chemotherapy', 'chemo'] },
  { name: 'Geriatric Care', syn: ['geriatric', 'elderly care', 'eldercare'] },
  { name: 'Epic EMR', syn: ['epic emr', 'epic system', ' epic '] },
  { name: 'EMR / EHR Systems', syn: ['emr', 'ehr', 'electronic medical record'] },
  { name: 'Preceptorship', syn: ['preceptor', 'preceptorship', 'mentoring junior nurses'] },
  { name: 'General Radiography', syn: ['radiography', 'x-ray', 'radiographer'] },
  { name: 'CT', syn: ['computed tomography', 'ct scan', 'ct imaging', ' ct '] },
  { name: 'MRI', syn: ['mri', 'magnetic resonance'] },
  { name: 'PACS', syn: ['pacs'] },
  { name: 'Physiotherapy', syn: ['physiotherapy', 'physiotherapist', 'physical therapy'] },
  { name: 'Musculoskeletal Rehab', syn: ['musculoskeletal', 'msk rehab', 'orthopaedic rehab'] },
  { name: 'Geriatric Rehab', syn: ['geriatric rehab', 'community rehab'] },
  { name: 'Medication Administration', syn: ['medication administration', 'medication management', 'administering medication', 'administer medication'] },
  { name: 'Post-operative Care', syn: ['post-operative', 'post operative', 'post-op', 'pacu', 'recovery nursing'] },
  { name: 'Vital Signs Monitoring', syn: ['vital signs', 'monitoring vital'] },
  { name: 'Infection Control', syn: ['infection control', 'infection prevention'] },
  { name: 'Patient Education', syn: ['patient education', 'educating patients', 'health education'] },

  // Data centre / critical facilities
  { name: 'UPS Systems', syn: ['ups system', 'uninterruptible power', ' ups '] },
  { name: 'Generators', syn: ['generator', 'genset', 'standby power'] },
  { name: 'Chillers', syn: ['chiller', 'chilled water', 'cooling plant'] },
  { name: 'CRAC Units', syn: ['crac', 'crah', 'computer room air'] },
  { name: 'BMS', syn: ['bms', 'building management system', 'building automation'] },
  { name: 'Electrical Systems', syn: ['electrical system', 'electrical infrastructure', 'lv switchboard', 'power distribution'] },
  { name: 'Switchgear', syn: ['switchgear', 'switchboard'] },
  { name: 'Commissioning', syn: ['commissioning', 'level 4 testing', 'level 5 testing', 'l4/l5'] },
  { name: 'Preventive Maintenance', syn: ['preventive maintenance', 'preventative maintenance', 'pm regime', 'planned maintenance'] },
  { name: 'Incident Management', syn: ['incident management', 'incident response', 'emergency operating procedure'] },
  { name: 'Data Centre Operations', syn: ['data centre operation', 'data center operation', 'colocation', 'critical facilities', 'critical environment', 'tier iii', 'tier 3', 'tier iv'] },
  { name: 'Capacity Planning', syn: ['capacity planning', 'capacity management'] },
  { name: 'Vendor Management', syn: ['vendor management', 'contractor management'] },
  { name: 'Rack & Stack', syn: ['rack and stack', 'rack & stack', 'remote hands', 'structured cabling'] },
  { name: 'CDCP', syn: ['cdcp', 'certified data centre professional'], cert: true },
  { name: 'CDCS', syn: ['cdcs'], cert: true },
  { name: 'CDCE', syn: ['cdce'], cert: true },
  { name: 'CDCTP', syn: ['cdctp'], cert: true },
  { name: 'LEW', syn: ['licensed electrical worker', ' lew '], cert: true },

  // AI / technology
  { name: 'Python', syn: ['python'] },
  { name: 'SQL', syn: ['sql'] },
  { name: 'PyTorch', syn: ['pytorch', 'torch'] },
  { name: 'TensorFlow', syn: ['tensorflow'] },
  { name: 'scikit-learn', syn: ['scikit-learn', 'sklearn'] },
  { name: 'NLP', syn: ['nlp', 'natural language processing', 'text mining'] },
  { name: 'LLM Fine-tuning', syn: ['llm', 'large language model', 'fine-tuning', 'fine tuning', 'gpt', 'prompt engineering'] },
  { name: 'Vector Databases', syn: ['vector database', 'vector db', 'pinecone', 'weaviate', 'pgvector', 'embedding'] },
  { name: 'Machine Learning', syn: ['machine learning', 'ml model', 'ml engineering', 'deep learning', ' ml '] },
  { name: 'MLOps', syn: ['mlops', 'model serving', 'model deployment', 'ml pipeline'] },
  { name: 'Docker', syn: ['docker', 'container'] },
  { name: 'Kubernetes', syn: ['kubernetes', 'k8s', 'eks', 'gke', 'aks'] },
  { name: 'Terraform', syn: ['terraform', 'infrastructure as code', 'iac'] },
  { name: 'CI/CD', syn: ['ci/cd', 'cicd', 'continuous integration', 'jenkins', 'gitlab ci', 'github actions'] },
  { name: 'AWS', syn: ['aws', 'amazon web services'] },
  { name: 'Azure', syn: ['azure'] },
  { name: 'GCP', syn: ['gcp', 'google cloud'] },
  { name: 'Spark', syn: ['spark', 'pyspark'] },
  { name: 'Airflow', syn: ['airflow'] },
  { name: 'Kafka', syn: ['kafka'] },
  { name: 'dbt', syn: [' dbt ', 'data build tool'] },
  { name: 'Snowflake', syn: ['snowflake'] },
  { name: 'Data Modelling', syn: ['data modelling', 'data modeling', 'data warehouse', 'dimensional model'] },
  { name: 'Experimentation', syn: ['a/b test', 'ab test', 'experimentation'] },
  { name: 'Tableau', syn: ['tableau', 'power bi', 'looker'] },
  { name: 'Forecasting', syn: ['forecasting', 'time series'] },
  { name: 'Observability', syn: ['observability', 'prometheus', 'grafana', 'datadog', 'monitoring stack'] },
  { name: 'Linux', syn: ['linux', 'unix'] },
  { name: 'Java', syn: ['java '] },
  { name: 'Go', syn: ['golang', ' go '] },
  { name: 'CKA', syn: ['cka', 'certified kubernetes administrator'], cert: true },
  { name: 'AWS Certification', syn: ['aws certified'], cert: true },
  { name: 'PMP', syn: ['pmp', 'project management professional'], cert: true },

  // General
  { name: 'Team Leadership', syn: ['team leadership', 'lead a team', 'supervise', 'people management', 'team lead'] },
  { name: 'Stakeholder Management', syn: ['stakeholder management', 'stakeholder engagement'] },
  { name: 'Project Management', syn: ['project management', 'project delivery'] },
  { name: 'Customer Service', syn: ['customer service', 'client servicing'] },
  { name: 'Shift Work', syn: ['rotating shift', '12-hour shift', 'shift work', 'night shift'] },
];

const EDU_LEVELS = [
  { level: 1, name: 'NITEC', syn: ['nitec', 'ite '] },
  { level: 2, name: 'Diploma', syn: ['diploma'] },
  { level: 3, name: 'Degree', syn: ['degree', 'bachelor', 'beng', 'bsc', 'b.eng', 'b.sc'] },
  { level: 4, name: "Master's", syn: ['master', 'msc', 'm.sc', 'mba'] },
  { level: 5, name: 'PhD', syn: ['phd', 'doctorate'] },
];

/* Compiled, cached regexes for synonym matching (boundary-safe, plural- and
   centre/center-tolerant). Space-guarded synonyms (' ml ') use substring match. */
const _synReCache = new Map();
function synRegex(syn, global) {
  const key = syn + (global ? '|g' : '');
  if (_synReCache.has(key)) return _synReCache.get(key);
  const s = syn.trim().toLowerCase();
  const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/cent(re|er)/g, 'cent(?:re|er)');
  const re = new RegExp('(^|[^a-z0-9])(' + escaped + 's?)(?![a-z0-9])', global ? 'gi' : 'i');
  _synReCache.set(key, re);
  return re;
}

function textHasSyn(haystack, syns) {
  return syns.some((syn) => {
    if (syn.startsWith(' ') || syn.endsWith(' ')) return haystack.includes(syn.toLowerCase());
    return synRegex(syn).test(haystack);
  });
}

function canonicalFor(text) {
  return TAXONOMY.find((t) => textHasSyn(' ' + text.toLowerCase() + ' ', t.syn)) || null;
}

/* Sentence-level required vs preferred classification. */
const PREF_RE = /prefer|advantage|a plus|plus point|nice to have|good to have|bonus|desirable|beneficial|would be ideal|optional/i;
function classifyRequirement(text, syns) {
  const lower = text.toLowerCase();
  for (const syn of syns) {
    const s = syn.trim().toLowerCase();
    const idx = lower.indexOf(s);
    if (idx === -1) continue;
    const start = Math.max(lower.lastIndexOf('.', idx), lower.lastIndexOf('\n', idx), lower.lastIndexOf('•', idx), lower.lastIndexOf(';', idx)) + 1;
    let end = lower.length;
    ['.', '\n', '•', ';'].forEach((d) => {
      const e = lower.indexOf(d, idx);
      if (e !== -1 && e < end) end = e;
    });
    return PREF_RE.test(lower.slice(start, end)) ? false : true; // true = required
  }
  return true;
}

/* Extract structured prerequisites from a job description.
   skills/certs are [{name, required}] — required requirements weigh double. */
function extractPrereqs(text, apiSkills) {
  const raw = String(text || '');
  const hay = ' ' + raw.toLowerCase().replace(/\s+/g, ' ') + ' ';
  const skills = [];
  const certs = [];
  const add = (bucket, name, required) => {
    if (!bucket.some((x) => x.name === name)) bucket.push({ name, required });
  };

  TAXONOMY.forEach((t) => {
    if (textHasSyn(hay, t.syn)) add(t.cert ? certs : skills, t.name, classifyRequirement(hay, t.syn));
  });

  // Fold in skills declared by the job board API; keep unknowns too,
  // but drop the noise tags MCF's auto-tagger is known to produce.
  const JUNK_SKILLS = new Set(['pronunciation', 'photography', 'basic', 'able to work independently', 'communication', 'teamwork', 'good communication skills', 'microsoft office']);
  (apiSkills || []).forEach((s) => {
    if (JUNK_SKILLS.has(s.trim().toLowerCase())) return;
    const canon = canonicalFor(s);
    const name = canon ? canon.name : s;
    add(canon && canon.cert ? certs : skills, name, true);
  });

  // Minimum years of experience
  let minYears = null;
  const yearPatterns = [
    /(?:minimum|min\.?|at least)\s*(?:of\s*)?(\d{1,2})\s*(?:\+|or more)?\s*years?/gi,
    /(\d{1,2})\s*\+\s*years?/gi,
    /(\d{1,2})\s*(?:to|-|–)\s*\d{1,2}\s*years?/gi,
    /(\d{1,2})\s*years?(?:'|’)?\s*(?:of\s*)?(?:relevant|related|working|hands-on|prior)?\s*experience/gi,
  ];
  for (const re of yearPatterns) {
    let m;
    while ((m = re.exec(hay)) !== null) {
      const n = parseInt(m[1], 10);
      if (n > 0 && n <= 30 && (minYears == null || n < minYears)) minYears = n;
    }
    if (minYears != null) break;
  }

  // Education: the lowest level mentioned is treated as the minimum requirement
  let education = null;
  const mentioned = EDU_LEVELS.filter((e) => textHasSyn(hay, e.syn));
  if (mentioned.length) education = mentioned.reduce((a, b) => (a.level < b.level ? a : b));

  // Local work-pass restriction
  const localOnly = /singaporean(s)? only|citizens? (and|or|\/)\s*(spr|pr)|singapore citizen|only singaporean|locals only/i.test(raw);

  return {
    skills,
    certs,
    minYears,
    education: education ? education.name : null,
    educationLevel: education ? education.level : null,
    localOnly,
  };
}

/* ========================== Matching engine ============================== */
function candidateHaystack(c) {
  if (c.__hay) return c.__hay;
  const expText = (c.experience || []).map((e) => [e.role, e.company, ...(e.points || [])].join(' ')).join(' ');
  c.__hay = (' ' + [c.title, c.summary, (c.skills || []).join(' '), (c.certs || []).join(' '), c.education, expText]
    .join(' ') + ' ').toLowerCase().replace(/\s+/g, ' ');
  return c.__hay;
}
function invalidateCandidateCaches(c) { delete c.__hay; delete c.__tokens; }

function candidateEduLevel(c) {
  const hay = ' ' + String(c.education || '').toLowerCase() + ' ';
  let best = 0;
  EDU_LEVELS.forEach((e) => { if (textHasSyn(hay, e.syn) && e.level > best) best = e.level; });
  return best;
}

function candidateHasSkill(c, skillName) {
  const hay = candidateHaystack(c);
  const canon = TAXONOMY.find((t) => t.name === skillName);
  if (canon) return textHasSyn(hay, canon.syn.concat([skillName.toLowerCase()]));
  return textHasSyn(hay, [skillName.toLowerCase()]);
}

/* Where in the CV does this skill appear? Returns {where, snippet} or null. */
function evidenceFor(c, skillName) {
  const canon = TAXONOMY.find((t) => t.name === skillName);
  const syns = (canon ? canon.syn.concat([skillName.toLowerCase()]) : [skillName.toLowerCase()]);
  const hit = (text) => textHasSyn(' ' + String(text).toLowerCase() + ' ', syns);

  for (const cert of (c.certs || [])) if (hit(cert)) return { where: 'Certifications', snippet: cert };
  for (const sk of (c.skills || [])) if (hit(sk)) return { where: 'Skills', snippet: sk };
  for (const e of (c.experience || [])) {
    if (hit(e.role)) return { where: e.company, snippet: e.role };
    for (const p of (e.points || [])) if (hit(p)) return { where: `${e.role} · ${e.company}`, snippet: p };
  }
  if (hit(c.summary || '')) {
    const lower = c.summary.toLowerCase();
    let idx = -1;
    for (const syn of syns) { idx = lower.indexOf(syn.trim().toLowerCase()); if (idx !== -1) break; }
    const start = Math.max(0, idx - 50);
    return { where: 'Summary', snippet: (start > 0 ? '…' : '') + c.summary.slice(start, idx + 60) + '…' };
  }
  if (hit(c.education || '')) return { where: 'Education', snippet: c.education };
  return null;
}

const TITLE_STOPWORDS = new Set(['senior', 'junior', 'lead', 'principal', 'assistant', 'chief', 'head', 'i', 'ii', 'iii', 'a', 'an', 'the', 'of', 'and', 'or']);
function titleTokens(t) {
  return String(t || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter((w) => w.length > 1 && !TITLE_STOPWORDS.has(w));
}
function titleSimilarity(jobTitle, candTitle) {
  const jt = titleTokens(jobTitle);
  if (!jt.length) return null;
  const ct = new Set(titleTokens(candTitle));
  const hits = jt.filter((w) => ct.has(w) || ct.has(w + 's') || ct.has(w.replace(/s$/, ''))).length;
  return hits / jt.length;
}

/* Score every candidate against a set of prerequisites.
   Weights: skills 45, certs 15, years 15, education 10, title 15 — required
   skills count double vs preferred; weights renormalise when absent. */
function matchCandidates(prereqs, opts) {
  opts = opts || {};
  return state.db.candidates.map((c) => {
    const matched = [];
    const missing = [];
    const notes = [];
    let score = 0;
    let weight = 0;
    const breakdown = [];

    const scoreBucket = (items, label, maxW) => {
      if (!items.length) return;
      let got = 0, tot = 0;
      // required-first ordering in chips
      items.slice().sort((a, b) => (b.required ? 1 : 0) - (a.required ? 1 : 0)).forEach((it) => {
        const w = it.required ? 2 : 1;
        tot += w;
        if (candidateHasSkill(c, it.name)) { got += w; matched.push(it.name); }
        else missing.push(it.name + (it.required ? '' : ' (preferred)'));
      });
      score += maxW * (got / tot);
      weight += maxW;
      breakdown.push({ label, pct: Math.round((got / tot) * 100) });
    };
    scoreBucket(prereqs.skills, 'Skills', 45);
    scoreBucket(prereqs.certs, 'Certifications', 15);

    if (prereqs.minYears != null) {
      const ratio = Math.min(1, (c.yearsExp || 0) / prereqs.minYears);
      score += 15 * ratio;
      weight += 15;
      breakdown.push({ label: 'Experience', pct: Math.round(ratio * 100) });
      if ((c.yearsExp || 0) < prereqs.minYears) notes.push(`${c.yearsExp} yrs vs ${prereqs.minYears} required`);
    }
    if (prereqs.educationLevel) {
      const ok = candidateEduLevel(c) >= prereqs.educationLevel;
      score += 10 * (ok ? 1 : 0);
      weight += 10;
      breakdown.push({ label: 'Education', pct: ok ? 100 : 0 });
      if (!ok) notes.push(`Education below ${prereqs.education}`);
    }
    if (opts.title) {
      const sim = titleSimilarity(opts.title, c.title);
      if (sim != null) {
        score += 15 * sim;
        weight += 15;
        breakdown.push({ label: 'Title fit', pct: Math.round(sim * 100) });
      }
    }

    // advisory flags — not scored, but a recruiter needs to see them
    if (opts.salaryMax && c.salaryExpect && c.salaryExpect > opts.salaryMax * 1.05) {
      notes.push(`Expects ${money(c.salaryExpect)} vs budget ${money(opts.salaryMax)}`);
    }
    if (prereqs.localOnly && /employment pass|ep|s pass|work permit/i.test(c.workPass || '')) {
      notes.push(`⚠ Role is Citizens/PR only — candidate is on ${c.workPass}`);
    }

    const pct = weight > 0 ? Math.round((score / weight) * 100) : 0;
    return { cand: c, score: pct, matched, missing, notes, breakdown };
  }).sort((a, b) => b.score - a.score);
}

/* ===================== Candidate search engine ===========================
   Multi-term AND search with taxonomy synonym expansion, typo tolerance
   (edit distance), field-weighted ranking, and per-hit explanations. */
function levenshtein(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

function candidateTokens(c) {
  if (c.__tokens) return c.__tokens;
  c.__tokens = Array.from(new Set((candidateHaystack(c) + ' ' + c.name.toLowerCase()).split(/[^a-z0-9+#/.&-]+/).filter((w) => w.length > 2)));
  return c.__tokens;
}

/* Expand a search token through the taxonomy: "k8s" → kubernetes, eks…  */
function expandToken(tok) {
  const out = new Set([tok]);
  TAXONOMY.forEach((t) => {
    const names = t.syn.map((s) => s.trim().toLowerCase()).concat([t.name.toLowerCase()]);
    if (names.includes(tok)) names.forEach((n) => out.add(n));
  });
  return Array.from(out);
}

const FIELD_WEIGHTS = [
  { key: (c) => c.name, w: 6, label: 'name' },
  { key: (c) => c.title, w: 5, label: 'title' },
  { key: (c) => (c.skills || []).join(' • '), w: 4, label: 'skills' },
  { key: (c) => (c.certs || []).join(' • '), w: 4, label: 'certifications' },
  { key: (c) => c.education, w: 2, label: 'education' },
  { key: (c) => c.summary, w: 2, label: 'summary' },
  { key: (c) => (c.experience || []).map((e) => [e.role, e.company, ...(e.points || [])].join(' ')).join(' '), w: 1.5, label: 'experience' },
  { key: (c) => [c.domain, c.location, c.workPass, c.availability].join(' '), w: 1, label: 'profile' },
];

function searchCandidates(query) {
  const tokens = String(query || '').toLowerCase().split(/[\s,]+/).filter((t) => t.length > 1);
  if (!tokens.length) {
    return state.db.candidates.map((c) => ({ cand: c, score: 0, why: [] }));
  }
  const results = [];
  state.db.candidates.forEach((c) => {
    let total = 0;
    const why = [];
    let allHit = true;
    for (const tok of tokens) {
      const variants = expandToken(tok);
      let best = 0;
      let bestWhy = null;
      for (const f of FIELD_WEIGHTS) {
        const text = ' ' + String(f.key(c) || '').toLowerCase() + ' ';
        for (const v of variants) {
          // short tokens must match whole words ("rn" must not hit "learning")
          const hit = v.length <= 3 ? synRegex(v).test(text) : text.includes(v);
          if (hit) {
            const wScore = f.w * (v === tok ? 1 : 0.9); // synonym hits score slightly lower
            if (wScore > best) {
              best = wScore;
              bestWhy = v === tok ? `“${tok}” in ${f.label}` : `“${tok}” → ${v} (${f.label})`;
            }
          }
        }
      }
      // fuzzy fallback: token vs candidate token set
      if (!best && tok.length >= 5) {
        const maxDist = tok.length >= 8 ? 2 : 1;
        const fuzzy = candidateTokens(c).find((w) => levenshtein(tok, w) <= maxDist);
        if (fuzzy) { best = 1.5; bestWhy = `“${tok}” ≈ ${fuzzy}`; }
      }
      if (!best) { allHit = false; break; }
      total += best;
      if (bestWhy) why.push(bestWhy);
    }
    if (allHit) results.push({ cand: c, score: total, why });
  });
  return results.sort((a, b) => b.score - a.score);
}

/* ==================== JD annotation + 3D hover card ====================== */
/* Find every requirement mention in a JD, with positions, for highlighting. */
function findRequirementRanges(text) {
  const ranges = [];
  const scan = (re, name, kind, extra) => {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
      const lead = m[1] != null ? m[1].length : 0;
      const body = m[2] != null ? m[2] : m[0];
      ranges.push(Object.assign({ start: m.index + lead, end: m.index + lead + body.length, name, kind }, extra || {}));
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  };
  TAXONOMY.forEach((t) => {
    t.syn.forEach((syn) => {
      const s = syn.trim();
      if (s.length < 2) return;
      scan(synRegex(syn, true), t.name, t.cert ? 'cert' : 'skill');
    });
  });
  // years-of-experience phrases (capture the number for comparison)
  [
    /()((?:minimum|min\.?|at least)\s*(?:of\s*)?\d{1,2}\s*(?:\+|or more)?\s*years?(?:['’]?\s*(?:of\s*)?(?:relevant|related|working|hands-on|prior)?\s*experience)?)/gi,
    /()(\d{1,2}\s*\+\s*years?(?:['’]?\s*(?:of\s*)?experience)?)/gi,
    /()(\d{1,2}\s*(?:to|-|–)\s*\d{1,2}\s*years?(?:['’]?\s*(?:of\s*)?experience)?)/gi,
  ].forEach((re) => {
    let m;
    while ((m = re.exec(text)) !== null) {
      const years = parseInt((m[2].match(/\d{1,2}/) || ['0'])[0], 10);
      if (years > 0 && years <= 30) {
        ranges.push({ start: m.index, end: m.index + m[2].length, name: `${years}+ years experience`, kind: 'years', years });
      }
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  });
  // education keywords
  EDU_LEVELS.forEach((e) => {
    e.syn.forEach((syn) => {
      if (syn.trim().length < 3) return;
      let m;
      const re = synRegex(syn, true);
      re.lastIndex = 0;
      while ((m = re.exec(text)) !== null) {
        const lead = m[1] != null ? m[1].length : 0;
        ranges.push({ start: m.index + lead, end: m.index + lead + m[2].length, name: e.name, kind: 'edu', level: e.level });
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    });
  });
  // resolve overlaps: prefer earlier start, then longer match
  ranges.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const out = [];
  let lastEnd = -1;
  for (const r of ranges) {
    if (r.start >= lastEnd) { out.push(r); lastEnd = r.end; }
  }
  return out;
}

function candidateMeetsRange(c, r) {
  if (r.kind === 'years') return (c.yearsExp || 0) >= r.years;
  if (r.kind === 'edu') return candidateEduLevel(c) >= r.level;
  return candidateHasSkill(c, r.name);
}

/* Render JD text with requirement highlights. If cand is given, marks are
   coloured green (candidate has it) / red (missing). */
function annotateJD(text, cand) {
  const ranges = findRequirementRanges(text);
  let out = '';
  let pos = 0;
  ranges.forEach((r) => {
    out += esc(text.slice(pos, r.start));
    let cls = `hl hl-${r.kind}`;
    if (cand) cls += candidateMeetsRange(cand, r) ? ' hl-hit' : ' hl-miss';
    const extra = (r.years ? ` data-years="${r.years}"` : '') + (r.level ? ` data-level="${r.level}"` : '') + (cand ? ` data-cand="${cand.id}"` : '');
    out += `<mark class="${cls}" data-hover="req" data-name="${esc(r.name)}" data-kind="${r.kind}"${extra}>${esc(text.slice(r.start, r.end))}</mark>`;
    pos = r.end;
  });
  out += esc(text.slice(pos));
  return out;
}

const KIND_LABELS = { skill: 'Skill requirement', cert: 'Certification / registration', years: 'Experience requirement', edu: 'Education requirement' };

function hlLegend(compare) {
  if (compare) {
    return `<div class="hl-legend">
      <span><span class="hl-dot" style="background:var(--green-soft); border:1px solid var(--green)"></span> candidate has this</span>
      <span><span class="hl-dot" style="background:var(--red-soft); border:1px solid var(--red)"></span> missing</span>
      <span class="faint">hover any highlight for evidence</span>
    </div>`;
  }
  return `<div class="hl-legend">
    <span><span class="hl-dot" style="background:#EFEAF7"></span> skill</span>
    <span><span class="hl-dot" style="background:var(--accent-soft)"></span> certification</span>
    <span><span class="hl-dot" style="background:var(--blue-soft)"></span> experience</span>
    <span><span class="hl-dot" style="background:var(--amber-soft)"></span> education</span>
    <span class="faint">hover any highlight to see who in your database matches</span>
  </div>`;
}

/* --- singleton hover card ------------------------------------------------ */
let hovercardEl = null;
function ensureHovercard() {
  if (!hovercardEl) {
    hovercardEl = document.createElement('div');
    hovercardEl.className = 'hovercard';
    hovercardEl.id = 'hovercard';
    document.body.appendChild(hovercardEl);
  }
  return hovercardEl;
}

function hovercardContentForRequirement(el) {
  const name = el.dataset.name;
  const kind = el.dataset.kind;
  const years = el.dataset.years ? parseInt(el.dataset.years, 10) : null;
  const level = el.dataset.level ? parseInt(el.dataset.level, 10) : null;
  const range = { name, kind, years, level };
  const head = `<div class="hc-kind">${esc(KIND_LABELS[kind] || 'Requirement')}</div><div class="hc-title">${esc(name)}</div>`;

  if (el.dataset.cand) {
    const c = candById(el.dataset.cand);
    if (!c) return head;
    const ok = candidateMeetsRange(c, range);
    let evHtml = '';
    if (ok) {
      if (kind === 'years') evHtml = `<div class="hc-body">${esc(c.name.split(' ')[0])} has <b>${c.yearsExp} years</b> of experience.</div>`;
      else if (kind === 'edu') evHtml = `<div class="hc-body">${esc(c.education || '')}</div>`;
      else {
        const ev = evidenceFor(c, name);
        if (ev) evHtml = `<div class="hc-body">Found in <b>${esc(ev.where)}</b>:<div class="hc-ev">“${esc(ev.snippet)}”</div></div>`;
      }
    } else {
      if (kind === 'years') evHtml = `<div class="hc-body">Profile shows <b>${c.yearsExp} years</b> — below this requirement.</div>`;
      else if (kind === 'edu') evHtml = `<div class="hc-body">Profile education: ${esc(c.education || 'not recorded')}.</div>`;
      else evHtml = `<div class="hc-body">Not found anywhere in ${esc(c.name.split(' ')[0])}’s profile.</div>`;
    }
    return head + `<span class="hc-status ${ok ? 'hc-hit' : 'hc-miss'}">${ok ? '✓ ' + esc(c.name.split(' ')[0]) + ' has this' : '✗ Missing'}</span>` + evHtml;
  }

  // no compare candidate → who in the database matches?
  const matches = state.db.candidates.filter((c) => candidateMeetsRange(c, range));
  const names = matches.slice(0, 5).map((c) => c.name).join(', ');
  return head + `
    <span class="hc-status ${matches.length ? 'hc-hit' : 'hc-miss'}">${matches.length} of ${state.db.candidates.length} candidates match</span>
    <div class="hc-body hc-names">${matches.length ? `<b>${esc(names)}</b>${matches.length > 5 ? ` +${matches.length - 5} more` : ''}` : 'Nobody in the database has this yet — a sourcing gap.'}</div>`;
}

function hovercardContentForEvidence(el) {
  const c = candById(el.dataset.cand);
  const name = el.dataset.name;
  if (!c) return '';
  const head = `<div class="hc-kind">Match evidence</div><div class="hc-title">${esc(name)}</div>`;
  const ev = evidenceFor(c, name);
  if (ev) return head + `<span class="hc-status hc-hit">✓ Verified in profile</span><div class="hc-body">Found in <b>${esc(ev.where)}</b>:<div class="hc-ev">“${esc(ev.snippet)}”</div></div>`;
  return head + `<span class="hc-status hc-miss">✗ Not in profile</span><div class="hc-body">No mention found in ${esc(c.name.split(' ')[0])}’s CV.</div>`;
}

document.addEventListener('mouseover', (e) => {
  const el = e.target.closest && e.target.closest('[data-hover]');
  if (!el) return;
  const card = ensureHovercard();
  card.innerHTML = el.dataset.hover === 'ev' ? hovercardContentForEvidence(el) : hovercardContentForRequirement(el);
  const rect = el.getBoundingClientRect();
  card.classList.remove('show', 'above');
  card.style.left = Math.max(8, Math.min(window.innerWidth - 316, rect.left + rect.width / 2 - 150)) + 'px';
  // measure after content set
  card.style.top = '-9999px';
  card.style.display = 'block';
  const h = card.offsetHeight;
  if (rect.bottom + h + 16 > window.innerHeight && rect.top - h - 12 > 0) {
    card.style.top = (rect.top - h - 10) + 'px';
    card.classList.add('above');
  } else {
    card.style.top = (rect.bottom + 8) + 'px';
  }
  card.getBoundingClientRect(); // force reflow so the pop transition always plays
  card.classList.add('show');
});
document.addEventListener('mouseout', (e) => {
  if (e.target.closest && e.target.closest('[data-hover]') && hovercardEl) hovercardEl.classList.remove('show');
});
window.addEventListener('scroll', () => { if (hovercardEl) hovercardEl.classList.remove('show'); }, true);

/* ============================== Router =================================== */
const VIEWS = {};
function navigate() {
  const hash = location.hash.replace(/^#\//, '') || 'dashboard';
  const [route, arg] = hash.split('/');
  state.route = VIEWS[route] ? route : 'dashboard';
  state.routeArg = arg || null;
  document.querySelectorAll('#nav a').forEach((a) => {
    a.classList.toggle('active', a.dataset.route === state.route);
  });
  render();
}
window.addEventListener('hashchange', navigate);

function render() {
  if (hovercardEl) hovercardEl.classList.remove('show');
  $('#main').innerHTML = VIEWS[state.route](state.routeArg);
}

/* ============================== Dashboard ================================ */
VIEWS.dashboard = () => {
  const db = state.db;
  const openJobs = db.jobs.filter((j) => j.status === 'Open');
  const inPipeline = openJobs.reduce((n, j) => n + Object.keys(j.pipeline || {}).length, 0);
  const interviews = openJobs.reduce((n, j) => n + Object.values(j.pipeline || {}).filter((s) => s === 'Interview').length, 0);

  return `
  <div class="page-head">
    <div>
      <div class="page-title">Good morning, Victor</div>
      <div class="page-desc">Here is where your desk stands today, ${new Date().toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long' })}.</div>
    </div>
    <a class="btn btn-primary" href="#/market">◎ &nbsp;Scan the market</a>
  </div>

  <div class="grid grid-4">
    <div class="card"><div class="kpi-num kpi-accent">${openJobs.length}</div><div class="kpi-label">Open job orders</div></div>
    <div class="card"><div class="kpi-num">${db.candidates.length}</div><div class="kpi-label">Candidates in database</div></div>
    <div class="card"><div class="kpi-num">${inPipeline}</div><div class="kpi-label">Candidates in pipelines</div></div>
    <div class="card"><div class="kpi-num">${interviews}</div><div class="kpi-label">At interview stage</div></div>
  </div>

  <div class="grid grid-2" style="margin-top:14px; align-items:start;">
    <div class="card">
      <div class="section-title">Open job orders</div>
      ${openJobs.map((j) => {
        const cl = clientById(j.clientId);
        return `<div class="feed-item clickable" style="cursor:pointer" onclick="location.hash='#/jobs/${j.id}'">
          <div style="flex:1">
            <div class="row-title">${esc(j.title)}</div>
            <div class="row-sub">${esc(cl ? cl.name : '')} · ${money(j.salaryMin)}–${money(j.salaryMax)} · ${Object.keys(j.pipeline || {}).length} in pipeline</div>
          </div>
          <span class="badge badge-${(j.priority || 'normal').toLowerCase()}">${esc(j.priority)}</span>
        </div>`;
      }).join('') || '<div class="empty">No open roles.</div>'}
    </div>
    <div class="card">
      <div class="section-title">Recent activity</div>
      ${db.activities.slice(0, 8).map((a) => `
        <div class="feed-item">
          <div class="feed-date">${esc(a.date)}</div>
          <div><span class="chip">${esc(a.type)}</span> ${esc(a.text)}</div>
        </div>`).join('') || '<div class="empty">Nothing logged yet.</div>'}
    </div>
  </div>`;
};

/* ============================== Clients ================================== */
VIEWS.clients = (arg) => {
  if (arg) return clientDetail(arg);
  return `
  <div class="page-head">
    <div>
      <div class="page-title">Clients</div>
      <div class="page-desc">Employers you work with — hospitals, data centre operators, AI companies.</div>
    </div>
    <button class="btn btn-primary" onclick="showAddClient()">+ Add client</button>
  </div>
  <div id="add-client-slot"></div>
  <div class="card" style="padding:0">
    <table class="table">
      <thead><tr><th>Company</th><th>Industry</th><th>Tier</th><th>Status</th><th>Contacts</th></tr></thead>
      <tbody>
      ${state.db.clients.map((c) => `
        <tr class="clickable" onclick="location.hash='#/clients/${c.id}'">
          <td><div class="row-title">${esc(c.name)}</div><div class="row-sub">${esc(c.location)}</div></td>
          <td>${esc(c.industry)}</td>
          <td><span class="chip chip-accent">Tier ${esc(c.tier)}</span></td>
          <td><span class="badge ${c.status === 'Active' ? 'badge-open' : 'badge-stage'}">${esc(c.status)}</span></td>
          <td class="small muted">${(c.contacts || []).map((p) => esc(p.name)).join(', ') || '—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
};

function clientDetail(id) {
  const c = clientById(id);
  if (!c) return '<div class="empty">Client not found.</div>';
  const jobs = state.db.jobs.filter((j) => j.clientId === id);
  const acts = state.db.activities.filter((a) => a.refType === 'client' && a.refId === id);
  return `
  <a class="back-link" href="#/clients">← All clients</a>
  <div class="page-head">
    <div>
      <div class="page-title">${esc(c.name)}</div>
      <div class="page-desc">${esc(c.industry)} · ${esc(c.location)} · Tier ${esc(c.tier)} · ${esc(c.status)}</div>
    </div>
  </div>
  <div class="grid grid-2" style="align-items:start">
    <div class="stack">
      <div class="card">
        <div class="section-title">Notes</div>
        <div class="cv-summary">${esc(c.notes || '—')}</div>
      </div>
      <div class="card">
        <div class="section-title">Contacts</div>
        ${(c.contacts || []).map((p) => `
          <div class="feed-item">
            <div style="flex:1"><div class="row-title">${esc(p.name)}</div><div class="row-sub">${esc(p.role)}</div></div>
            <div class="small muted" style="text-align:right">${esc(p.email)}<br>${esc(p.phone)}</div>
          </div>`).join('') || '<div class="muted small">No contacts yet.</div>'}
      </div>
      <div class="card">
        <div class="section-title">Log a note</div>
        <div class="search-row" style="margin:0">
          <input class="input" id="client-note" placeholder="e.g. Called Serene — two more ward nurse roles opening in August">
          <button class="btn" onclick="addClientNote('${c.id}')">Log</button>
        </div>
        <div style="margin-top:12px">
        ${acts.map((a) => `<div class="feed-item"><div class="feed-date">${esc(a.date)}</div><div>${esc(a.text)}</div></div>`).join('')}
        </div>
      </div>
    </div>
    <div class="card">
      <div class="section-title">Job orders (${jobs.length})</div>
      ${jobs.map((j) => `
        <div class="feed-item" style="cursor:pointer" onclick="location.hash='#/jobs/${j.id}'">
          <div style="flex:1">
            <div class="row-title">${esc(j.title)}</div>
            <div class="row-sub">${money(j.salaryMin)}–${money(j.salaryMax)} · opened ${esc(j.openedDate)}</div>
          </div>
          <span class="badge ${j.status === 'Open' ? 'badge-open' : 'badge-stage'}">${esc(j.status)}</span>
        </div>`).join('') || '<div class="muted small">No job orders yet.</div>'}
    </div>
  </div>`;
}

window.showAddClient = () => {
  $('#add-client-slot').innerHTML = `
  <div class="card" style="margin-bottom:14px">
    <div class="section-title">New client</div>
    <div class="grid grid-2">
      <input class="input" id="nc-name" placeholder="Company name">
      <input class="input" id="nc-industry" placeholder="Industry (e.g. Healthcare)">
      <input class="input" id="nc-location" placeholder="Location">
      <input class="input" id="nc-contact" placeholder="Main contact (name, role)">
    </div>
    <div style="margin-top:10px"><input class="input" id="nc-notes" placeholder="Notes"></div>
    <div style="margin-top:12px; display:flex; gap:8px">
      <button class="btn btn-primary" onclick="saveNewClient()">Save client</button>
      <button class="btn" onclick="render()">Cancel</button>
    </div>
  </div>`;
};

window.saveNewClient = () => {
  const name = $('#nc-name').value.trim();
  if (!name) return toast('Company name is required');
  const contactRaw = $('#nc-contact').value.trim();
  const client = {
    id: uid('cl'), name,
    industry: $('#nc-industry').value.trim() || 'General',
    location: $('#nc-location').value.trim(),
    tier: 'B', status: 'Prospect',
    notes: $('#nc-notes').value.trim(),
    contacts: contactRaw ? [{ name: contactRaw.split(',')[0].trim(), role: (contactRaw.split(',')[1] || '').trim(), email: '', phone: '' }] : [],
  };
  state.db.clients.push(client);
  logActivity('New client', `Added ${name} as a client.`, 'client', client.id);
  toast('Client added');
  render();
};

window.addClientNote = (id) => {
  const v = $('#client-note').value.trim();
  if (!v) return;
  logActivity('Client note', v, 'client', id);
  render();
};

/* ============================== Job orders =============================== */
const STAGES = ['Sourcing', 'Screening', 'Submitted', 'Interview', 'Offer', 'Placed', 'Rejected'];

VIEWS.jobs = (arg) => {
  if (arg) return jobDetail(arg);
  return `
  <div class="page-head">
    <div>
      <div class="page-title">Job Orders</div>
      <div class="page-desc">Roles you are actively working. Open one to run matching or manage its pipeline.</div>
    </div>
    <button class="btn btn-primary" onclick="showAddJob()">+ Add job order</button>
  </div>
  <div id="add-job-slot"></div>
  <div class="card" style="padding:0">
    <table class="table">
      <thead><tr><th>Role</th><th>Client</th><th>Salary</th><th>Pipeline</th><th>Priority</th><th>Status</th></tr></thead>
      <tbody>
      ${state.db.jobs.map((j) => {
        const cl = clientById(j.clientId);
        const stages = Object.values(j.pipeline || {});
        return `<tr class="clickable" onclick="location.hash='#/jobs/${j.id}'">
          <td><div class="row-title">${esc(j.title)}</div><div class="row-sub">${esc(j.location)} · opened ${esc(j.openedDate)}</div></td>
          <td>${esc(cl ? cl.name : '—')}</td>
          <td>${money(j.salaryMin)}–${money(j.salaryMax)}</td>
          <td class="small muted">${stages.length ? stages.length + ' candidates' : '—'}</td>
          <td><span class="badge badge-${(j.priority || 'normal').toLowerCase()}">${esc(j.priority)}</span></td>
          <td><span class="badge ${j.status === 'Open' ? 'badge-open' : 'badge-stage'}">${esc(j.status)}</span></td>
        </tr>`;
      }).join('')}
      </tbody>
    </table>
  </div>`;
};

function jobDetail(id) {
  const j = jobById(id);
  if (!j) return '<div class="empty">Job not found.</div>';
  const cl = clientById(j.clientId);
  const prereqs = extractPrereqs(j.description);
  const pipeline = Object.entries(j.pipeline || {});
  const compareCand = state.compareCandId ? candById(state.compareCandId) : null;

  // ranked dropdown so the best-fit candidates appear first
  const ranked = matchCandidates(prereqs, { title: j.title, salaryMax: j.salaryMax });
  let compareSummary = '';
  if (compareCand) {
    const ranges = findRequirementRanges(j.description);
    const met = ranges.filter((r) => candidateMeetsRange(compareCand, r)).length;
    compareSummary = `<span class="chip ${met / Math.max(1, ranges.length) >= 0.6 ? 'chip-hit' : 'chip-miss'}" style="font-size:12px">
      ${esc(compareCand.name.split(' ')[0])} meets ${met} of ${ranges.length} highlighted requirements</span>`;
  }

  return `
  <a class="back-link" href="#/jobs">← All job orders</a>
  <div class="page-head">
    <div>
      <div class="page-title">${esc(j.title)}</div>
      <div class="page-desc">${esc(cl ? cl.name : '')} · ${esc(j.location)} · ${money(j.salaryMin)}–${money(j.salaryMax)} · ${esc(j.employmentType)} · Fee: ${esc(j.fee || '—')}</div>
    </div>
    <div style="display:flex; gap:8px">
      <button class="btn btn-primary" onclick="matchForJob('${j.id}')">◉ Find matching candidates</button>
    </div>
  </div>
  <div class="grid grid-2" style="align-items:start">
    <div class="stack">
      <div class="card">
        <div class="section-title">Job description — requirements highlighted</div>
        ${hlLegend(!!compareCand)}
        <div class="cv-summary" style="white-space:pre-wrap">${annotateJD(j.description, compareCand)}</div>
        <div class="compare-bar">
          <span class="small muted">Compare against:</span>
          <select class="input" style="width:260px; padding:6px 9px; font-size:12.5px" onchange="setCompare(this.value)">
            <option value="">— nobody (show requirement types) —</option>
            ${ranked.map((r) => `<option value="${r.cand.id}" ${state.compareCandId === r.cand.id ? 'selected' : ''}>${esc(r.cand.name)} — ${r.score}%</option>`).join('')}
          </select>
          ${compareSummary}
        </div>
        <div class="prereq-box">
          <div class="prereq-label">Prerequisites detected by TalentOS</div>
          ${renderPrereqs(prereqs)}
        </div>
      </div>
    </div>
    <div class="card">
      <div class="section-title">Pipeline (${pipeline.length})</div>
      ${pipeline.map(([cid, stage]) => {
        const c = candById(cid);
        if (!c) return '';
        return `<div class="feed-item">
          <div style="flex:1; cursor:pointer" onclick="location.hash='#/candidates/${c.id}'">
            <div class="row-title">${esc(c.name)}</div>
            <div class="row-sub">${esc(c.title)} · expects ${money(c.salaryExpect)}</div>
          </div>
          <select class="input" style="width:130px; padding:5px 8px; font-size:12px" onchange="setStage('${j.id}','${cid}',this.value)">
            ${STAGES.map((s) => `<option ${s === stage ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>`;
      }).join('') || '<div class="muted small">No candidates in pipeline yet. Run matching to build one.</div>'}
    </div>
  </div>`;
}

window.setCompare = (candId) => {
  state.compareCandId = candId;
  render();
};

function renderPrereqs(p) {
  const bits = [];
  if (p.minYears != null) bits.push(`<span class="chip chip-blue">≥ ${p.minYears} years experience</span>`);
  if (p.education) bits.push(`<span class="chip chip-blue">Min. ${esc(p.education)}</span>`);
  if (p.localOnly) bits.push(`<span class="chip chip-miss">Citizens / PR only</span>`);
  const item = (x, accent) => `<span class="chip ${accent ? 'chip-accent' : ''} ${x.required ? 'chip-req' : 'chip-pref'}" title="${x.required ? 'Required' : 'Preferred'}">${accent ? '✓ ' : ''}${esc(x.name)}${x.required ? '' : ' <span class="faint">(pref.)</span>'}</span>`;
  p.certs.slice().sort((a, b) => (b.required ? 1 : 0) - (a.required ? 1 : 0)).forEach((c) => bits.push(item(c, true)));
  p.skills.slice().sort((a, b) => (b.required ? 1 : 0) - (a.required ? 1 : 0)).forEach((s) => bits.push(item(s, false)));
  return bits.join('') || '<span class="muted small">Nothing detected — add more detail to the description.</span>';
}

window.showAddJob = () => {
  $('#add-job-slot').innerHTML = `
  <div class="card" style="margin-bottom:14px">
    <div class="section-title">New job order</div>
    <div class="grid grid-2">
      <input class="input" id="nj-title" placeholder="Job title">
      <select class="input" id="nj-client">${state.db.clients.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
      <input class="input" id="nj-salmin" placeholder="Salary min (SGD)" type="number">
      <input class="input" id="nj-salmax" placeholder="Salary max (SGD)" type="number">
      <input class="input" id="nj-location" placeholder="Location">
      <select class="input" id="nj-priority"><option>Normal</option><option>High</option><option>Urgent</option></select>
    </div>
    <div style="margin-top:10px"><textarea class="input" id="nj-desc" rows="5" placeholder="Paste the job description — TalentOS will extract the prerequisites automatically."></textarea></div>
    <div style="margin-top:12px; display:flex; gap:8px">
      <button class="btn btn-primary" onclick="saveNewJob()">Save job order</button>
      <button class="btn" onclick="render()">Cancel</button>
    </div>
  </div>`;
};

window.saveNewJob = () => {
  const title = $('#nj-title').value.trim();
  if (!title) return toast('Job title is required');
  const job = {
    id: uid('job'), title,
    clientId: $('#nj-client').value,
    status: 'Open', priority: $('#nj-priority').value,
    openedDate: today(),
    salaryMin: parseInt($('#nj-salmin').value, 10) || null,
    salaryMax: parseInt($('#nj-salmax').value, 10) || null,
    location: $('#nj-location').value.trim(),
    employmentType: 'Permanent', fee: '',
    description: $('#nj-desc').value.trim(),
    pipeline: {},
  };
  state.db.jobs.push(job);
  logActivity('New job order', `Opened "${title}".`, 'job', job.id);
  toast('Job order created');
  location.hash = '#/jobs/' + job.id;
};

window.setStage = (jobId, candId, stage) => {
  const j = jobById(jobId);
  j.pipeline[candId] = stage;
  const c = candById(candId);
  logActivity('Stage change', `${c ? c.name : candId} moved to ${stage} for "${j.title}".`, 'job', jobId);
  toast('Stage updated');
};

window.matchForJob = (jobId) => {
  const j = jobById(jobId);
  const prereqs = extractPrereqs(j.description);
  state.matchContext = {
    title: j.title,
    sourceLabel: 'Job order · ' + ((clientById(j.clientId) || {}).name || ''),
    jobId,
    jdText: j.description,
    prereqs,
    results: matchCandidates(prereqs, { title: j.title, salaryMax: j.salaryMax }),
  };
  location.hash = '#/matches';
};

/* ============================== Candidates =============================== */
VIEWS.candidates = (arg) => {
  if (arg) return candidateDetail(arg);
  const hits = searchCandidates(state.candidateQuery);
  const hasQuery = state.candidateQuery.trim().length > 1;
  return `
  <div class="page-head">
    <div>
      <div class="page-title">Candidates</div>
      <div class="page-desc">Search understands synonyms (“k8s” finds Kubernetes, “RN” finds nurses), tolerates typos, and ranks by relevance. Then review the stack with the arrow keys.</div>
    </div>
    <div style="display:flex; gap:8px">
      <button class="btn" onclick="reviewCandidateList()">⇅ Review these CVs</button>
      <button class="btn btn-primary" onclick="showAddCandidate()">+ Add candidate</button>
    </div>
  </div>
  <div id="add-cand-slot"></div>
  <div class="search-row">
    <input class="input" id="cand-search" placeholder="Try “icu nurse”, “k8s aws”, “chiller comissioning” (typos are fine)…" value="${esc(state.candidateQuery)}" oninput="onCandSearch(this.value)">
    <span class="muted small" style="align-self:center">${hits.length} of ${state.db.candidates.length}${hasQuery ? ' · ranked by relevance' : ''}</span>
  </div>
  <div class="card" style="padding:0">
    <table class="table">
      <thead><tr><th>Candidate</th><th>Domain</th><th>Experience</th><th>Key skills</th><th>Expects</th><th>Availability</th></tr></thead>
      <tbody>
      ${hits.map(({ cand: c, why }) => `
        <tr class="clickable" onclick="location.hash='#/candidates/${c.id}'">
          <td>
            <div class="row-title">${esc(c.name)}</div>
            <div class="row-sub">${esc(c.title)} · ${esc(c.workPass)}</div>
            ${why.length ? `<div class="why-line">matched: ${esc(why.join(' · '))}</div>` : ''}
          </td>
          <td>${esc(c.domain)}</td>
          <td>${c.yearsExp} yrs</td>
          <td>${(c.skills || []).slice(0, 3).map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</td>
          <td>${money(c.salaryExpect)}</td>
          <td class="small muted">${esc(c.availability)}</td>
        </tr>`).join('') || '<tr><td colspan="6"><div class="empty">No candidates match that search — even with fuzzy matching.</div></td></tr>'}
      </tbody>
    </table>
  </div>`;
};

window.onCandSearch = (v) => {
  state.candidateQuery = v;
  const pos = $('#cand-search').selectionStart;
  render();
  const el = $('#cand-search');
  el.focus();
  el.setSelectionRange(pos, pos);
};

window.reviewCandidateList = () => {
  const hits = searchCandidates(state.candidateQuery);
  if (!hits.length) return toast('No candidates to review');
  startReview({
    title: state.candidateQuery.trim() ? `Search: “${state.candidateQuery}”` : 'All candidates',
    items: hits.map((h) => ({ candId: h.cand.id })),
  });
};

function candidateDetail(id) {
  const c = candById(id);
  if (!c) return '<div class="empty">Candidate not found.</div>';
  return `
  <a class="back-link" href="#/candidates">← All candidates</a>
  <div class="page-head">
    <div>
      <div class="page-title">${esc(c.name)}</div>
      <div class="page-desc">${esc(c.title)} · ${esc(c.domain)} · ${esc(c.source)}</div>
    </div>
    <button class="btn btn-primary" onclick='startReview({title:"Single CV", items:[{candId:"${c.id}"}]})'>⇅ Open in CV Review</button>
  </div>
  <div class="cv-sheet">${cvBody(c)}</div>`;
}

window.showAddCandidate = () => {
  $('#add-cand-slot').innerHTML = `
  <div class="card" style="margin-bottom:14px">
    <div class="section-title">New candidate</div>
    <div class="grid grid-2">
      <input class="input" id="ncd-name" placeholder="Full name">
      <input class="input" id="ncd-title" placeholder="Current title (e.g. Staff Nurse)">
      <input class="input" id="ncd-years" placeholder="Years of experience" type="number">
      <input class="input" id="ncd-edu" placeholder="Education (e.g. Diploma in Nursing, NYP)">
      <input class="input" id="ncd-pass" placeholder="Work pass (Citizen / PR / EP)">
      <input class="input" id="ncd-salary" placeholder="Expected salary (SGD)" type="number">
    </div>
    <div style="margin-top:10px"><input class="input" id="ncd-skills" placeholder="Skills, comma-separated (e.g. ICU, Ventilator Management, BCLS)"></div>
    <div style="margin-top:10px"><textarea class="input" id="ncd-summary" rows="3" placeholder="Profile summary"></textarea></div>
    <div style="margin-top:12px; display:flex; gap:8px">
      <button class="btn btn-primary" onclick="saveNewCandidate()">Save candidate</button>
      <button class="btn" onclick="render()">Cancel</button>
    </div>
  </div>`;
};

window.saveNewCandidate = () => {
  const name = $('#ncd-name').value.trim();
  if (!name) return toast('Name is required');
  const allSkills = $('#ncd-skills').value.split(',').map((s) => s.trim()).filter(Boolean);
  const certNames = TAXONOMY.filter((t) => t.cert).map((t) => t.name.toLowerCase());
  const cand = {
    id: uid('cand'), name,
    title: $('#ncd-title').value.trim() || 'Candidate',
    domain: 'General',
    yearsExp: parseInt($('#ncd-years').value, 10) || 0,
    education: $('#ncd-edu').value.trim(),
    skills: allSkills.filter((s) => !certNames.includes(s.toLowerCase())),
    certs: allSkills.filter((s) => certNames.includes(s.toLowerCase())),
    workPass: $('#ncd-pass').value.trim() || 'Unknown',
    salaryExpect: parseInt($('#ncd-salary').value, 10) || null,
    availability: 'To confirm', location: '', email: '', phone: '',
    status: 'Active', source: 'Manual entry',
    summary: $('#ncd-summary').value.trim(),
    experience: [],
  };
  state.db.candidates.push(cand);
  logActivity('New candidate', `Added ${name} (${cand.title}).`, 'candidate', cand.id);
  toast('Candidate added');
  render();
};

/* ============================ Market Intel =============================== */
/* Agency vs direct-employer classification. Postings by recruitment agencies
   are competitor intel; postings by direct employers are BD prospects. */
const KNOWN_AGENCIES = [
  'allied search', 'kerry consulting', 'robert walters', 'michael page', 'page personnel',
  'hays', 'randstad', 'adecco', 'persolkelly', 'kelly services', 'manpower staffing',
  'recruit express', 'recruitfirst', 'scientec', 'talentvis', 'achieve career', 'gmp',
  'people profilers', 'jac recruitment', 'reeracoen', 'pasona', 'rgf', 'en world',
  'charterhouse', 'morgan mckinley', 'ambition', 'argyll scott', 'ethos beathchapman',
  'trust recruit', 'search personnel', 'good job creations', 'bgc group', 'mci career',
  'eps consultants', 'dynamic human capital', 'cornerstone global', 'elitez', 'jobstudio',
  'search index', 'careernexus', 'talentsis', 'stafflink', 'jobally', 'the supreme hr',
  'supreme hr advisory', 'hkm hr', 'linkedcorp', 'anradus', 'aegis',
  'persol', 'searchasia', 'peoplebank', 'jobline', 'cultivar', 'star career',
  'flintex', 'octomate', 'nala employment', 'maestro hr', 'adept manpower', 'peoplesearch'
];
const AGENCY_NAME_RE = /recruit|staffing|manpower|headhunt|outsourc|employment agenc|personnel|hr advisory|hr solutions|human capital|human resource|executive search|talent (acquisition|solutions|search|hub|network)|search (pte|associates|partners|consultants)/i;
const EA_LICENCE_RE = /ea licen[cs]e|ea reg(istration)?\s*(no|number)?|licen[cs]e\s*(no|number)?\s*:?\s*\d{2}c\d{4}|(^|[^a-z0-9])r\d{7}([^0-9]|$)|employment agenc/i;

function classifyEmployer(job) {
  const name = String(job.postedBy || job.company || '').toLowerCase();
  if (KNOWN_AGENCIES.some((a) => name.includes(a))) return { type: 'agency', reason: 'known agency' };
  if (AGENCY_NAME_RE.test(name)) return { type: 'agency', reason: 'agency-pattern name' };
  if (job.hiringFor && job.postedBy && job.hiringFor.toLowerCase() !== job.postedBy.toLowerCase()) {
    return { type: 'agency', reason: `posting on behalf of ${job.hiringFor}` };
  }
  if (EA_LICENCE_RE.test(job.description || '')) return { type: 'agency', reason: 'EA licence in posting' };
  return { type: 'direct', reason: '' };
}

VIEWS.market = () => {
  const m = state.market;
  return `
  <div class="page-head">
    <div>
      <div class="page-title">Market Intelligence</div>
      <div class="page-desc">Live job listings from MyCareersFuture Singapore — real postings, fetched the moment you search. TalentOS separates direct employers (BD prospects) from recruitment agencies (your competitors), highlights requirements, and matches your database.</div>
    </div>
  </div>
  <div class="search-row">
    <input class="input" id="market-q" placeholder="Search live roles — try “staff nurse”, “data centre engineer”, “machine learning”…"
      value="${esc(m.query)}" onkeydown="if(event.key==='Enter')runMarketSearch()">
    <button class="btn btn-primary" onclick="runMarketSearch()" ${m.loading ? 'disabled' : ''}>
      ${m.loading ? '<span class="spinner"></span> Searching…' : '◎ Search live market'}
    </button>
  </div>
  <div id="market-results">${marketResults()}</div>`;
};

window.setMarketFilter = (f) => {
  state.market.filter = f;
  render();
};

function marketResults() {
  const m = state.market;
  if (m.loading) return '<div class="empty"><div class="empty-icon">◎</div>Scanning the Singapore job market…</div>';
  if (m.results == null) return `<div class="empty"><div class="empty-icon">◎</div>Search the live market to see current openings.<br><span class="small">Every result can be mined for prerequisites and matched to your database in one click.</span></div>`;
  if (m.error && !m.results.length) return `<div class="empty"><div class="empty-icon">⚠</div>Could not reach MyCareersFuture (${esc(m.error)}).<br><span class="small">Check your internet connection and try again.</span></div>`;
  if (!m.results.length) return '<div class="empty">No live roles found for that search.</div>';

  const classified = m.results.map((job) => ({ job, cls: classifyEmployer(job) }));
  const nDirect = classified.filter((x) => x.cls.type === 'direct').length;
  const nAgency = classified.length - nDirect;
  const filter = m.filter || 'all';
  const visible = classified.filter((x) => filter === 'all' || x.cls.type === filter);

  return `
  <div class="filter-chips">
    <button class="filter-chip ${filter === 'all' ? 'active' : ''}" onclick="setMarketFilter('all')">All (${classified.length})</button>
    <button class="filter-chip ${filter === 'direct' ? 'active' : ''}" onclick="setMarketFilter('direct')">Direct employers (${nDirect})</button>
    <button class="filter-chip ${filter === 'agency' ? 'active' : ''}" onclick="setMarketFilter('agency')">Agencies — competitors (${nAgency})</button>
  </div>
  <div class="small muted" style="margin-bottom:10px">${visible.length} live listings ${m.live ? 'from MyCareersFuture' : ''}${m.total ? ` (of ${m.total} in the market)` : ''}</div>
  <div class="stack">
  ${visible.map(({ job, cls }) => {
    const p = m.prereqs[job.id];
    const isAgency = cls.type === 'agency';
    return `
    <div class="card job-card">
      <div style="display:flex; justify-content:space-between; gap:14px; align-items:flex-start">
        <div style="min-width:0">
          <div class="row-title" style="font-size:15px">${esc(job.title)}</div>
          <div class="row-sub">${esc(job.company)}
            <span class="badge ${isAgency ? 'badge-agency' : 'badge-direct'}" style="margin-left:6px">${isAgency ? '⚔ Agency — competitor' : '★ Direct employer'}</span>
            ${cls.reason ? `<span class="faint small" style="margin-left:4px">(${esc(cls.reason)})</span>` : ''}
          </div>
        </div>
        <div style="display:flex; gap:8px; flex-shrink:0">
          ${p ? '' : `<button class="btn btn-sm" onclick="extractForJob('${job.id}')">Extract &amp; highlight</button>`}
          <button class="btn btn-sm btn-primary" onclick="matchForMarketJob('${job.id}')">◉ Match candidates</button>
          <button class="btn btn-sm" onclick="importMarketJob('${job.id}')">Import as job order</button>
          ${isAgency ? '' : `<button class="btn btn-sm" onclick="addProspectFromMarket('${job.id}')" title="This employer is hiring directly — add them to Clients as a BD prospect">+ BD prospect</button>`}
        </div>
      </div>
      <div class="job-meta">
        <span>${money(job.salaryMin)}–${money(job.salaryMax)} ${esc(job.salaryType || '')}</span>
        ${job.employmentTypes.length ? `<span>${esc(job.employmentTypes.join(', '))}</span>` : ''}
        ${job.positionLevels.length ? `<span>${esc(job.positionLevels.join(', '))}</span>` : ''}
        ${job.minYearsExperience != null ? `<span>${job.minYearsExperience}+ yrs</span>` : ''}
        ${job.applications != null ? `<span>${job.applications} applicants</span>` : ''}
        ${job.postedDate ? `<span>Posted ${esc(job.postedDate)}</span>` : ''}
        ${job.url ? `<a href="${esc(job.url)}" target="_blank" style="color:var(--accent-dark)">View posting ↗</a>` : ''}
      </div>
      ${p
        ? `${hlLegend(false)}<div class="small" style="line-height:1.6; white-space:pre-wrap; color:var(--text-soft)">${annotateJD(job.description.slice(0, 2600))}${job.description.length > 2600 ? '…' : ''}</div>
           <div class="prereq-box"><div class="prereq-label">Prerequisites detected</div>${renderPrereqs(p)}</div>`
        : `<div class="small muted" style="line-height:1.55; max-height:60px; overflow:hidden">${esc(job.description.slice(0, 320))}${job.description.length > 320 ? '…' : ''}</div>`}
    </div>`;
  }).join('')}
  </div>`;
}

window.runMarketSearch = async () => {
  const q = $('#market-q').value.trim();
  if (!q) return toast('Type a role to search for');
  state.market.query = q;
  state.market.loading = true;
  render();
  try {
    const resp = await fetch('/api/market?q=' + encodeURIComponent(q) + '&limit=20');
    const data = await resp.json();
    state.market.results = data.jobs || [];
    state.market.live = data.live;
    state.market.total = data.total;
    state.market.error = data.error || null;
    state.market.prereqs = {};
  } catch (e) {
    state.market.results = [];
    state.market.error = String(e.message || e);
  }
  state.market.loading = false;
  render();
  const el = $('#market-q');
  if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
};

function marketJobById(id) { return (state.market.results || []).find((j) => j.id === id); }

async function ensureJobDetail(job) {
  if (job.detailLoaded || job.description.length > 100) return;
  try {
    const resp = await fetch('/api/market/detail?id=' + encodeURIComponent(job.id));
    const d = await resp.json();
    if (d.ok) {
      job.description = [d.description, d.otherRequirements].filter(Boolean).join('\n\nOther requirements:\n');
      if (d.minYearsExperience != null) job.minYearsExperience = d.minYearsExperience;
      if (d.skills && d.skills.length) job.skills = d.skills;
    }
  } catch (e) { /* fall back to whatever the search result had */ }
  job.detailLoaded = true;
}

window.extractForJob = async (id) => {
  const job = marketJobById(id);
  if (!job) return;
  await ensureJobDetail(job);
  state.market.prereqs[id] = extractPrereqs(
    job.title + '. ' + job.description + (job.minYearsExperience != null ? ` Minimum ${job.minYearsExperience} years experience.` : ''),
    job.skills
  );
  render();
};

window.matchForMarketJob = async (id) => {
  const job = marketJobById(id);
  if (!job) return;
  if (!state.market.prereqs[id]) await window.extractForJob(id);
  const prereqs = state.market.prereqs[id];
  state.matchContext = {
    title: job.title,
    sourceLabel: 'Live market · ' + job.company,
    marketJobId: id,
    jdText: job.description,
    prereqs,
    results: matchCandidates(prereqs, { title: job.title, salaryMax: job.salaryMax }),
  };
  location.hash = '#/matches';
};

window.importMarketJob = async (id) => {
  const job = marketJobById(id);
  if (!job) return;
  await ensureJobDetail(job);
  const client = state.db.clients[0];
  const newJob = {
    id: uid('job'),
    title: job.title,
    clientId: client ? client.id : null,
    status: 'Open', priority: 'Normal', openedDate: today(),
    salaryMin: job.salaryMin, salaryMax: job.salaryMax,
    location: 'Singapore',
    employmentType: job.employmentTypes[0] || 'Permanent',
    fee: '',
    description: job.description + (job.skills.length ? '\n\nSkills listed by employer: ' + job.skills.join(', ') : ''),
    pipeline: {},
    marketSource: { source: job.source, company: job.company, url: job.url },
  };
  state.db.jobs.push(newJob);
  logActivity('Imported from market', `Imported "${job.title}" (${job.company}) from MyCareersFuture.`, 'job', newJob.id);
  toast('Imported — assign the right client on the job page');
  location.hash = '#/jobs/' + newJob.id;
};

window.addProspectFromMarket = (jobId) => {
  const job = marketJobById(jobId);
  if (!job) return;
  const coName = job.hiringFor || job.company;
  if (state.db.clients.some((c) => normCo(c.name) === normCo(coName))) return toast('Already in your client list');
  const client = {
    id: uid('cl'), name: coName,
    industry: (job.categories && job.categories[0]) || 'General',
    location: 'Singapore', tier: 'C', status: 'Prospect',
    notes: `BD prospect spotted via Market Intel ${today()} — hiring directly for "${job.title}" (${money(job.salaryMin)}–${money(job.salaryMax)}).${job.url ? ' Posting: ' + job.url : ''}`,
    contacts: [],
  };
  state.db.clients.push(client);
  logActivity('BD prospect', `${coName} added as prospect — hiring directly for "${job.title}".`, 'client', client.id);
  toast(coName + ' added to Clients as a prospect');
};

/* ============================ Talent Map ================================= */
/* Company-level market intelligence: who from your database works where,
   who used to work there (alumni = warm intros), and who you are hunting. */
const TARGET_STATUSES = ['Identified', 'Approached', 'In conversation', 'CV obtained', 'Do not contact'];

function normCo(name) {
  return String(name || '').toLowerCase()
    .replace(/\b(pte\.?|ltd\.?|llp|llc|inc\.?|corp\.?|limited|private|holdings|group)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

function buildCompanyMap() {
  const map = new Map();
  const entry = (name) => {
    const key = normCo(name);
    if (!key) return null;
    if (!map.has(key)) map.set(key, { key, name, current: [], alumni: [], targets: [], client: null });
    return map.get(key);
  };
  state.db.candidates.forEach((c) => {
    (c.experience || []).forEach((e, i) => {
      const en = entry(e.company);
      if (!en) return;
      const isCurrent = /present|current/i.test(e.to || '');
      const rec = { cand: c, role: e.role, from: e.from, to: e.to };
      if (isCurrent) en.current.push(rec); else en.alumni.push(rec);
    });
  });
  (state.db.targets || []).forEach((t) => {
    const en = entry(t.company);
    if (en) en.targets.push(t);
  });
  state.db.clients.forEach((cl) => {
    const en = map.get(normCo(cl.name));
    if (en) en.client = cl;
  });
  return map;
}

function xrayLinks(company, role) {
  const g = `https://www.google.com/search?q=${encodeURIComponent(`site:linkedin.com/in "${company}" "${role}" Singapore`)}`;
  const li = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(company + ' ' + role)}`;
  const co = `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(company)}`;
  return { g, li, co };
}

VIEWS.talentmap = (arg) => {
  if (!state.db.targets) state.db.targets = [];
  if (arg) return companyDetail(decodeURIComponent(arg));
  const map = buildCompanyMap();
  const companies = Array.from(map.values())
    .sort((a, b) => (b.current.length + b.targets.length) - (a.current.length + a.targets.length) || (b.alumni.length - a.alumni.length));
  const nTargets = (state.db.targets || []).length;
  const active = (state.db.targets || []).filter((t) => t.status !== 'Do not contact' && t.status !== 'CV obtained').length;

  return `
  <div class="page-head">
    <div>
      <div class="page-title">Talent Map</div>
      <div class="page-desc">Market intelligence by company: who from your database sits inside each organisation, who used to (warm intros), and who you are hunting. Open a company to run live web searches for the people you still need to find.</div>
    </div>
    <button class="btn btn-primary" onclick="showAddTarget('')">+ Add hunt target</button>
  </div>
  <div id="add-target-slot"></div>
  <div class="grid grid-4" style="margin-bottom:16px">
    <div class="card"><div class="kpi-num kpi-accent">${companies.length}</div><div class="kpi-label">Companies mapped</div></div>
    <div class="card"><div class="kpi-num">${companies.reduce((n, co) => n + co.current.length, 0)}</div><div class="kpi-label">Candidates placed in map</div></div>
    <div class="card"><div class="kpi-num">${nTargets}</div><div class="kpi-label">Hunt targets tracked</div></div>
    <div class="card"><div class="kpi-num">${active}</div><div class="kpi-label">Active pursuits</div></div>
  </div>
  <div class="grid grid-3">
    ${companies.map((co) => `
      <div class="card tm-company-card" onclick="location.hash='#/talentmap/${encodeURIComponent(co.key)}'">
        <div class="tm-co-name">${esc(co.name)}</div>
        <div class="small muted" style="margin-top:2px">
          ${co.client ? `<span class="badge ${co.client.status === 'Active' ? 'badge-open' : 'badge-stage'}">Client · ${esc(co.client.status)}</span>` : '<span class="faint">Not a client</span>'}
        </div>
        <div class="tm-counts">
          <div class="tm-count"><div class="tm-count-num">${co.current.length}</div><div class="tm-count-label">Inside now</div></div>
          <div class="tm-count"><div class="tm-count-num">${co.alumni.length}</div><div class="tm-count-label">Alumni</div></div>
          <div class="tm-count"><div class="tm-count-num accent">${co.targets.length}</div><div class="tm-count-label">Hunting</div></div>
        </div>
      </div>`).join('')}
  </div>`;
};

/* Infer a seniority band from a job title so people stack into org layers. */
const ORG_LEVELS = [
  { level: 1, label: 'Leadership', re: /chief|director|vice president|\bvp\b|head of|c-suite|ceo|coo|cto|cio|general manager|managing/i },
  { level: 2, label: 'Management & leads', re: /manager|\blead\b|principal|clinician|superintendent|supervisor|charge nurse|commissioning lead/i },
  { level: 3, label: 'Senior professionals', re: /senior|\bsr\.?\b|specialist|staff\s+(\w+\s+)?engineer/i }, // "Staff Engineer" is senior in tech; "Staff Nurse" is not
  { level: 4, label: 'Team / individual contributors', re: /./ },
];
function seniorityLevel(title) {
  const t = String(title || '');
  for (const l of ORG_LEVELS) if (l.re.test(t)) return l.level;
  return 4;
}

/* Organisational chart for a company — built from the intel you actually
   hold: candidates inside now + hunt targets. Empty layers are hunting gaps. */
function orgChart(co) {
  const nodes = [];
  co.current.forEach((r) => nodes.push({ kind: 'current', name: r.cand.name, title: r.role, level: seniorityLevel(r.role), candId: r.cand.id }));
  co.targets.filter((t) => t.status !== 'Do not contact').forEach((t) =>
    nodes.push({ kind: 'target', name: t.name, title: t.title || 'Unknown role', level: seniorityLevel(t.title), status: t.status }));

  const initials = (name) => esc(String(name).replace(/\[.*?\]\s*/, '').split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase());

  const levelHtml = ORG_LEVELS.map((l) => {
    const here = nodes.filter((n) => n.level === l.level);
    const cards = here.map((n) => n.kind === 'current'
      ? `<div class="org-node on-current" onclick="location.hash='#/candidates/${n.candId}'" title="In your candidate database — open profile">
          <div class="avatar ok">${initials(n.name)}</div>
          <div><div class="org-name">${esc(n.name)}</div><div class="org-role">${esc(n.title)}</div><div class="org-tag t-current">✓ In your database</div></div>
        </div>`
      : `<div class="org-node on-target" title="Hunt target — ${esc(n.status)}">
          <div class="avatar hunt">◎</div>
          <div><div class="org-name">${esc(n.name)}</div><div class="org-role">${esc(n.title)}</div><div class="org-tag t-target">◎ Hunting · ${esc(n.status)}</div></div>
        </div>`).join('');
    const empty = here.length ? '' : `
      <div class="org-node on-empty" onclick="showAddTarget('${esc(co.name)}')" title="No intel at this level yet — add a hunt target">
        <div><div class="org-name">No coverage</div><div class="org-role">hunt here — click to add a target</div></div>
      </div>`;
    return `<div class="org-level"><div class="org-label">${l.label}</div><div class="org-nodes">${cards}${empty}</div></div>`;
  }).join('');

  return `
  <div class="card" style="margin-bottom:14px">
    <div class="section-title">Organisational view — ${esc(co.name)}</div>
    <div class="small muted" style="margin-bottom:6px">Built from your intel: layers are inferred from job titles. Dashed boxes are blind spots in the org — the levels you have nobody in and nobody targeted.</div>
    <div class="org-chart">${levelHtml}</div>
    <div class="org-legend">
      <span><span class="hl-dot" style="background:var(--green-soft); border:1.5px solid var(--green)"></span> your candidate inside</span>
      <span><span class="hl-dot" style="background:var(--accent-soft); border:1.5px solid var(--accent)"></span> hunt target</span>
      <span><span class="hl-dot" style="background:var(--bg); border:1.5px dashed var(--border-strong)"></span> no coverage yet</span>
    </div>
  </div>`;
}

function companyDetail(key) {
  const map = buildCompanyMap();
  const co = map.get(key);
  if (!co) return '<div class="empty">Company not found in the map.</div>';
  const hiring = (state.tmHiring && state.tmHiring.key === key) ? state.tmHiring : null;

  const person = (rec, kind) => `
    <div class="person-row">
      <div class="avatar">${esc(rec.cand.name.split(' ').map((w) => w[0]).slice(0, 2).join(''))}</div>
      <div style="flex:1; min-width:0; cursor:pointer" onclick="location.hash='#/candidates/${rec.cand.id}'">
        <div class="row-title" style="font-size:13px">${esc(rec.cand.name)}</div>
        <div class="row-sub">${esc(rec.role)} · ${esc(rec.from)}–${esc(rec.to)}${kind === 'alumni' ? ' · knows the inside' : ''}</div>
      </div>
      <span class="chip">${esc(rec.cand.workPass)}</span>
    </div>`;

  return `
  <a class="back-link" href="#/talentmap">← Talent Map</a>
  <div class="page-head">
    <div>
      <div class="page-title">${esc(co.name)}</div>
      <div class="page-desc">
        ${co.client ? `Client (${esc(co.client.status)})` : 'Not yet a client'} ·
        ${co.current.length} of your candidates inside · ${co.alumni.length} alumni · ${co.targets.length} hunt targets
      </div>
    </div>
    <div style="display:flex; gap:8px">
      <button class="btn" onclick="checkLiveHiring('${esc(co.key)}','${esc(co.name)}')">◎ Check live hiring</button>
      <button class="btn btn-primary" onclick="showAddTarget('${esc(co.name)}')">+ Add hunt target here</button>
    </div>
  </div>
  <div id="add-target-slot"></div>
  ${orgChart(co)}
  <div class="grid grid-2" style="align-items:start">
    <div class="stack">
      <div class="card">
        <div class="section-title">Your candidates inside now (${co.current.length})</div>
        ${co.current.map((r) => person(r, 'current')).join('') || '<div class="muted small">Nobody from your database currently works here.</div>'}
      </div>
      <div class="card">
        <div class="section-title">Alumni — warm intro paths (${co.alumni.length})</div>
        ${co.alumni.map((r) => person(r, 'alumni')).join('') || '<div class="muted small">No alumni on record.</div>'}
      </div>
      <div class="card">
        <div class="section-title">Find people here on the web</div>
        <div class="small muted">Real searches — they open LinkedIn / Google x-ray results for this company in a new tab.</div>
        <div class="search-row" style="margin:10px 0 0">
          <input class="input" id="xray-role" placeholder="Role to hunt, e.g. Staff Nurse, Facilities Engineer…" style="max-width:320px">
          <button class="btn" onclick="openXray('${esc(co.name)}')">Search</button>
        </div>
        <div class="xray-links" id="xray-out"></div>
      </div>
    </div>
    <div class="stack">
      <div class="card">
        <div class="section-title">Hunt targets at ${esc(co.name)} (${co.targets.length})</div>
        ${co.targets.map((t) => `
          <div class="person-row">
            <div class="avatar hunt">◎</div>
            <div style="flex:1; min-width:0">
              <div class="row-title" style="font-size:13px">${esc(t.name)}</div>
              <div class="row-sub">${esc(t.title)} · via ${esc(t.source || 'unknown')} · added ${esc(t.addedDate)}</div>
              ${t.notes ? `<div class="why-line">${esc(t.notes)}</div>` : ''}
              ${t.linkedin ? `<div class="why-line"><a href="${esc(t.linkedin)}" target="_blank" style="color:var(--accent-dark)">LinkedIn profile ↗</a></div>` : ''}
            </div>
            <select class="input" style="width:150px; padding:5px 8px; font-size:12px" onchange="setTargetStatus('${t.id}', this.value)">
              ${TARGET_STATUSES.map((s) => `<option ${s === t.status ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <button class="btn btn-sm" onclick="delTarget('${t.id}')" title="Remove target">✕</button>
          </div>`).join('') || '<div class="muted small">No targets yet — use the web search on the left to find people, then add them here.</div>'}
      </div>
      <div class="card">
        <div class="section-title">Live hiring signal</div>
        ${hiring
          ? (hiring.loading
            ? '<div class="muted small"><span class="spinner"></span> Checking MyCareersFuture…</div>'
            : (hiring.jobs.length
              ? `<div class="small muted" style="margin-bottom:8px">${hiring.jobs.length} live posting${hiring.jobs.length > 1 ? 's' : ''} by ${esc(co.name)} right now — they are hiring, which means budgets exist and staff may be stretched.</div>`
                + hiring.jobs.map((j) => `
                  <div class="feed-item">
                    <div style="flex:1">
                      <div class="row-title" style="font-size:13px">${esc(j.title)}</div>
                      <div class="row-sub">${money(j.salaryMin)}–${money(j.salaryMax)} · posted ${esc(j.postedDate || '')}</div>
                    </div>
                    ${j.url ? `<a class="btn btn-sm" href="${esc(j.url)}" target="_blank">View ↗</a>` : ''}
                  </div>`).join('')
              : `<div class="muted small">No live MyCareersFuture postings found under “${esc(co.name)}” right now.</div>`))
          : '<div class="muted small">Press “Check live hiring” to query MyCareersFuture for this company’s open roles.</div>'}
      </div>
    </div>
  </div>`;
}

window.openXray = (company) => {
  const role = ($('#xray-role').value || '').trim() || 'manager';
  const links = xrayLinks(company, role);
  $('#xray-out').innerHTML = `
    <a class="btn btn-sm" href="${esc(links.g)}" target="_blank">Google x-ray: ${esc(role)} at ${esc(company)} ↗</a>
    <a class="btn btn-sm" href="${esc(links.li)}" target="_blank">LinkedIn people search ↗</a>
    <a class="btn btn-sm" href="${esc(links.co)}" target="_blank">LinkedIn company lookup ↗</a>`;
};

window.checkLiveHiring = async (key, name) => {
  state.tmHiring = { key, loading: true, jobs: [] };
  render();
  try {
    const resp = await fetch('/api/market?q=' + encodeURIComponent(name) + '&limit=40');
    const data = await resp.json();
    const coMatch = (a, b) => !!a && !!b && (a === b || a.includes(b) || b.includes(a));
    const jobs = (data.jobs || []).filter((j) =>
      coMatch(normCo(j.postedBy || j.company), key) || coMatch(normCo(j.hiringFor || ''), key));
    state.tmHiring = { key, loading: false, jobs };
  } catch (e) {
    state.tmHiring = { key, loading: false, jobs: [] };
  }
  render();
};

window.showAddTarget = (company) => {
  $('#add-target-slot').innerHTML = `
  <div class="card" style="margin-bottom:14px">
    <div class="section-title">New hunt target</div>
    <div class="small muted" style="margin-bottom:10px">Someone you found on the web (LinkedIn, a conference list, a news article) who you want to headhunt. TalentOS tracks the pursuit; the sourcing stays human.</div>
    <div class="grid grid-2">
      <input class="input" id="nt-name" placeholder="Full name">
      <input class="input" id="nt-title" placeholder="Their current title">
      <input class="input" id="nt-company" placeholder="Company" value="${esc(company)}">
      <input class="input" id="nt-linkedin" placeholder="LinkedIn URL (optional)">
      <input class="input" id="nt-source" placeholder="Where you found them (e.g. LinkedIn x-ray)">
      <select class="input" id="nt-status">${TARGET_STATUSES.map((s) => `<option>${s}</option>`).join('')}</select>
    </div>
    <div style="margin-top:10px"><input class="input" id="nt-notes" placeholder="Notes — why this person, what you know"></div>
    <div style="margin-top:12px; display:flex; gap:8px">
      <button class="btn btn-primary" onclick="saveNewTarget()">Save target</button>
      <button class="btn" onclick="render()">Cancel</button>
    </div>
  </div>`;
  const el = $('#nt-name');
  if (el) el.focus();
};

window.saveNewTarget = () => {
  const name = $('#nt-name').value.trim();
  const company = $('#nt-company').value.trim();
  if (!name || !company) return toast('Name and company are required');
  if (!state.db.targets) state.db.targets = [];
  const t = {
    id: uid('tgt'), name,
    title: $('#nt-title').value.trim(),
    company,
    linkedin: $('#nt-linkedin').value.trim(),
    source: $('#nt-source').value.trim(),
    status: $('#nt-status').value,
    notes: $('#nt-notes').value.trim(),
    addedDate: today(),
  };
  state.db.targets.push(t);
  logActivity('Hunt target', `Now hunting ${name} (${t.title || '?'}) at ${company}.`, 'target', t.id);
  toast('Target added to the map');
  location.hash = '#/talentmap/' + encodeURIComponent(normCo(company));
  render();
};

window.setTargetStatus = (id, status) => {
  const t = (state.db.targets || []).find((x) => x.id === id);
  if (!t) return;
  t.status = status;
  logActivity('Target update', `${t.name} (${t.company}) → ${status}.`, 'target', id);
  toast('Status updated');
};

window.delTarget = (id) => {
  const t = (state.db.targets || []).find((x) => x.id === id);
  if (!t) return;
  state.db.targets = state.db.targets.filter((x) => x.id !== id);
  logActivity('Target removed', `${t.name} (${t.company}) removed from the hunt list.`, 'target', id);
  saveDb();
  render();
};

/* ============================ Match results ============================== */
VIEWS.matches = () => {
  const mc = state.matchContext;
  if (!mc) return '<div class="empty"><div class="empty-icon">◉</div>No match run yet. Start from a job order or a market listing.</div>';
  const strong = mc.results.filter((r) => r.score >= 60).length;
  return `
  <a class="back-link" href="javascript:history.back()">← Back</a>
  <div class="page-head">
    <div>
      <div class="page-title">Matches — ${esc(mc.title)}</div>
      <div class="page-desc">${esc(mc.sourceLabel)} · ${strong} strong matches out of ${mc.results.length} candidates scored. Hover any green chip for the evidence in the CV.</div>
    </div>
    <button class="btn btn-primary" onclick="reviewMatches()">⇅ Review CVs with arrow keys</button>
  </div>
  <div class="card" style="margin-bottom:14px">
    <div class="prereq-label">Matching against these prerequisites — bold = required, dashed = preferred</div>
    ${renderPrereqs(mc.prereqs)}
  </div>
  <div class="stack">
  ${mc.results.map((r) => `
    <div class="card match-card">
      <div class="score-ring ${r.score >= 60 ? 'score-hi' : r.score >= 35 ? 'score-mid' : 'score-lo'}">${r.score}%</div>
      <div class="match-body">
        <div style="display:flex; justify-content:space-between; gap:12px">
          <div>
            <div class="row-title" style="cursor:pointer" onclick="location.hash='#/candidates/${r.cand.id}'">${esc(r.cand.name)}</div>
            <div class="row-sub">${esc(r.cand.title)} · ${r.cand.yearsExp} yrs · ${esc(r.cand.workPass)} · expects ${money(r.cand.salaryExpect)} · ${esc(r.cand.availability)}</div>
          </div>
          ${mc.jobId ? `<button class="btn btn-sm" onclick="addToPipeline('${mc.jobId}','${r.cand.id}')">+ Pipeline</button>` : ''}
        </div>
        <div style="margin-top:8px">
          ${r.matched.map((s) => `<span class="chip chip-hit" data-hover="ev" data-cand="${r.cand.id}" data-name="${esc(s)}">✓ ${esc(s)}</span>`).join('')}
          ${r.missing.map((s) => `<span class="chip chip-miss">✗ ${esc(s)}</span>`).join('')}
        </div>
        <div class="bd-rows">
          ${r.breakdown.map((b) => `
            <div class="bd-row">
              <div class="bd-label">${esc(b.label)}</div>
              <div class="bd-track"><div class="bd-fill ${b.pct >= 70 ? 'bd-hi' : b.pct < 35 ? 'bd-lo' : ''}" style="width:${b.pct}%"></div></div>
              <div class="bd-val">${b.pct}%</div>
            </div>`).join('')}
        </div>
        ${r.notes.length ? `<div class="small muted" style="margin-top:6px">${esc(r.notes.join(' · '))}</div>` : ''}
      </div>
    </div>`).join('')}
  </div>`;
};

window.addToPipeline = (jobId, candId) => {
  const j = jobById(jobId);
  if (!j.pipeline[candId]) {
    j.pipeline[candId] = 'Sourcing';
    const c = candById(candId);
    logActivity('Pipeline add', `${c.name} added to pipeline for "${j.title}".`, 'job', jobId);
    toast('Added to pipeline at Sourcing');
  } else {
    toast('Already in this pipeline');
  }
};

window.reviewMatches = () => {
  const mc = state.matchContext;
  if (!mc) return;
  startReview({
    title: 'Matches — ' + mc.title,
    items: mc.results.map((r) => ({ candId: r.cand.id, score: r.score, matched: r.matched, missing: r.missing })),
    jobId: mc.jobId || null,
  });
};

/* ============================ CV Review mode ============================= */
function startReview(ctx) {
  state.review = {
    title: ctx.title,
    items: ctx.items,
    jobId: ctx.jobId || null,
    index: 0,
    decisions: {},
  };
  location.hash = '#/review';
  if (state.route === 'review') render();
}

VIEWS.review = () => {
  const r = state.review;
  if (!r || !r.items.length) {
    return `
    <div class="page-head"><div>
      <div class="page-title">CV Review</div>
      <div class="page-desc">A keyboard-first way to work through a stack of CVs. Open a candidate list, a search, or a match run, then move with <kbd>↓</kbd> and <kbd>↑ </kbd> — no clicking, no opening files.</div>
    </div></div>
    <div class="card">
      <div class="section-title">Start a review</div>
      <div style="display:flex; gap:8px; flex-wrap:wrap">
        <button class="btn btn-primary" onclick="reviewAll()">⇅ Review all ${state.db.candidates.length} candidates</button>
        <a class="btn" href="#/candidates">Filter candidates first</a>
        <a class="btn" href="#/market">Match from the live market</a>
      </div>
    </div>`;
  }

  const item = r.items[r.index];
  const c = candById(item.candId);
  const decision = r.decisions[item.candId];
  const shortlisted = Object.values(r.decisions).filter((d) => d === 'shortlist').length;

  return `
  <div class="review-layout">
    <div class="review-rail" id="review-rail">
      <div class="review-rail-head">
        <div class="row-title">${esc(r.title)}</div>
        <div class="review-count">${r.index + 1} of ${r.items.length} · ${shortlisted} shortlisted</div>
      </div>
      ${r.items.map((it, i) => {
        const cc = candById(it.candId);
        const d = r.decisions[it.candId];
        return `<div class="rail-item ${i === r.index ? 'current' : ''}" data-idx="${i}" onclick="gotoReview(${i})">
          ${it.score != null ? `<div class="score-ring ${it.score >= 60 ? 'score-hi' : it.score >= 35 ? 'score-mid' : 'score-lo'}">${it.score}%</div>` : ''}
          <div style="min-width:0">
            <div class="rail-name">${esc(cc.name)}</div>
            <div class="rail-sub">${esc(cc.title)} · ${cc.yearsExp} yrs</div>
          </div>
          <div class="rail-flag">${d === 'shortlist' ? '<span style="color:var(--green)">●</span>' : d === 'reject' ? '<span style="color:var(--red)">●</span>' : ''}</div>
        </div>`;
      }).join('')}
    </div>
    <div class="review-main" id="review-main">
      <div class="review-topbar">
        <div class="review-keys">
          <span><kbd>↓</kbd>/<kbd>↑</kbd> next / previous</span>
          <span><kbd>S</kbd> shortlist</span>
          <span><kbd>X</kbd> reject</span>
          <span><kbd>Esc</kbd> exit</span>
        </div>
        <div style="display:flex; gap:8px">
          <button class="btn btn-sm" onclick="saveShortlist()">Save shortlist (${shortlisted})</button>
          <button class="btn btn-sm" onclick="exitReview()">Exit review</button>
        </div>
      </div>
      ${item.matched ? `
      <div class="review-match-strip">
        <div class="prereq-label">Fit against “${esc(r.title.replace('Matches — ', ''))}”${item.score != null ? ` — ${item.score}% match` : ''} · hover ✓ chips for evidence</div>
        ${item.matched.map((s) => `<span class="chip chip-hit" data-hover="ev" data-cand="${c.id}" data-name="${esc(s)}">✓ ${esc(s)}</span>`).join('')}
        ${item.missing.map((s) => `<span class="chip chip-miss">✗ ${esc(s)}</span>`).join('')}
      </div>` : ''}
      <div class="cv-sheet">${cvBody(c)}</div>
      <div class="decision-bar">
        ${decision === 'shortlist' ? '<span class="decision-tag decision-shortlist">✓ Shortlisted</span>' : ''}
        ${decision === 'reject' ? '<span class="decision-tag decision-reject">✗ Rejected</span>' : ''}
        <button class="btn ${decision === 'shortlist' ? '' : 'btn-primary'}" onclick="decide('shortlist')">${decision === 'shortlist' ? 'Undo shortlist' : 'Shortlist (S)'}</button>
        <button class="btn" onclick="decide('reject')">${decision === 'reject' ? 'Undo reject' : 'Reject (X)'}</button>
        ${r.jobId ? `<button class="btn" onclick="addToPipeline('${r.jobId}','${c.id}')">+ Add to job pipeline</button>` : ''}
      </div>
    </div>
  </div>`;
};

window.reviewAll = () => {
  startReview({ title: 'All candidates', items: state.db.candidates.map((c) => ({ candId: c.id })) });
};

window.gotoReview = (i) => {
  state.review.index = i;
  render();
  scrollRailToCurrent();
};

window.exitReview = () => { location.hash = '#/candidates'; };

window.decide = (kind) => {
  const r = state.review;
  const id = r.items[r.index].candId;
  r.decisions[id] = r.decisions[id] === kind ? undefined : kind;
  if (!r.decisions[id]) delete r.decisions[id];
  const wasLast = r.index >= r.items.length - 1;
  if (!wasLast && r.decisions[id]) r.index += 1; // auto-advance after a decision
  render();
  scrollRailToCurrent();
};

window.saveShortlist = () => {
  const r = state.review;
  const shortlisted = Object.entries(r.decisions).filter(([, d]) => d === 'shortlist').map(([id]) => id);
  const rejected = Object.entries(r.decisions).filter(([, d]) => d === 'reject').map(([id]) => id);
  if (!shortlisted.length && !rejected.length) return toast('No decisions to save yet');
  state.db.shortlists.unshift({
    id: uid('sl'), date: today(), title: r.title,
    shortlisted, rejected,
  });
  const names = shortlisted.map((id) => (candById(id) || {}).name).filter(Boolean);
  logActivity('Shortlist saved', `"${r.title}" — ${shortlisted.length} shortlisted${names.length ? ': ' + names.join(', ') : ''}.`, 'shortlist', null);
  toast(`Saved — ${shortlisted.length} shortlisted, ${rejected.length} rejected`);
};

function scrollRailToCurrent() {
  const el = document.querySelector('.rail-item.current');
  if (el) el.scrollIntoView({ block: 'nearest' });
}

function cvBody(c) {
  return `
    <div class="cv-name">${esc(c.name)}</div>
    <div class="cv-title">${esc(c.title)}</div>
    <div class="cv-contact">
      <span>${esc(c.location || 'Singapore')}</span>
      <span>${esc(c.email)}</span>
      <span>${esc(c.phone)}</span>
      <span>${esc(c.workPass)}</span>
    </div>
    <div class="cv-section">
      <h3>Summary</h3>
      <div class="cv-summary">${esc(c.summary || '—')}</div>
    </div>
    <div class="cv-section">
      <h3>Key facts</h3>
      <div class="cv-facts">
        <div><div class="cv-fact-label">Experience</div><div class="cv-fact-val">${c.yearsExp} years</div></div>
        <div><div class="cv-fact-label">Education</div><div class="cv-fact-val">${esc(c.education || '—')}</div></div>
        <div><div class="cv-fact-label">Expected salary</div><div class="cv-fact-val">${money(c.salaryExpect)}</div></div>
        <div><div class="cv-fact-label">Availability</div><div class="cv-fact-val">${esc(c.availability || '—')}</div></div>
      </div>
    </div>
    <div class="cv-section">
      <h3>Skills &amp; certifications</h3>
      <div>
        ${(c.certs || []).map((s) => `<span class="chip chip-accent">✓ ${esc(s)}</span>`).join('')}
        ${(c.skills || []).map((s) => `<span class="chip">${esc(s)}</span>`).join('')}
      </div>
    </div>
    ${(c.experience || []).length ? `
    <div class="cv-section">
      <h3>Experience</h3>
      ${c.experience.map((e) => `
        <div class="cv-exp">
          <div class="cv-exp-head">
            <div><span class="cv-exp-role">${esc(e.role)}</span> <span class="cv-exp-co">· ${esc(e.company)}</span></div>
            <div class="cv-exp-dates">${esc(e.from)} – ${esc(e.to)}</div>
          </div>
          <ul>${(e.points || []).map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
        </div>`).join('')}
    </div>` : ''}`;
}

/* Keyboard handling for review mode */
document.addEventListener('keydown', (e) => {
  if (state.route !== 'review' || !state.review || !state.review.items.length) return;
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  const r = state.review;
  if (e.key === 'ArrowDown' || e.key === 'j') {
    e.preventDefault();
    if (r.index < r.items.length - 1) { r.index += 1; render(); scrollRailToCurrent(); }
  } else if (e.key === 'ArrowUp' || e.key === 'k') {
    e.preventDefault();
    if (r.index > 0) { r.index -= 1; render(); scrollRailToCurrent(); }
  } else if (e.key === 's' || e.key === 'S') {
    e.preventDefault();
    window.decide('shortlist');
  } else if (e.key === 'x' || e.key === 'X') {
    e.preventDefault();
    window.decide('reject');
  } else if (e.key === 'Escape') {
    window.exitReview();
  }
});

/* ============================== Boot ===================================== */
(async function boot() {
  try {
    const resp = await fetch('/api/db');
    state.db = await resp.json();
  } catch (e) {
    $('#main').innerHTML = '<div class="empty"><div class="empty-icon">⚠</div>Could not load the database. Start the app with <code>node server.js</code> and reload.</div>';
    return;
  }
  navigate();
})();
