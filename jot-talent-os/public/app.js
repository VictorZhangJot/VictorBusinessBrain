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

const SEARCH_STOPWORDS = new Set(['with', 'and', 'the', 'who', 'that', 'have', 'has', 'had', 'for', 'experience', 'experienced', 'background', 'in', 'of', 'a', 'an', 'any', 'all', 'skills', 'skilled', 'knowledge', 'years', 'yrs', 'good', 'strong', 'me', 'my', 'someone', 'anyone', 'people', 'person']);
function searchCandidates(query) {
  const tokens = String(query || '').toLowerCase().split(/[\s,]+/)
    .filter((t) => t.length > 1 && !SEARCH_STOPWORDS.has(t));
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

/* ==================== Command palette (Ctrl+K) ===========================
   Loxo-style instant search: one box, every record, pure keyboard. */
const palette = { open: false, query: '', sel: 0, results: [] };

function paletteSearch(q) {
  const out = [];
  const ql = q.trim().toLowerCase();
  const NAV_ACTIONS = [
    { title: 'Scan the live market', sub: 'Market Intel', ico: '◎', go: '#/market', kind: 'Action' },
    { title: 'Open pipeline board', sub: 'Drag candidates across stages', ico: '▥', go: '#/board', kind: 'Action' },
    { title: 'Review CVs with arrow keys', sub: 'CV Review', ico: '⇅', go: '#/review', kind: 'Action' },
    { title: 'Ask the assistant', sub: 'AI-assisted search', ico: '✦', go: '#/assistant', kind: 'Action' },
    { title: 'Revenue & reports', sub: 'Placements, forecast, funnel', ico: '∿', go: '#/reports', kind: 'Action' },
    { title: 'Talent Map', sub: 'Who works where', ico: '⊞', go: '#/talentmap', kind: 'Action' },
    { title: 'Add a candidate', sub: 'Paste a CV to parse it', ico: '+', go: '#/candidates', kind: 'Action' },
  ];
  if (!ql) return NAV_ACTIONS;
  NAV_ACTIONS.forEach((a) => { if (a.title.toLowerCase().includes(ql) || a.sub.toLowerCase().includes(ql)) out.push(a); });
  searchCandidates(q).slice(0, 6).forEach((h) => out.push({
    title: h.cand.name, sub: h.cand.title + ' · ' + h.cand.yearsExp + ' yrs · ' + (h.why[0] || ''),
    ico: h.cand.name.split(' ').map((w) => w[0]).slice(0, 2).join(''), go: '#/candidates/' + h.cand.id, kind: 'Candidate',
  }));
  state.db.clients.filter((c) => (c.name + ' ' + c.industry).toLowerCase().includes(ql)).slice(0, 4).forEach((c) => out.push({
    title: c.name, sub: c.industry + ' · ' + c.status, ico: '◫', go: '#/clients/' + c.id, kind: 'Client',
  }));
  state.db.jobs.filter((j) => j.title.toLowerCase().includes(ql)).slice(0, 4).forEach((j) => out.push({
    title: j.title, sub: ((clientById(j.clientId) || {}).name || '') + ' · ' + j.status, ico: '▤', go: '#/jobs/' + j.id, kind: 'Job',
  }));
  Array.from(buildCompanyMap().values()).filter((co) => co.name.toLowerCase().includes(ql)).slice(0, 3).forEach((co) => out.push({
    title: co.name, sub: co.current.length + ' inside · ' + co.targets.length + ' hunted', ico: '⊞', go: '#/talentmap/' + encodeURIComponent(co.key), kind: 'Company',
  }));
  return out;
}

function renderPalette() {
  let el = $('#palette-overlay');
  if (!palette.open) { if (el) el.remove(); return; }
  palette.results = paletteSearch(palette.query);
  if (palette.sel >= palette.results.length) palette.sel = Math.max(0, palette.results.length - 1);
  const html = `
  <div class="palette" onclick="event.stopPropagation()">
    <input id="palette-input" placeholder="Search candidates, clients, jobs, companies… or jump to an action" value="${esc(palette.query)}" autocomplete="off">
    <div class="palette-results">
      ${palette.results.map((r, i) => `
        <div class="pal-item ${i === palette.sel ? 'sel' : ''}" onclick="paletteGo(${i})" onmousemove="paletteHover(${i})">
          <div class="pal-ico">${esc(r.ico)}</div>
          <div><div class="pal-title">${esc(r.title)}</div><div class="pal-sub">${esc(r.sub)}</div></div>
          <div class="pal-kind">${esc(r.kind)}</div>
        </div>`).join('') || '<div class="pal-empty">Nothing matches — try a skill, a name, or a company.</div>'}
    </div>
    <div class="pal-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></div>
  </div>`;
  if (!el) {
    el = document.createElement('div');
    el.id = 'palette-overlay';
    el.className = 'palette-overlay';
    el.onclick = () => closePalette();
    document.body.appendChild(el);
  }
  el.innerHTML = html;
  const input = $('#palette-input');
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
  input.oninput = (e) => { palette.query = e.target.value; palette.sel = 0; renderPalette(); };
}

window.paletteGo = (i) => {
  const r = palette.results[i];
  if (!r) return;
  closePalette();
  location.hash = r.go;
};
window.paletteHover = (i) => {
  if (palette.sel !== i) { palette.sel = i; renderPalette(); }
};
function openPalette() { palette.open = true; palette.query = ''; palette.sel = 0; renderPalette(); }
function closePalette() { palette.open = false; renderPalette(); }

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault();
    palette.open ? closePalette() : openPalette();
    return;
  }
  if (!palette.open) return;
  if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); palette.sel = Math.min(palette.results.length - 1, palette.sel + 1); renderPalette(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); palette.sel = Math.max(0, palette.sel - 1); renderPalette(); }
  else if (e.key === 'Enter') { e.preventDefault(); window.paletteGo(palette.sel); }
  e.stopPropagation();
}, true);

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
  if (state.route === 'integrations' && !state.manatal.status) checkManatalStatus();
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
    <div class="card"><div class="kpi-num">${inPipeline}</div><div class="kpi-label">Candidates in pipelines</div></div>
    <div class="card"><div class="kpi-num">${interviews}</div><div class="kpi-label">At interview stage</div></div>
    <div class="card"><div class="kpi-num">${money(pipelineForecast().total)}</div><div class="kpi-label">Weighted pipeline forecast</div></div>
  </div>

  <div class="grid grid-2" style="margin-top:14px; align-items:start;">
    <div class="stack">
    ${tasksPanel()}
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

/* ---- Placements & fees (the Vincere-style revenue layer) ---------------- */
function feePctOf(job) {
  const m = String(job.fee || '').match(/(\d+(?:\.\d+)?)\s*%/);
  return m ? parseFloat(m[1]) : 20;
}

function bookPlacement(jobId, candId) {
  if (!state.db.placements) state.db.placements = [];
  if (state.db.placements.some((p) => p.jobId === jobId && p.candId === candId)) return;
  const j = jobById(jobId);
  const c = candById(candId);
  if (!j || !c) return;
  const monthly = c.salaryExpect || j.salaryMax || j.salaryMin || 0;
  const feePct = feePctOf(j);
  const fee = Math.round(monthly * 12 * feePct / 100);
  state.db.placements.unshift({
    id: uid('pl'), date: today(), jobId, candId,
    jobTitle: j.title, candName: c.name, clientId: j.clientId,
    salary: monthly, feePct, fee,
    daysToFill: j.openedDate ? Math.max(0, Math.round((new Date(today()) - new Date(j.openedDate)) / 86400000)) : null,
  });
  logActivity('Placement 🎉', `${c.name} placed as ${j.title} — fee ${money(fee)} (${feePct}% of annual).`, 'job', jobId);
  toast(`Placement booked — ${money(fee)} fee 🎉`);
}

window.setStage = (jobId, candId, stage) => {
  const j = jobById(jobId);
  j.pipeline[candId] = stage;
  const c = candById(candId);
  if (stage === 'Placed') {
    bookPlacement(jobId, candId);
  } else {
    logActivity('Stage change', `${c ? c.name : candId} moved to ${stage} for "${j.title}".`, 'job', jobId);
    toast('Stage updated');
  }
  if (state.route === 'board') render();
};

/* ====================== Pipeline board (kanban) ========================== */
VIEWS.board = () => {
  const openJobs = state.db.jobs.filter((j) => j.status === 'Open');
  const filterJob = state.boardJob || 'all';
  const jobs = filterJob === 'all' ? openJobs : openJobs.filter((j) => j.id === filterJob);
  const cards = [];
  jobs.forEach((j) => {
    Object.entries(j.pipeline || {}).forEach(([cid, stage]) => {
      const c = candById(cid);
      if (c) cards.push({ job: j, cand: c, stage });
    });
  });
  return `
  <div class="page-head">
    <div>
      <div class="page-title">Pipeline Board</div>
      <div class="page-desc">Every candidate in every open pipeline. Drag a card to move stages — dropping on Placed books the placement fee automatically.</div>
    </div>
    <select class="input" style="width:280px" onchange="setBoardJob(this.value)">
      <option value="all">All open jobs (${openJobs.length})</option>
      ${openJobs.map((j) => `<option value="${j.id}" ${filterJob === j.id ? 'selected' : ''}>${esc(j.title)}</option>`).join('')}
    </select>
  </div>
  <div class="board">
    ${STAGES.map((stage) => {
      const here = cards.filter((x) => x.stage === stage);
      return `
      <div class="board-col" data-stage="${stage}"
           ondragover="event.preventDefault(); this.classList.add('dragover')"
           ondragleave="this.classList.remove('dragover')"
           ondrop="boardDrop(event, '${stage}')">
        <div class="board-col-head">
          <span class="board-col-title">${stage}</span>
          <span class="board-col-count">${here.length}</span>
        </div>
        ${here.map((x) => `
          <div class="board-card p-${(x.job.priority || 'normal').toLowerCase()}" draggable="true"
               ondragstart="boardDrag(event, '${x.job.id}', '${x.cand.id}')"
               ondragend="this.classList.remove('dragging')"
               ondblclick="location.hash='#/candidates/${x.cand.id}'"
               title="Drag to move · double-click to open CV">
            <div class="bc-name">${esc(x.cand.name)}</div>
            <div class="bc-job">${esc(x.job.title)}<br><span class="faint">${esc((clientById(x.job.clientId) || {}).name || '')}</span></div>
            <div class="bc-meta"><span>${money(x.cand.salaryExpect)}</span><span>${esc(x.cand.availability || '')}</span></div>
          </div>`).join('')}
      </div>`;
    }).join('')}
  </div>`;
};

window.setBoardJob = (v) => { state.boardJob = v; render(); };
window.boardDrag = (e, jobId, candId) => {
  e.dataTransfer.setData('text/plain', jobId + '|' + candId);
  e.target.classList.add('dragging');
};
window.boardDrop = (e, stage) => {
  e.preventDefault();
  const [jobId, candId] = (e.dataTransfer.getData('text/plain') || '').split('|');
  if (!jobId || !candId) return;
  const j = jobById(jobId);
  if (j && j.pipeline[candId] !== stage) window.setStage(jobId, candId, stage);
  else render();
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

/* CV paste-parser: paste raw CV text, get a structured candidate. */
function parseCVText(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const out = {};
  const emailM = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (emailM) out.email = emailM[0];
  const phoneM = text.match(/(?:\+65[\s-]?)?[3689]\d{3}[\s-]?\d{4}/);
  if (phoneM) out.phone = phoneM[0];
  // name: first short line of letters, not a header word
  out.name = (lines.find((l) => l && l.length < 45 && /^[A-Za-z' .,-]+$/.test(l) &&
    l.split(/\s+/).length >= 2 && l.split(/\s+/).length <= 5 &&
    !/resume|curriculum|vitae|profile|summary|experience|education|contact/i.test(l)) || '').replace(/,.*/, '');
  // title: first line mentioning a recognisable role word
  const ROLE_RE = /nurse|engineer|manager|technician|radiographer|physiotherapist|scientist|developer|analyst|consultant|clinician|therapist|architect|specialist|executive|lead/i;
  const titleLine = lines.slice(0, 15).find((l) => l && l.length < 70 && ROLE_RE.test(l) && l !== out.name);
  if (titleLine) out.title = titleLine.replace(/^(current\s*(role|title)\s*:?\s*)/i, '');
  // years of experience
  const yM = text.match(/(\d{1,2})\+?\s*years?(?:['’]?s)?\s*(?:of\s*)?(?:relevant |working |clinical |professional )?experience/i);
  if (yM) out.yearsExp = parseInt(yM[1], 10);
  else {
    const years = (text.match(/\b(19[89]\d|20[012]\d)\b/g) || []).map(Number);
    if (years.length) out.yearsExp = Math.min(40, new Date().getFullYear() - Math.min(...years));
  }
  // education: line containing the highest level mentioned
  let bestEdu = null;
  EDU_LEVELS.forEach((e) => { if (textHasSyn(' ' + text.toLowerCase() + ' ', e.syn)) bestEdu = e; });
  if (bestEdu) {
    const eduLine = lines.find((l) => textHasSyn(' ' + l.toLowerCase() + ' ', bestEdu.syn));
    out.education = eduLine && eduLine.length < 90 ? eduLine : bestEdu.name;
  }
  // skills & certs via the taxonomy
  const p = extractPrereqs(text);
  out.skills = p.skills.map((s) => s.name);
  out.certs = p.certs.map((c) => c.name);
  // summary: first meaty paragraph
  const para = text.split(/\n\s*\n/).map((s) => s.replace(/\s+/g, ' ').trim()).find((s) => s.length > 100 && !/@/.test(s.slice(0, 60)));
  if (para) out.summary = para.slice(0, 400);
  return out;
}

window.parseCVIntoForm = () => {
  const text = $('#ncd-cv').value;
  if (!text.trim()) return toast('Paste the CV text first');
  const p = parseCVText(text);
  if (p.name) $('#ncd-name').value = p.name;
  if (p.title) $('#ncd-title').value = p.title;
  if (p.yearsExp) $('#ncd-years').value = p.yearsExp;
  if (p.education) $('#ncd-edu').value = p.education;
  if (p.email || p.phone) $('#ncd-contact').value = [p.email, p.phone].filter(Boolean).join(' · ');
  if (p.skills || p.certs) $('#ncd-skills').value = [].concat(p.certs || [], p.skills || []).join(', ');
  if (p.summary) $('#ncd-summary').value = p.summary;
  toast(`Parsed — found ${(p.skills || []).length + (p.certs || []).length} skills. Check the fields, then save.`);
};

window.showAddCandidate = () => {
  $('#add-cand-slot').innerHTML = `
  <div class="card" style="margin-bottom:14px">
    <div class="section-title">New candidate</div>
    <div style="margin-bottom:12px">
      <textarea class="input" id="ncd-cv" rows="4" placeholder="⚡ Fast path: paste the raw CV text here and press Parse — name, title, contact, years, education, skills and summary fill themselves."></textarea>
      <button class="btn" style="margin-top:8px" onclick="parseCVIntoForm()">⚡ Parse CV</button>
    </div>
    <div class="grid grid-2">
      <input class="input" id="ncd-name" placeholder="Full name">
      <input class="input" id="ncd-title" placeholder="Current title (e.g. Staff Nurse)">
      <input class="input" id="ncd-years" placeholder="Years of experience" type="number">
      <input class="input" id="ncd-edu" placeholder="Education (e.g. Diploma in Nursing, NYP)">
      <input class="input" id="ncd-pass" placeholder="Work pass (Citizen / PR / EP)">
      <input class="input" id="ncd-salary" placeholder="Expected salary (SGD)" type="number">
    </div>
    <div style="margin-top:10px"><input class="input" id="ncd-contact" placeholder="Email · phone"></div>
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
  // duplicate detection — the silent database-killer in every agency CRM
  const contact = ($('#ncd-contact') ? $('#ncd-contact').value : '').toLowerCase();
  const dup = state.db.candidates.find((c) =>
    c.name.toLowerCase() === name.toLowerCase() ||
    (c.email && contact.includes(c.email.toLowerCase())));
  if (dup) return toast(`Possible duplicate of ${dup.name} — open their profile instead of re-adding`);
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
    availability: 'To confirm', location: '',
    email: (contact.match(/[\w.+-]+@[\w-]+\.[\w.-]+/) || [''])[0],
    phone: (contact.match(/(?:\+65[\s-]?)?[3689]\d{3}[\s-]?\d{4}/) || [''])[0],
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

/* ============================ Reports ==================================== */
const STAGE_WEIGHTS = { Sourcing: 0.05, Screening: 0.1, Submitted: 0.25, Interview: 0.45, Offer: 0.75 };

function pipelineForecast() {
  let total = 0;
  const rows = [];
  state.db.jobs.filter((j) => j.status === 'Open').forEach((j) => {
    Object.entries(j.pipeline || {}).forEach(([cid, stage]) => {
      const w = STAGE_WEIGHTS[stage];
      if (!w) return;
      const c = candById(cid);
      if (!c) return;
      const fee = Math.round((c.salaryExpect || j.salaryMax || 0) * 12 * feePctOf(j) / 100);
      total += Math.round(fee * w);
      rows.push({ job: j, cand: c, stage, fee, weighted: Math.round(fee * w) });
    });
  });
  return { total, rows: rows.sort((a, b) => b.weighted - a.weighted) };
}

VIEWS.reports = () => {
  const placements = state.db.placements || [];
  const booked = placements.reduce((n, p) => n + p.fee, 0);
  const fc = pipelineForecast();
  const fills = placements.filter((p) => p.daysToFill != null);
  const avgFill = fills.length ? Math.round(fills.reduce((n, p) => n + p.daysToFill, 0) / fills.length) : null;

  const funnel = {};
  STAGES.forEach((s) => (funnel[s] = 0));
  state.db.jobs.filter((j) => j.status === 'Open').forEach((j) =>
    Object.values(j.pipeline || {}).forEach((s) => { if (funnel[s] != null) funnel[s]++; }));
  const funnelMax = Math.max(1, ...Object.values(funnel));

  const sources = {};
  state.db.candidates.forEach((c) => {
    const s = c.source || 'Unknown';
    sources[s] = sources[s] || { total: 0, inPipeline: 0, placed: 0 };
    sources[s].total++;
    if (state.db.jobs.some((j) => (j.pipeline || {})[c.id])) sources[s].inPipeline++;
    if (placements.some((p) => p.candId === c.id)) sources[s].placed++;
  });

  const byClient = {};
  placements.forEach((p) => {
    const name = (clientById(p.clientId) || {}).name || 'Unknown';
    byClient[name] = (byClient[name] || 0) + p.fee;
  });

  return `
  <div class="page-head">
    <div>
      <div class="page-title">Reports & Revenue</div>
      <div class="page-desc">Booked fees, weighted pipeline forecast, funnel conversion and source effectiveness — the numbers a world-class desk runs on.</div>
    </div>
  </div>
  <div class="grid grid-4">
    <div class="card"><div class="rev-num kpi-accent">${money(booked)}</div><div class="kpi-label">Booked fees (${placements.length} placement${placements.length === 1 ? '' : 's'})</div></div>
    <div class="card"><div class="rev-num">${money(fc.total)}</div><div class="kpi-label">Weighted pipeline forecast</div></div>
    <div class="card"><div class="rev-num">${avgFill != null ? avgFill + ' days' : '—'}</div><div class="kpi-label">Average time to fill</div></div>
    <div class="card"><div class="rev-num">${state.db.jobs.filter((j) => j.status === 'Open').length}</div><div class="kpi-label">Open job orders</div></div>
  </div>
  <div class="grid grid-2" style="margin-top:14px; align-items:start">
    <div class="stack">
      <div class="card">
        <div class="section-title">Pipeline funnel (open jobs)</div>
        ${STAGES.filter((s) => s !== 'Rejected').map((s) => `
          <div class="funnel-row">
            <div class="funnel-label">${s}</div>
            <div class="funnel-track"><div class="funnel-fill" style="width:${Math.round((funnel[s] / funnelMax) * 100)}%">${funnel[s]}</div></div>
          </div>`).join('')}
      </div>
      <div class="card">
        <div class="section-title">Forecast detail — where the money sits</div>
        ${fc.rows.slice(0, 8).map((r) => `
          <div class="feed-item">
            <div style="flex:1">
              <div class="row-title" style="font-size:13px">${esc(r.cand.name)} → ${esc(r.job.title)}</div>
              <div class="row-sub">${esc(r.stage)} · full fee ${money(r.fee)} × ${Math.round((STAGE_WEIGHTS[r.stage] || 0) * 100)}%</div>
            </div>
            <div class="row-title">${money(r.weighted)}</div>
          </div>`).join('') || '<div class="muted small">Nothing in pipeline yet.</div>'}
      </div>
    </div>
    <div class="stack">
      <div class="card">
        <div class="section-title">Placements</div>
        ${placements.map((p) => `
          <div class="feed-item">
            <div style="flex:1">
              <div class="row-title" style="font-size:13px">${esc(p.candName)} — ${esc(p.jobTitle)}</div>
              <div class="row-sub">${esc(p.date)} · ${esc((clientById(p.clientId) || {}).name || '')} · ${p.daysToFill != null ? p.daysToFill + ' days to fill' : ''}</div>
            </div>
            <div class="row-title" style="color:var(--green)">${money(p.fee)}</div>
          </div>`).join('') || '<div class="muted small">No placements booked yet — drag a candidate to Placed on the board.</div>'}
      </div>
      <div class="card">
        <div class="section-title">Source effectiveness</div>
        <table class="table">
          <thead><tr><th>Source</th><th>Candidates</th><th>In pipeline</th><th>Placed</th></tr></thead>
          <tbody>
          ${Object.entries(sources).sort((a, b) => b[1].total - a[1].total).map(([s, v]) => `
            <tr><td>${esc(s)}</td><td>${v.total}</td><td>${v.inPipeline}</td><td>${v.placed}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      ${Object.keys(byClient).length ? `
      <div class="card">
        <div class="section-title">Revenue by client</div>
        ${Object.entries(byClient).sort((a, b) => b[1] - a[1]).map(([n, f]) => `
          <div class="feed-item"><div style="flex:1">${esc(n)}</div><div class="row-title">${money(f)}</div></div>`).join('')}
      </div>` : ''}
    </div>
  </div>`;
};

/* ============================ Tasks ====================================== */
function addTask(text, due, refType, refId) {
  if (!state.db.tasks) state.db.tasks = [];
  const t = { id: uid('task'), text, due: due || today(), refType: refType || null, refId: refId || null, done: false, createdDate: today() };
  state.db.tasks.unshift(t);
  saveDb();
  return t;
}
window.toggleTask = (id) => {
  const t = (state.db.tasks || []).find((x) => x.id === id);
  if (!t) return;
  t.done = !t.done;
  saveDb();
  render();
};
function tasksPanel() {
  const tasks = (state.db.tasks || []).filter((t) => !t.done).sort((a, b) => (a.due || '').localeCompare(b.due || ''));
  const overdue = (d) => d && d < today();
  return `
  <div class="card">
    <div class="section-title">Follow-ups due</div>
    ${tasks.slice(0, 8).map((t) => `
      <div class="task-row">
        <input type="checkbox" onchange="toggleTask('${t.id}')">
        <div style="flex:1">
          <div>${esc(t.text)}</div>
          <div class="task-due ${overdue(t.due) ? 'overdue' : ''}">${overdue(t.due) ? '⚠ overdue — ' : 'due '}${esc(t.due)}</div>
        </div>
      </div>`).join('') || '<div class="muted small">Nothing pending. Ask the assistant to “remind me to…”.</div>'}
  </div>`;
}

/* ============================ Integrations ================================
   Manatal ATS/CRM connection. The API token lives only in jot-talent-os/.env
   (git-ignored) and never passes through this browser code or the chat —
   the server reads it directly and proxies requests. */
state.manatal = { status: null, syncing: false, lastSync: null };

async function checkManatalStatus() {
  try {
    const resp = await fetch('/api/manatal/status');
    state.manatal.status = await resp.json();
  } catch (e) {
    state.manatal.status = { connected: false, reason: 'error', message: String(e.message || e) };
  }
  if (state.route === 'integrations') render();
}

VIEWS.integrations = () => {
  const st = state.manatal.status;
  const connected = st && st.connected;
  return `
  <div class="page-head">
    <div>
      <div class="page-title">Integrations</div>
      <div class="page-desc">Connect TalentOS to the systems you already pay for. Credentials live only in the local <code>.env</code> file on this machine — never in the browser, never in chat, never committed to GitHub.</div>
    </div>
  </div>
  <div class="card" style="max-width:680px">
    <div style="display:flex; justify-content:space-between; align-items:flex-start">
      <div>
        <div class="section-title" style="margin-bottom:4px">Manatal</div>
        <div class="small muted">Recruitment CRM &amp; ATS — sourcing, candidate database, application pipelines.</div>
      </div>
      ${st == null
        ? '<span class="badge badge-stage">Checking…</span>'
        : connected
          ? '<span class="badge badge-open">● Connected</span>'
          : st.reason === 'no-token'
            ? '<span class="badge badge-stage">Not configured</span>'
            : '<span class="badge badge-agency">⚠ Connection failed</span>'}
    </div>

    ${st && !connected && st.reason !== 'no-token' ? `<div class="prereq-box" style="border-color:var(--red)"><span style="color:var(--red)">${esc(st.message || 'Could not reach Manatal.')}</span></div>` : ''}

    ${st && st.reason === 'no-token' ? `
      <div class="prereq-box">
        <div class="prereq-label">To connect</div>
        <ol style="margin-left:18px; line-height:1.9; font-size:13px">
          <li>In Manatal: <b>Administration → Features → Open API → Generate new token</b> (requires the Enterprise Plus plan).</li>
          <li>On this computer, open <code>jot-talent-os/.env</code> in Notepad (not through Claude — keep the token out of any chat).</li>
          <li>Paste it as <code>MANATAL_API_TOKEN=your-token-here</code> and save.</li>
          <li>Close and reopen <code>Start TalentOS.bat</code> so the server picks it up, then press Refresh below.</li>
        </ol>
      </div>` : ''}

    ${connected ? `
      <div class="compare-bar" style="margin-top:14px">
        <button class="btn btn-primary" onclick="syncManatal()" ${state.manatal.syncing ? 'disabled' : ''}>
          ${state.manatal.syncing ? '<span class="spinner"></span> Syncing…' : '⇄ Sync candidates from Manatal'}
        </button>
        <span class="small muted">${state.manatal.lastSync ? `Last sync: ${esc(state.manatal.lastSync)}` : 'Pulls your Manatal candidate database into TalentOS — matching, search and CV Review all apply to them immediately.'}</span>
      </div>` : ''}

    <div style="margin-top:14px"><button class="btn btn-sm" onclick="checkManatalStatus()">↻ Refresh status</button></div>
  </div>`;
};

window.checkManatalStatus = checkManatalStatus;

window.syncManatal = async () => {
  state.manatal.syncing = true;
  render();
  try {
    const resp = await fetch('/api/manatal/sync', { method: 'POST', body: JSON.stringify({ pages: 3 }) });
    const data = await resp.json();
    if (!data.ok) {
      toast('Sync failed — ' + (data.error || data.reason || 'unknown error'));
    } else {
      let added = 0, updated = 0;
      (data.candidates || []).forEach((m) => {
        const existing = state.db.candidates.find((c) =>
          (c.manatalId && c.manatalId === m.manatalId) || (m.email && c.email && c.email.toLowerCase() === m.email.toLowerCase()));
        if (existing) {
          Object.assign(existing, {
            manatalId: m.manatalId, title: existing.title || m.title, education: existing.education || m.education,
            email: existing.email || m.email, phone: existing.phone || m.phone, location: existing.location || m.location,
          });
          invalidateCandidateCaches(existing);
          updated++;
        } else {
          const p = extractPrereqs([m.title, m.summary, (m.tags || []).join(' ')].join('. '));
          state.db.candidates.push({
            id: uid('cand'), manatalId: m.manatalId, name: m.name, title: m.title || 'Candidate',
            domain: 'General', yearsExp: 0, education: m.education, skills: p.skills.map((s) => s.name),
            certs: p.certs.map((c) => c.name), workPass: 'Unknown', salaryExpect: null,
            availability: 'To confirm', location: m.location, email: m.email, phone: m.phone,
            status: 'Active', source: 'Manatal', summary: m.summary, experience: [],
          });
          added++;
        }
      });
      saveDb();
      state.manatal.lastSync = new Date().toLocaleString('en-SG');
      logActivity('Manatal sync', `Synced from Manatal — ${added} new candidate${added === 1 ? '' : 's'}, ${updated} updated.`, null, null);
      toast(`Synced — ${added} new, ${updated} updated`);
    }
  } catch (e) {
    toast('Sync failed — ' + String(e.message || e));
  }
  state.manatal.syncing = false;
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

/* ========================= AI Assistant chat =============================
   A recruiter copilot. The built-in intent engine runs real actions against
   your data (search, match, market scans, talent map, tasks, revenue).
   Free-form questions route to Claude when ANTHROPIC_API_KEY is set. */
state.chat = [];
let chatBusy = false;

const CHAT_SUGGESTIONS = [
  'What should I do today?',
  'Find ICU nurses available now',
  'Who fits the Machine Learning Engineer job?',
  'Search the market for data centre engineer',
  'Who works at Equinix?',
  'How is revenue looking?',
  'Remind me to call Serene tomorrow',
];

function chatLink(href, label) { return `<a href="${esc(href)}">${esc(label)}</a>`; }
function candLine(c, extra) {
  return `<li>${chatLink('#/candidates/' + c.id, c.name)} — ${esc(c.title)}, ${c.yearsExp} yrs, ${esc(c.availability || '')}${extra ? ' · ' + extra : ''}</li>`;
}

function fuzzyFindJob(text) {
  const tl = text.toLowerCase();
  let best = null, bestScore = 0;
  state.db.jobs.forEach((j) => {
    const toks = titleTokens(j.title);
    const hits = toks.filter((w) => tl.includes(w)).length;
    if (hits > bestScore) { bestScore = hits; best = j; }
  });
  return bestScore ? best : null;
}

function fuzzyFindCompany(text) {
  const tl = normCo(text);
  const map = buildCompanyMap();
  for (const co of map.values()) {
    if (tl.includes(co.key) || co.key.includes(tl)) return co;
  }
  let best = null, bestLen = 0;
  for (const co of map.values()) {
    const words = co.key.split(' ');
    if (words.some((w) => w.length > 3 && tl.includes(w)) && co.key.length > bestLen) { best = co; bestLen = co.key.length; }
  }
  return best;
}

async function assistantRespond(raw) {
  const msg = raw.trim();
  const m = msg.toLowerCase();

  // -- daily digest ---------------------------------------------------------
  if (/what should i do|today|priorit|morning|brief me|my day/.test(m)) {
    const tasks = (state.db.tasks || []).filter((t) => !t.done);
    const overdue = tasks.filter((t) => t.due && t.due < today());
    const dueToday = tasks.filter((t) => t.due === today());
    const interviews = [];
    const offers = [];
    state.db.jobs.filter((j) => j.status === 'Open').forEach((j) => {
      Object.entries(j.pipeline || {}).forEach(([cid, stage]) => {
        const c = candById(cid);
        if (!c) return;
        if (stage === 'Interview') interviews.push({ c, j });
        if (stage === 'Offer') offers.push({ c, j });
      });
    });
    const urgent = state.db.jobs.filter((j) => j.status === 'Open' && j.priority === 'Urgent');
    let out = '<b>Your desk this morning:</b><ul>';
    overdue.forEach((t) => out += `<li>⚠ <b>Overdue:</b> ${esc(t.text)} (was due ${esc(t.due)})</li>`);
    dueToday.forEach((t) => out += `<li>📌 Due today: ${esc(t.text)}</li>`);
    offers.forEach((x) => out += `<li>💰 <b>Offer out:</b> ${chatLink('#/candidates/' + x.c.id, x.c.name)} for ${chatLink('#/jobs/' + x.j.id, x.j.title)} — chase it, this is closest to a fee</li>`);
    interviews.forEach((x) => out += `<li>🗓 Interview stage: ${chatLink('#/candidates/' + x.c.id, x.c.name)} for ${chatLink('#/jobs/' + x.j.id, x.j.title)} — confirm feedback</li>`);
    urgent.forEach((j) => out += `<li>🔥 Urgent role: ${chatLink('#/jobs/' + j.id, j.title)} — ${Object.keys(j.pipeline || {}).length} in pipeline${Object.keys(j.pipeline || {}).length < 3 ? ', thin — source more' : ''}</li>`);
    out += '</ul>';
    const fc = pipelineForecast();
    out += `Weighted pipeline stands at <b>${money(fc.total)}</b>. ${chatLink('#/reports', 'Full numbers →')}`;
    return out;
  }

  // -- reminders ------------------------------------------------------------
  const remind = msg.match(/remind me (?:to |about )?(.+?)(?:\s+(today|tomorrow|next week|on \d{4}-\d{2}-\d{2}))?$/i);
  if (/remind me|add (a )?task/.test(m) && remind) {
    let due = today();
    const when = (remind[2] || '').toLowerCase();
    const d = new Date();
    if (when === 'tomorrow') { d.setDate(d.getDate() + 1); due = d.toISOString().slice(0, 10); }
    else if (when === 'next week') { d.setDate(d.getDate() + 7); due = d.toISOString().slice(0, 10); }
    else if (when.startsWith('on ')) due = when.slice(3);
    const t = addTask(remind[1].trim(), due);
    return `Noted. I will keep <b>“${esc(t.text)}”</b> on your follow-up list, due <b>${esc(t.due)}</b>. It shows on the Dashboard until you tick it off.`;
  }

  // -- who fits a job -------------------------------------------------------
  if (/who (fits|matches|suits)|best (candidates?|people) for|shortlist for/.test(m)) {
    const job = fuzzyFindJob(m);
    if (job) {
      const prereqs = extractPrereqs(job.description);
      const results = matchCandidates(prereqs, { title: job.title, salaryMax: job.salaryMax }).slice(0, 3);
      let out = `Top matches for <b>${esc(job.title)}</b> (${esc((clientById(job.clientId) || {}).name || '')}):<ul>`;
      results.forEach((r) => out += candLine(r.cand, `<b>${r.score}%</b> match, ${r.matched.length} requirements hit`));
      out += '</ul>';
      out += `<span class="chat-chip" onclick="assistOpenMatch('${job.id}')">Open full match view with evidence →</span>`;
      return out;
    }
    return 'I could not find that job order. Say it closer to the title — for example “who fits the Machine Learning Engineer job?”';
  }

  // -- market scan ----------------------------------------------------------
  const marketQ = msg.match(/(?:market|mycareersfuture|live (?:jobs?|roles?|listings?))(?:\s*(?:for|:))?\s+(.+)/i);
  if (marketQ && marketQ[1]) {
    const q = marketQ[1].trim();
    try {
      const resp = await fetch('/api/market?q=' + encodeURIComponent(q) + '&limit=20');
      const data = await resp.json();
      const jobs = data.jobs || [];
      state.market.query = q; state.market.results = jobs; state.market.live = data.live;
      state.market.total = data.total; state.market.error = null; state.market.prereqs = {}; state.market.filter = 'all';
      const agencies = jobs.filter((j) => classifyEmployer(j).type === 'agency').length;
      let out = `Live market for <b>“${esc(q)}”</b>: <b>${data.total || jobs.length}</b> postings right now — showing ${jobs.length}: <b>${jobs.length - agencies} direct employers</b> (BD prospects) and <b>${agencies} agency postings</b> (competitors).<ul>`;
      jobs.slice(0, 3).forEach((j) => out += `<li>${esc(j.title)} — ${esc(j.company)}, ${money(j.salaryMin)}–${money(j.salaryMax)}</li>`);
      out += `</ul>${chatLink('#/market', 'See all with prerequisites highlighted →')}`;
      return out;
    } catch (e) {
      return 'I could not reach MyCareersFuture just now — check the connection and try again.';
    }
  }

  // -- talent map -----------------------------------------------------------
  const whoAt = msg.match(/who (?:works?|is) (?:at|in|inside)\s+(.+)|talent map (?:for )?(.+)/i);
  if (whoAt) {
    const coName = (whoAt[1] || whoAt[2] || '').trim().replace(/[?.]$/, '');
    const co = fuzzyFindCompany(coName);
    if (co) {
      let out = `<b>${esc(co.name)}</b> — here is your intel:<ul>`;
      co.current.forEach((r) => out += candLine(r.cand, 'inside now as ' + esc(r.role)));
      co.alumni.forEach((r) => out += `<li>${chatLink('#/candidates/' + r.cand.id, r.cand.name)} — alumni (${esc(r.role)}, ${esc(r.from)}–${esc(r.to)}), warm intro path</li>`);
      co.targets.forEach((t) => out += `<li>◎ Hunting: ${esc(t.name)} — ${esc(t.title)} (${esc(t.status)})</li>`);
      if (!co.current.length && !co.alumni.length && !co.targets.length) out += '<li>No intel yet.</li>';
      out += `</ul>${chatLink('#/talentmap/' + encodeURIComponent(co.key), 'Open the org chart →')}`;
      return out;
    }
    return `I have no intel on “${esc(coName)}” yet. Add a hunt target there from the ${chatLink('#/talentmap', 'Talent Map')} and it will appear.`;
  }

  // -- revenue --------------------------------------------------------------
  if (/revenue|placements?|forecast|fees|money|billing/.test(m)) {
    const placements = state.db.placements || [];
    const booked = placements.reduce((n, p) => n + p.fee, 0);
    const fc = pipelineForecast();
    let out = `<b>Booked:</b> ${money(booked)} across ${placements.length} placement${placements.length === 1 ? '' : 's'}. <b>Weighted pipeline forecast:</b> ${money(fc.total)}.`;
    if (fc.rows.length) {
      out += ' Closest money:<ul>';
      fc.rows.slice(0, 3).forEach((r) => out += `<li>${esc(r.cand.name)} → ${esc(r.job.title)} (${esc(r.stage)}) — ${money(r.weighted)} weighted</li>`);
      out += '</ul>';
    }
    return out + chatLink('#/reports', 'Full report →');
  }

  // -- candidate search -----------------------------------------------------
  if (/^(find|search|show|list|get|any)\b|nurses?|engineers?|available|candidates? (with|who)/.test(m)) {
    const q = msg.replace(/^(find|search for|search|show me|show|list|get|any)\s+/i, '').replace(/\b(candidates?|people|profiles?)\b/gi, ' ').replace(/available now|available/gi, ' ').trim();
    const hits = searchCandidates(q);
    const wantAvailable = /available now|immediate/i.test(msg);
    const filtered = wantAvailable ? hits.filter((h) => /immediate/i.test(h.cand.availability || '')) : hits;
    const list = (filtered.length ? filtered : hits).slice(0, 5);
    if (!list.length) return `Nobody in the database matches “${esc(q)}” — even with fuzzy matching. Try the ${chatLink('#/market', 'live market')} or add a hunt target in the ${chatLink('#/talentmap', 'Talent Map')}.`;
    let out = `Found <b>${filtered.length || hits.length}</b> for “${esc(q)}”${wantAvailable && filtered.length ? ' (available immediately)' : ''}:<ul>`;
    list.forEach((h) => out += candLine(h.cand, h.why[0] ? esc(h.why[0]) : ''));
    out += `</ul><span class="chat-chip" onclick="assistOpenSearch('${esc(q).replace(/'/g, '')}')">Open in Candidates →</span> <span class="chat-chip" onclick="assistReview('${esc(q).replace(/'/g, '')}')">⇅ Review these CVs →</span>`;
    return out;
  }

  // -- free-form: try the Claude-powered brain ------------------------------
  try {
    const context = {
      openJobs: state.db.jobs.filter((j) => j.status === 'Open').map((j) => ({ title: j.title, client: (clientById(j.clientId) || {}).name, salary: [j.salaryMin, j.salaryMax], priority: j.priority, pipeline: Object.entries(j.pipeline || {}).map(([cid, s]) => ((candById(cid) || {}).name || cid) + ':' + s) })),
      candidates: state.db.candidates.map((c) => ({ name: c.name, title: c.title, yrs: c.yearsExp, skills: (c.skills || []).slice(0, 6), expects: c.salaryExpect, avail: c.availability, pass: c.workPass })),
      clients: state.db.clients.map((c) => ({ name: c.name, industry: c.industry, status: c.status })),
      placements: (state.db.placements || []).map((p) => ({ who: p.candName, role: p.jobTitle, fee: p.fee, date: p.date })),
      tasksOpen: (state.db.tasks || []).filter((t) => !t.done).map((t) => t.text + ' due ' + t.due),
    };
    const resp = await fetch('/api/assistant', { method: 'POST', body: JSON.stringify({ message: msg, context }) });
    const data = await resp.json();
    if (data.ok) return esc(data.text).replace(/\n/g, '<br>');
  } catch (e) { /* fall through to the capability card */ }

  return `I did not catch a command in that. I can do these out of the box:<ul>
    <li><b>“Find …”</b> — search candidates (synonyms + typo-tolerant)</li>
    <li><b>“Who fits the … job?”</b> — run matching with scores</li>
    <li><b>“Search the market for …”</b> — live MyCareersFuture scan, agencies split out</li>
    <li><b>“Who works at …?”</b> — talent map intel</li>
    <li><b>“What should I do today?”</b> — desk digest</li>
    <li><b>“Remind me to … tomorrow”</b> — follow-up tasks</li>
    <li><b>“How is revenue?”</b> — booked fees + forecast</li></ul>
    <span class="small faint">For open-ended questions, start the server with an ANTHROPIC_API_KEY environment variable and I answer with Claude.</span>`;
}

window.assistOpenSearch = (q) => { state.candidateQuery = q; location.hash = '#/candidates'; render(); };
window.assistReview = (q) => { state.candidateQuery = q; window.reviewCandidateList(); };
window.assistOpenMatch = (jobId) => { window.matchForJob(jobId); };

VIEWS.assistant = () => {
  if (!state.chat.length) {
    state.chat.push({ role: 'ai', html: `Good morning, Victor. I am your TalentOS copilot — I search the database, run matches, scan the live market, check the talent map and track your follow-ups, all from this chat. Try a suggestion below or just tell me what you need.` });
  }
  return `
  <div class="page-head">
    <div>
      <div class="page-title">Assistant</div>
      <div class="page-desc">Your recruiting copilot. It executes real searches and actions on your data — every answer is grounded in the database or the live market, never invented.</div>
    </div>
  </div>
  <div class="chat-wrap">
    <div class="chat-scroll" id="chat-scroll">
      ${state.chat.map((msg) => `
        <div class="chat-msg ${msg.role === 'me' ? 'me' : 'ai'}">
          <div class="avatar ${msg.role === 'ai' ? 'ai-avatar' : ''}">${msg.role === 'ai' ? '✦' : 'VZ'}</div>
          <div class="chat-bubble">${msg.role === 'me' ? esc(msg.text) : msg.html}</div>
        </div>`).join('')}
      ${chatBusy ? '<div class="chat-typing"><span class="spinner"></span> working on it…</div>' : ''}
    </div>
    <div class="chat-chips">
      ${CHAT_SUGGESTIONS.map((s) => `<button class="chat-chip" onclick="sendChat('${s.replace(/'/g, '')}')">${esc(s)}</button>`).join('')}
    </div>
    <div class="chat-input-row">
      <input class="input" id="chat-input" placeholder="Ask anything — “find nurses with oncology experience”, “who fits the nurse job?”…"
        onkeydown="if(event.key==='Enter')sendChat()">
      <button class="btn btn-primary" onclick="sendChat()" ${chatBusy ? 'disabled' : ''}>Send</button>
    </div>
  </div>`;
};

window.sendChat = async (preset) => {
  if (chatBusy) return;
  const input = $('#chat-input');
  const msg = (preset || (input ? input.value : '')).trim();
  if (!msg) return;
  state.chat.push({ role: 'me', text: msg });
  chatBusy = true;
  render();
  scrollChat();
  let html;
  try { html = await assistantRespond(msg); }
  catch (e) { html = 'Something went wrong running that — try rephrasing.'; }
  chatBusy = false;
  state.chat.push({ role: 'ai', html });
  if (state.route === 'assistant') { render(); scrollChat(); const el = $('#chat-input'); if (el) el.focus(); }
};

function scrollChat() {
  const el = $('#chat-scroll');
  if (el) el.scrollTop = el.scrollHeight;
}

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
