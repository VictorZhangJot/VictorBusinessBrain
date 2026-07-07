// FlowRecruit X — recruitment CRM server (zero dependencies)
// Run: node server.js  →  http://localhost:4930
'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4930;
const DATA_FILE = path.join(__dirname, 'data.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// ---------- persistence ----------
let db;
function loadDb() {
  if (fs.existsSync(DATA_FILE)) {
    try { db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); return; } catch (e) { console.error('data.json corrupt, reseeding:', e.message); }
  }
  db = JSON.parse(JSON.stringify(require('./seed.js')));
  saveDb();
}
let saveTimer = null;
function saveDb() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFile(DATA_FILE, JSON.stringify(db, null, 1), (e) => { if (e) console.error('save failed:', e.message); });
  }, 150);
}
loadDb();

const COLLECTIONS = ['users', 'companies', 'contacts', 'candidates', 'jobs', 'applications', 'deals', 'sequences', 'recipes', 'tasks', 'placements', 'activities', 'emailTemplates', 'marketJobs', 'marketMatches'];
let idCounter = Date.now() % 100000;
const newId = (p) => p + '_' + (++idCounter).toString(36) + Math.random().toString(36).slice(2, 6);

function logActivity(type, text, relatedType, relatedId, userId) {
  db.activities.unshift({ id: newId('act'), ts: new Date().toISOString(), type, text, relatedType: relatedType || '', relatedId: relatedId || '', userId: userId || db.settings.currentUserId });
  if (db.activities.length > 500) db.activities.length = 500;
}

// ---------- skill extraction & matching engine ----------
const SKILL_DICT = ['python', 'pytorch', 'tensorflow', 'mlops', 'machine learning', 'deep learning', 'llm', 'llm fine-tuning', 'nlp', 'data science', 'pandas', 'statistics', 'sql', 'spark', 'airflow', 'dbt', 'etl', 'data engineering', 'kubernetes', 'docker', 'terraform', 'aws', 'gcp', 'azure', 'ci/cd', 'devops', 'sre', 'site reliability', 'prometheus', 'linux', 'go', 'golang', 'rust', 'java', 'c++', 'c#', '.net', 'react', 'vue', 'angular', 'next.js', 'node.js', 'typescript', 'javascript', 'graphql', 'postgresql', 'mysql', 'mongodb', 'redis', 'api design', 'frontend', 'backend', 'full stack', 'fullstack', 'css', 'figma', 'ux', 'ui', 'design systems', 'product management', 'agile', 'scrum', 'roadmapping', 'qa', 'test automation', 'playwright', 'selenium', 'cypress', 'security', 'cybersecurity', 'siem', 'incident response', 'threat hunting', 'penetration testing', 'cloud architect', 'solution architecture', 'data centre', 'data center', 'dcim', 'hvac', 'chillers', 'electrical systems', 'power distribution', 'switchgear', 'generators', 'bms', 'critical facilities', 'uptime', 'facilities management', 'commissioning', 'mechanical design', 'autocad', 'nursing', 'oncology', 'icu', 'critical care', 'chemotherapy', 'patient care', 'acls', 'bcls', 'palliative', 'ward', 'clinical trials', 'clinical research', 'gcp certification', 'regulatory', 'pharmacy', 'pharmacist', 'radiography', 'radiographer', 'ct', 'mri', 'vendor management', 'stakeholder management', 'project management', 'pmp', 'sales', 'business development', 'recruitment', 'sourcing', 'blockchain', 'solidity', 'ios', 'swift', 'android', 'kotlin', 'flutter', 'react native', 'php', 'laravel', 'ruby', 'rails', 'django', 'flask', 'fastapi', 'elasticsearch', 'kafka', 'rabbitmq', 'microservices', 'rest', 'grpc', 'tableau', 'power bi', 'looker', 'excel', 'salesforce', 'sap', 'marketing', 'seo', 'content', 'copywriting', 'hr', 'payroll', 'finance', 'accounting', 'devsecops', 'observability', 'grafana', 'ansible', 'jenkins', 'git'];

function extractSkills(text) {
  const t = ' ' + String(text || '').toLowerCase().replace(/[^a-z0-9+#./\s-]/g, ' ') + ' ';
  const found = new Set();
  for (const s of SKILL_DICT) {
    if (t.includes(' ' + s) || t.includes(s + ' ') || t.includes(s + ',') || t.includes(s + '.')) found.add(s);
  }
  return [...found];
}

const norm = (s) => String(s || '').toLowerCase().trim();
function titleSimilarity(a, b) {
  const stop = new Set(['senior', 'junior', 'lead', 'staff', 'principal', 'head', 'of', 'the', 'a', 'an', 'and', '-', '—', 'i', 'ii', 'iii']);
  const wa = norm(a).split(/[\s/(),]+/).filter((w) => w && !stop.has(w));
  const wb = norm(b).split(/[\s/(),]+/).filter((w) => w && !stop.has(w));
  if (!wa.length || !wb.length) return 0;
  const setB = new Set(wb);
  const hits = wa.filter((w) => setB.has(w)).length;
  return hits / Math.max(wa.length, wb.length);
}

function locationScore(candLoc, jobLoc) {
  const c = norm(candLoc), j = norm(jobLoc);
  if (!c || !j) return 0.5;
  if (j.includes('remote') || c.includes('remote')) return 1;
  const cCity = c.split(/[\/,]/)[0].trim(), jCity = j.split(/[\/,]/)[0].trim();
  if (cCity === jCity || c.includes(jCity) || j.includes(cCity)) return 1;
  const sea = ['singapore', 'kuala lumpur', 'johor', 'penang', 'jakarta', 'bangkok', 'manila', 'ho chi minh', 'malaysia', 'indonesia'];
  if (sea.some((x) => c.includes(x)) && sea.some((x) => j.includes(x))) return 0.5;
  return 0.15;
}

// Score a candidate against a job-like object {title, skills[], description, location, salaryMin, salaryMax}
function matchScore(candidate, job) {
  const candSkills = new Set((candidate.skills || []).map(norm).concat(extractSkills(candidate.summary + ' ' + candidate.title)));
  const jobSkills = (job.skills && job.skills.length ? job.skills.map(norm) : extractSkills(job.title + ' ' + (job.description || '')));
  const uniqueJobSkills = [...new Set(jobSkills)];
  let skillHits = [];
  for (const js of uniqueJobSkills) {
    if ([...candSkills].some((cs) => cs === js || cs.includes(js) || js.includes(cs))) skillHits.push(js);
  }
  const skillScore = uniqueJobSkills.length ? skillHits.length / uniqueJobSkills.length : 0;
  const titleScore = titleSimilarity(candidate.title, job.title);
  const locScore = locationScore(candidate.location, job.location);
  let salScore = 0.5;
  if (candidate.salaryExpectation && job.salaryMax) {
    salScore = candidate.salaryExpectation <= job.salaryMax * 1.05 ? 1 : candidate.salaryExpectation <= job.salaryMax * 1.2 ? 0.5 : 0.15;
  }
  const total = Math.round(100 * (0.5 * skillScore + 0.25 * titleScore + 0.15 * locScore + 0.1 * salScore));
  return {
    score: total,
    breakdown: {
      skills: Math.round(skillScore * 100), title: Math.round(titleScore * 100),
      location: Math.round(locScore * 100), salary: Math.round(salScore * 100),
    },
    matchedSkills: skillHits,
    missingSkills: uniqueJobSkills.filter((s) => !skillHits.includes(s)).slice(0, 6),
  };
}

// ---------- live market sources ----------
function fetchJson(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: Object.assign({ 'User-Agent': 'FlowRecruitX/1.0', Accept: 'application/json' }, headers || {}) }, (res) => {
      if (res.statusCode >= 301 && res.statusCode <= 308 && res.headers.location) {
        return fetchJson(res.headers.location, headers).then(resolve, reject);
      }
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode + ' from ' + url));
        try { resolve(JSON.parse(body)); } catch (e) { reject(new Error('Bad JSON from ' + url)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(new Error('Timeout fetching ' + url)); });
  });
}

const stripHtml = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();

function normalizeMarketJob(src, raw) {
  const desc = stripHtml(raw.description || '').slice(0, 1200);
  return {
    id: newId('mj'),
    source: src,
    live: true,
    title: raw.title || 'Untitled role',
    company: raw.company || 'Unknown',
    location: raw.location || 'Unspecified',
    salaryText: raw.salaryText || '',
    tags: raw.tags || [],
    skills: [...new Set((raw.tags || []).map(norm).concat(extractSkills(raw.title + ' ' + desc)))],
    url: raw.url || '',
    postedAt: raw.postedAt || new Date().toISOString(),
    description: desc,
    fetchedAt: new Date().toISOString(),
  };
}

const SAMPLE_FEEDS = {
  linkedin: [
    { title: 'Data Centre Operations Manager', company: 'Equinix-style Operator (sample)', location: 'Singapore', tags: ['data centre', 'critical facilities', 'dcim'], salaryText: 'S$120k–150k', description: 'Lead 24/7 operations across two IBX-class facilities. Manage uptime, vendor contracts, and a 12-person shift team.' },
    { title: 'Senior Machine Learning Engineer', company: 'Regional Super-app (sample)', location: 'Singapore', tags: ['python', 'pytorch', 'mlops', 'kubernetes'], salaryText: 'S$140k–180k', description: 'Build ranking and recommendation systems at scale. Strong MLOps and distributed training experience.' },
    { title: 'Nurse Clinician — Oncology', company: 'Private Hospital Group (sample)', location: 'Singapore', tags: ['oncology', 'nursing', 'chemotherapy'], salaryText: 'S$70k–90k', description: 'Advanced practice role in a growing oncology unit. SNB registration and 8+ years experience.' },
    { title: 'Cloud Infrastructure Engineer', company: 'Global Bank Tech Centre (sample)', location: 'Singapore', tags: ['aws', 'terraform', 'kubernetes', 'security'], salaryText: 'S$110k–145k', description: 'Regulated-workload cloud platform team. IaC, landing zones, and compliance automation.' },
    { title: 'Electrical Engineer — Hyperscale DC', company: 'DC Developer (sample)', location: 'Johor', tags: ['electrical systems', 'switchgear', 'power distribution', 'commissioning'], salaryText: 'RM180k–240k', description: 'Commissioning and design review for a new hyperscale campus. HV distribution experience required.' },
    { title: 'ICU Staff Nurse', company: 'Restructured Hospital (sample)', location: 'Singapore', tags: ['icu', 'critical care', 'acls'], salaryText: 'S$55k–75k', description: 'Critical care expansion. ACLS certified, 3+ years ICU. Sign-on bonus available.' },
  ],
  indeed: [
    { title: 'DevOps Engineer', company: 'Logistics Tech (sample)', location: 'Singapore', tags: ['kubernetes', 'ci/cd', 'terraform', 'aws'], salaryText: 'S$95k–125k', description: 'Own the deployment platform for a high-volume logistics network. On-call rotation, modern stack.' },
    { title: 'Clinical Research Associate', company: 'CRO — APAC (sample)', location: 'Singapore', tags: ['clinical trials', 'gcp certification', 'regulatory'], salaryText: 'S$60k–80k', description: 'Multi-site oncology and cardiology trials. Travel up to 30% within APAC.' },
    { title: 'Data Engineer', company: 'Insurtech (sample)', location: 'Remote / APAC', tags: ['python', 'airflow', 'dbt', 'sql'], salaryText: 'S$90k–120k', description: 'Build the lakehouse: ingestion, modelling, quality. dbt-first team, async culture.' },
    { title: 'Facilities Technician — Data Centre', company: 'Colo Provider (sample)', location: 'Singapore', tags: ['data centre', 'bms', 'hvac'], salaryText: 'S$48k–62k', description: 'Shift-based facility monitoring, PM execution, incident first response.' },
    { title: 'Pharmacist (Retail Chain)', company: 'Healthcare Retail (sample)', location: 'Singapore', tags: ['pharmacy', 'dispensing', 'patient counselling'], salaryText: 'S$68k–88k', description: 'Full registration with SPC required. Multiple outlets, rotational.' },
  ],
  mycareersfuture: [
    { title: 'Registered Nurse (Ward)', company: 'Community Hospital (sample)', location: 'Singapore', tags: ['nursing', 'ward', 'patient care', 'bcls'], salaryText: 'S$3,800–5,200/mo', description: 'Ward nursing with structured career ladder. New grads with SNB registration considered.' },
    { title: 'Senior Software Engineer (Full Stack)', company: 'Govtech Vendor (sample)', location: 'Singapore', tags: ['react', 'node.js', 'typescript', 'postgresql'], salaryText: 'S$8,000–11,000/mo', description: 'Citizen-facing services. React/Node, security clearance an advantage.' },
    { title: 'Data Centre Shift Engineer', company: 'Telco DC Arm (sample)', location: 'Singapore', tags: ['data centre', 'electrical systems', 'generators', 'uptime'], salaryText: 'S$5,500–7,500/mo', description: '12-hour rotating shifts. Tier III facility. LEW support pathway.' },
    { title: 'AI Engineer', company: 'Healthtech Scale-up (sample)', location: 'Singapore', tags: ['python', 'llm', 'nlp', 'fastapi'], salaryText: 'S$9,000–13,000/mo', description: 'Clinical-document AI products. LLM fine-tuning and evaluation pipelines.' },
  ],
};

async function fetchMarketSource(source, query, settings) {
  const q = norm(query);
  if (source === 'remoteok') {
    const data = await fetchJson('https://remoteok.com/api');
    const rows = (Array.isArray(data) ? data : []).filter((r) => r && r.position);
    return rows
      .map((r) => normalizeMarketJob('RemoteOK', {
        title: r.position, company: r.company, location: r.location || 'Remote',
        tags: r.tags || [], url: r.url,
        salaryText: r.salary_min ? `US$${Math.round(r.salary_min / 1000)}k–${Math.round((r.salary_max || r.salary_min) / 1000)}k` : '',
        postedAt: r.date, description: r.description,
      }))
      .filter((j) => !q || norm(j.title + ' ' + j.skills.join(' ') + ' ' + j.description).includes(q))
      .slice(0, 40);
  }
  if (source === 'arbeitnow') {
    const data = await fetchJson('https://www.arbeitnow.com/api/job-board-api');
    return (data.data || [])
      .map((r) => normalizeMarketJob('Arbeitnow', {
        title: r.title, company: r.company_name, location: r.location + (r.remote ? ' / Remote' : ''),
        tags: (r.tags || []).concat(r.job_types || []), url: r.url,
        postedAt: r.created_at ? new Date(r.created_at * 1000).toISOString() : undefined, description: r.description,
      }))
      .filter((j) => !q || norm(j.title + ' ' + j.skills.join(' ') + ' ' + j.description).includes(q))
      .slice(0, 40);
  }
  if (source === 'adzuna') {
    const { adzunaAppId, adzunaAppKey } = settings;
    if (!adzunaAppId || !adzunaAppKey) throw Object.assign(new Error('Adzuna needs an App ID and App Key (free at developer.adzuna.com). Add them in Settings → Integrations.'), { needsAuth: true });
    const url = `https://api.adzuna.com/v1/api/jobs/sg/search/1?app_id=${encodeURIComponent(adzunaAppId)}&app_key=${encodeURIComponent(adzunaAppKey)}&results_per_page=40&what=${encodeURIComponent(query || '')}&content-type=application/json`;
    const data = await fetchJson(url);
    return (data.results || []).map((r) => normalizeMarketJob('Adzuna', {
      title: r.title, company: r.company && r.company.display_name, location: r.location && r.location.display_name,
      url: r.redirect_url, postedAt: r.created, description: r.description,
      salaryText: r.salary_min ? `S$${Math.round(r.salary_min / 1000)}k–${Math.round((r.salary_max || r.salary_min) / 1000)}k` : '',
    }));
  }
  if (source === 'jsearch') {
    const key = settings.jsearchKey;
    if (!key) throw Object.assign(new Error('JSearch (aggregates LinkedIn/Indeed/Glassdoor postings) needs a RapidAPI key. Add it in Settings → Integrations.'), { needsAuth: true });
    const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent((query || 'engineer') + ' singapore')}&num_pages=1`;
    const data = await fetchJson(url, { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' });
    return (data.data || []).map((r) => normalizeMarketJob('JSearch (' + (r.job_publisher || 'aggregated') + ')', {
      title: r.job_title, company: r.employer_name, location: [r.job_city, r.job_country].filter(Boolean).join(', '),
      url: r.job_apply_link, postedAt: r.job_posted_at_datetime_utc, description: r.job_description,
      salaryText: r.job_min_salary ? `${r.job_salary_currency || ''}${r.job_min_salary}–${r.job_max_salary || ''}` : '',
    }));
  }
  if (SAMPLE_FEEDS[source]) {
    // Direct scraping of these platforms violates their terms; official partner APIs require credentials.
    return SAMPLE_FEEDS[source]
      .map((r) => Object.assign(normalizeMarketJob(source === 'linkedin' ? 'LinkedIn (sample feed)' : source === 'indeed' ? 'Indeed (sample feed)' : 'MyCareersFuture (sample feed)', r), { live: false }))
      .filter((j) => !q || norm(j.title + ' ' + j.skills.join(' ') + ' ' + j.description).includes(q));
  }
  throw new Error('Unknown source: ' + source);
}

// ---------- AI: Anthropic passthrough + local heuristics ----------
function callAnthropic(system, userMsg, settings) {
  return new Promise((resolve, reject) => {
    const key = settings.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) return reject(Object.assign(new Error('no-key'), { noKey: true }));
    const payload = JSON.stringify({
      model: settings.aiModel || 'claude-sonnet-5',
      max_tokens: 1200,
      system,
      messages: [{ role: 'user', content: userMsg }],
    });
    const req = https.request({
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-length': Buffer.byteLength(payload) },
    }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          const j = JSON.parse(body);
          if (j.error) return reject(new Error(j.error.message || 'API error'));
          resolve((j.content || []).map((b) => b.text || '').join(''));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => req.destroy(new Error('Anthropic API timeout')));
    req.write(payload);
    req.end();
  });
}

const AI_SYSTEM = 'You are AIRA, the AI recruiting assistant inside FlowRecruit X, a recruitment CRM. Be concise, concrete, and practical. Never invent facts about specific real people or companies; work only from the data provided in the prompt.';

function heuristicAI(task, p) {
  const c = p.candidate || {};
  const j = p.job || {};
  const first = (n) => String(n || 'there').split(' ')[0];
  switch (task) {
    case 'summary': {
      const m = p.matchInfo;
      return `**${c.name}** — ${c.title} (${c.experienceYears || '?'} yrs)\n\n` +
        `Currently at ${c.currentEmployer || 'n/a'}, based in ${c.location || 'n/a'}. ` +
        `Core skills: ${(c.skills || []).slice(0, 5).join(', ')}. ` +
        `Salary expectation ${c.currency || 'SGD'} ${(c.salaryExpectation || 0).toLocaleString()}, notice period ${c.noticePeriod || 'unknown'}, status ${c.status || 'unknown'}.\n\n` +
        `**Angle:** lead with ${(c.skills || [])[0] || 'their core skill'} depth and ${c.location} availability.` +
        (m ? `\n\n**Fit vs ${j.title}:** ${m.score}/100 — skills ${m.breakdown.skills}%, title ${m.breakdown.title}%, location ${m.breakdown.location}%, salary ${m.breakdown.salary}%.` : '');
    }
    case 'email': {
      const kind = p.kind || 'outreach';
      if (kind === 'client_submit') {
        return `Subject: Shortlist — ${j.title || 'your role'}\n\nHi ${first(p.recipientName)},\n\nSharing ${c.name} for ${j.title}: ${c.experienceYears} years in ${(c.skills || []).slice(0, 3).join(', ')}, currently at ${c.currentEmployer}. Expectation is ${c.currency || 'SGD'} ${(c.salaryExpectation || 0).toLocaleString()}, notice ${c.noticePeriod || 'TBC'}.\n\nScreening notes attached. Available for a walkthrough call this week — which slot suits?\n\nBest regards`;
      }
      return `Subject: ${j.title ? j.title + ' — quick question' : 'A role worth 15 minutes'}\n\nHi ${first(c.name)},\n\nYour background in ${(c.skills || []).slice(0, 2).join(' and ') || 'your field'} stood out${j.title ? ` for a ${j.title} role I am running${j.location ? ' in ' + j.location : ''}` : ''}.${j.salaryMax ? ` Budget runs to ${(j.salaryMax).toLocaleString()}.` : ''}\n\nWorth a 15-minute call this week? If timing is wrong, say the word and I will close the loop.\n\nBest regards`;
    }
    case 'jd': {
      const sk = p.skills || j.skills || [];
      return `# ${p.title || j.title}\n\n**Location:** ${p.location || j.location || 'TBC'} · **Type:** ${j.type || 'Permanent'}${j.salaryMin ? ` · **Salary:** ${j.salaryMin.toLocaleString()}–${(j.salaryMax || j.salaryMin).toLocaleString()}` : ''}\n\n## The role\nOwn outcomes end-to-end as a ${p.title || j.title}. You will work with stakeholders across the business, ship reliably, and raise the bar for the team.\n\n## What you'll do\n- Deliver on the core mandate of the role from week one\n- Own ${sk[0] || 'your domain'} across design, execution, and iteration\n- Collaborate with cross-functional partners and report progress clearly\n- Mentor and lift the standard around ${sk[1] || 'your craft'}\n\n## What you'll need\n${sk.slice(0, 6).map((s) => `- Solid, demonstrable experience with ${s}`).join('\n') || '- Relevant hands-on experience'}\n- Clear written and spoken communication\n\n## Process\nScreen (30 min) → technical/functional deep-dive → final panel. Decision within 2 weeks of first call.`;
    }
    case 'boolean': {
      const sk = (p.skills || c.skills || []).slice(0, 6);
      const t = p.title || c.title || '';
      const tParts = t.split(/\s+/).filter((w) => w.length > 2).map((w) => `"${w}"`).join(' AND ');
      return `(${tParts})${sk.length ? ' AND (' + sk.map((s) => `"${s}"`).join(' OR ') + ')' : ''}${p.location ? ` AND "${p.location}"` : ''} -"looking for" -"we are hiring"`;
    }
    case 'notetaker': {
      const sents = String(p.transcript || '').split(/(?<=[.?!])\s+/).filter((s) => s.length > 25);
      const key = sents.filter((s) => /salary|notice|offer|expect|available|interest|concern|start|remote|counter|visa|budget/i.test(s));
      const picks = (key.length ? key : sents).slice(0, 6);
      return `**Call summary**\n\n${picks.map((s) => '- ' + s.trim()).join('\n') || '- (transcript too short to summarise)'}\n\n**Suggested next step:** log agreed follow-ups as tasks and update the pipeline stage.`;
    }
    case 'chat': {
      return null; // handled by chatHeuristic with db access
    }
    default:
      return 'Unsupported AI task: ' + task;
  }
}

function chatHeuristic(message) {
  const m = norm(message);
  const words = m.split(/\s+/);
  const findSkill = SKILL_DICT.filter((s) => m.includes(s));
  // candidate search intent
  if (/find|search|show|who|list|candidates?|nurses?|engineers?|developers?/.test(m)) {
    let pool = db.candidates;
    if (findSkill.length) pool = pool.filter((c) => { const cs = (c.skills || []).map(norm).join(' ') + ' ' + norm(c.title); return findSkill.some((s) => cs.includes(s)); });
    const locHit = ['singapore', 'kuala lumpur', 'penang', 'jakarta', 'remote', 'johor'].find((l) => m.includes(l));
    if (locHit) pool = pool.filter((c) => norm(c.location).includes(locHit));
    if (/active|open to work/.test(m)) pool = pool.filter((c) => c.status === 'Active');
    if (pool.length && pool.length < db.candidates.length) {
      const top = pool.slice(0, 8);
      return `Found **${pool.length} candidate(s)**${findSkill.length ? ' matching ' + findSkill.join(', ') : ''}${locHit ? ' in ' + locHit : ''}:\n\n` +
        top.map((c) => `- **${c.name}** — ${c.title}, ${c.location} (${(c.skills || []).slice(0, 3).join(', ')})`).join('\n') +
        (pool.length > 8 ? `\n\n…and ${pool.length - 8} more. Open Candidates and use the same filter.` : '');
    }
  }
  if (/pipeline|stage|jobs? open|open jobs?/.test(m)) {
    const open = db.jobs.filter((x) => x.status === 'Open');
    const byStage = {};
    db.applications.forEach((a) => { byStage[a.stage] = (byStage[a.stage] || 0) + 1; });
    return `**${open.length} open jobs**, ${db.applications.length} candidates in pipelines.\n\n` + Object.entries(byStage).map(([s, n]) => `- ${s}: ${n}`).join('\n') + `\n\nMost urgent: ${open.filter((x) => x.priority === 'Urgent').map((x) => x.title).join(', ') || 'none flagged urgent'}.`;
  }
  if (/deal|revenue|placement|bill|fee/.test(m)) {
    const won = db.deals.filter((d) => d.stage === 'Won').reduce((s, d) => s + d.value, 0);
    const pipe = db.deals.filter((d) => !['Won', 'Lost'].includes(d.stage)).reduce((s, d) => s + d.value, 0);
    const fees = db.placements.reduce((s, p) => s + p.fee, 0);
    return `**Revenue snapshot** — Won deals: S$${won.toLocaleString()} · Open pipeline: S$${pipe.toLocaleString()} · Placement fees booked: S$${fees.toLocaleString()} across ${db.placements.length} placements.`;
  }
  if (/task|todo|today/.test(m)) {
    const open = db.tasks.filter((t) => !t.done);
    return `You have **${open.length} open tasks**. Top of the list:\n\n` + open.slice(0, 5).map((t) => `- ${t.title} (${t.priority})`).join('\n');
  }
  return `I can search candidates ("find kubernetes engineers in singapore"), summarise pipelines ("how are my open jobs"), report revenue ("revenue snapshot"), or list tasks. For richer answers, add an Anthropic API key in Settings → Integrations and I will use ${db.settings.aiModel} live.\n\n_${words.length < 3 ? 'Try a fuller question.' : 'No structured match for that query — rephrase or add an API key for free-form answers.'}_`;
}

function buildAiPrompt(task, p) {
  const ctx = JSON.stringify(p, null, 1).slice(0, 6000);
  const map = {
    summary: 'Write a crisp recruiter-facing candidate summary (max 150 words) with a suggested outreach angle. Data:\n',
    email: 'Write a personalised recruiting email (subject + body, under 140 words, no placeholders left unfilled, no clichés). Context:\n',
    jd: 'Write a complete job description in markdown (role, responsibilities, requirements, process). Context:\n',
    boolean: 'Produce one boolean search string for LinkedIn/job boards for this profile, plus 2 variants. Context:\n',
    notetaker: 'Summarise this call transcript into key points, candidate signals, and next steps:\n',
    chat: 'Answer the user question using ONLY this CRM data snapshot. Question and data:\n',
    match_pitch: 'Write a 3-sentence pitch for why this candidate fits this market job, then a 2-line outreach opener. Data:\n',
  };
  return (map[task] || 'Help with this recruiting task:\n') + ctx;
}

async function handleAi(task, payload) {
  // chat gets a db snapshot when using the live API
  if (task === 'chat') {
    const snapshot = {
      question: payload.message,
      counts: { candidates: db.candidates.length, openJobs: db.jobs.filter((j) => j.status === 'Open').length, deals: db.deals.length, placements: db.placements.length },
      jobs: db.jobs.map((j) => ({ title: j.title, status: j.status, priority: j.priority, location: j.location })),
      candidates: db.candidates.slice(0, 40).map((c) => ({ name: c.name, title: c.title, skills: c.skills, location: c.location, status: c.status })),
      deals: db.deals.map((d) => ({ name: d.name, stage: d.stage, value: d.value })),
      tasksOpen: db.tasks.filter((t) => !t.done).map((t) => t.title),
    };
    try {
      const text = await callAnthropic(AI_SYSTEM, buildAiPrompt('chat', snapshot), db.settings);
      return { text, engine: 'anthropic' };
    } catch (e) {
      if (!e.noKey) console.error('AI error:', e.message);
      return { text: chatHeuristic(payload.message), engine: 'local' };
    }
  }
  try {
    const text = await callAnthropic(AI_SYSTEM, buildAiPrompt(task, payload), db.settings);
    return { text, engine: 'anthropic' };
  } catch (e) {
    if (!e.noKey) console.error('AI error:', e.message);
    const text = heuristicAI(task, payload);
    return { text: text === null ? chatHeuristic(payload.message || '') : text, engine: 'local' };
  }
}

// ---------- http plumbing ----------
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

function send(res, code, data, type) {
  const body = type ? data : JSON.stringify(data);
  res.writeHead(code, { 'Content-Type': type || 'application/json', 'Cache-Control': 'no-store' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let b = '';
    req.on('data', (c) => { b += c; if (b.length > 5e6) req.destroy(); });
    req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch (e) { reject(new Error('Bad JSON body')); } });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const parts = u.pathname.split('/').filter(Boolean);

  try {
    if (parts[0] === 'api') {
      // ---- whole-db read ----
      if (req.method === 'GET' && parts[1] === 'data') return send(res, 200, db);

      // ---- market module ----
      if (parts[1] === 'market') {
        if (req.method === 'GET' && parts[2] === 'sources') {
          const s = db.settings;
          return send(res, 200, [
            { key: 'remoteok', name: 'RemoteOK', live: true, ready: true, note: 'Live public API — remote tech roles worldwide' },
            { key: 'arbeitnow', name: 'Arbeitnow', live: true, ready: true, note: 'Live public API — Europe + remote roles' },
            { key: 'adzuna', name: 'Adzuna (Singapore)', live: true, ready: !!(s.adzunaAppId && s.adzunaAppKey), note: 'Live API — free key at developer.adzuna.com', needs: 'Adzuna App ID + Key in Settings' },
            { key: 'jsearch', name: 'JSearch — LinkedIn/Indeed/Glassdoor postings', live: true, ready: !!s.jsearchKey, note: 'Aggregates postings from LinkedIn, Indeed, Glassdoor via RapidAPI', needs: 'RapidAPI key in Settings' },
            { key: 'linkedin', name: 'LinkedIn Jobs', live: false, ready: true, note: 'Official API is partner-gated; showing labelled sample feed. Use JSearch for live LinkedIn postings.' },
            { key: 'indeed', name: 'Indeed', live: false, ready: true, note: 'Official API is partner-gated; showing labelled sample feed. Use JSearch for live Indeed postings.' },
            { key: 'mycareersfuture', name: 'MyCareersFuture SG', live: false, ready: true, note: 'No public API; showing labelled sample feed' },
          ]);
        }
        if (req.method === 'POST' && parts[2] === 'fetch') {
          const body = await readBody(req);
          const sources = body.sources && body.sources.length ? body.sources : ['remoteok', 'arbeitnow', 'linkedin', 'indeed', 'mycareersfuture'];
          const results = await Promise.allSettled(sources.map((s) => fetchMarketSource(s, body.query || '', db.settings)));
          const jobs = [];
          const errors = [];
          results.forEach((r, i) => {
            if (r.status === 'fulfilled') jobs.push(...r.value);
            else errors.push({ source: sources[i], error: r.reason.message, needsAuth: !!r.reason.needsAuth });
          });
          db.marketJobs = jobs;
          saveDb();
          logActivity('system', `Market Match: fetched ${jobs.length} market jobs from ${sources.length} source(s)${body.query ? ` for "${body.query}"` : ''}`, 'market', '');
          return send(res, 200, { jobs, errors });
        }
        if (req.method === 'POST' && parts[2] === 'match') {
          const body = await readBody(req);
          let marketJobs = db.marketJobs;
          if (body.marketJobId) marketJobs = marketJobs.filter((m) => m.id === body.marketJobId);
          let candidates = db.candidates;
          if (body.candidateId) candidates = candidates.filter((c) => c.id === body.candidateId);
          const minScore = body.minScore == null ? 40 : body.minScore;
          const matches = [];
          for (const mj of marketJobs) {
            for (const cand of candidates) {
              const m = matchScore(cand, mj);
              if (m.score >= minScore) matches.push({ id: newId('mm'), marketJobId: mj.id, candidateId: cand.id, ...m, createdAt: new Date().toISOString() });
            }
          }
          matches.sort((a, b) => b.score - a.score);
          db.marketMatches = matches.slice(0, 300);
          saveDb();
          const hot = matches.filter((m) => m.score >= 80).length;
          logActivity('system', `Market Match: ${matches.length} matches computed (${hot} at 80+)`, 'market', '');
          return send(res, 200, { matches: db.marketMatches });
        }
        if (req.method === 'POST' && parts[2] === 'import') {
          // import a market job as a CRM job
          const body = await readBody(req);
          const mj = db.marketJobs.find((m) => m.id === body.marketJobId);
          if (!mj) return send(res, 404, { error: 'Market job not found' });
          let company = db.companies.find((c) => norm(c.name) === norm(mj.company));
          if (!company) {
            company = { id: newId('co'), name: mj.company, industry: 'From market feed', location: mj.location, size: '', website: '', tier: 'C', signal: 'Imported from ' + mj.source, ownerId: db.settings.currentUserId };
            db.companies.push(company);
          }
          const job = {
            id: newId('j'), title: mj.title, companyId: company.id, location: mj.location, type: 'Permanent',
            salaryMin: 0, salaryMax: 0, skills: mj.skills.slice(0, 8), status: 'Open', priority: 'Medium', fee: 20, openings: 1,
            ownerId: db.settings.currentUserId, description: mj.description + (mj.url ? '\n\nSource: ' + mj.url : ''), createdAt: new Date().toISOString(),
            importedFrom: mj.source,
          };
          db.jobs.push(job);
          (body.candidateIds || []).forEach((cid) => {
            db.applications.push({ id: newId('a'), jobId: job.id, candidateId: cid, stage: 'Sourced', addedAt: new Date().toISOString(), stageChangedAt: new Date().toISOString() });
          });
          saveDb();
          logActivity('system', `Imported market job "${mj.title}" (${mj.source}) as CRM job${body.candidateIds && body.candidateIds.length ? ' with ' + body.candidateIds.length + ' matched candidate(s)' : ''}`, 'job', job.id);
          return send(res, 200, { job, company });
        }
      }

      // ---- AI ----
      if (req.method === 'POST' && parts[1] === 'ai') {
        const body = await readBody(req);
        const out = await handleAi(parts[2] || body.task, body);
        return send(res, 200, out);
      }

      // ---- activity log ----
      if (req.method === 'POST' && parts[1] === 'log') {
        const b = await readBody(req);
        logActivity(b.type || 'note', b.text, b.relatedType, b.relatedId, b.userId);
        saveDb();
        return send(res, 200, { ok: true });
      }

      // ---- settings ----
      if (req.method === 'PUT' && parts[1] === 'settings') {
        const b = await readBody(req);
        Object.assign(db.settings, b);
        saveDb();
        return send(res, 200, db.settings);
      }

      // ---- reset demo data ----
      if (req.method === 'POST' && parts[1] === 'reset') {
        delete require.cache[require.resolve('./seed.js')];
        db = JSON.parse(JSON.stringify(require('./seed.js')));
        saveDb();
        return send(res, 200, { ok: true });
      }

      // ---- generic collection CRUD ----
      const col = parts[1];
      if (COLLECTIONS.includes(col)) {
        if (req.method === 'GET' && !parts[2]) return send(res, 200, db[col]);
        if (req.method === 'POST') {
          const b = await readBody(req);
          b.id = b.id || newId(col.slice(0, 2));
          b.createdAt = b.createdAt || new Date().toISOString();
          db[col].push(b);
          saveDb();
          return send(res, 200, b);
        }
        if (req.method === 'PUT' && parts[2]) {
          const item = db[col].find((x) => x.id === parts[2]);
          if (!item) return send(res, 404, { error: 'Not found' });
          const b = await readBody(req);
          Object.assign(item, b);
          saveDb();
          return send(res, 200, item);
        }
        if (req.method === 'DELETE' && parts[2]) {
          const i = db[col].findIndex((x) => x.id === parts[2]);
          if (i === -1) return send(res, 404, { error: 'Not found' });
          db[col].splice(i, 1);
          if (col === 'jobs') db.applications = db.applications.filter((a) => a.jobId !== parts[2]);
          if (col === 'candidates') db.applications = db.applications.filter((a) => a.candidateId !== parts[2]);
          saveDb();
          return send(res, 200, { ok: true });
        }
      }
      return send(res, 404, { error: 'Unknown API route' });
    }

    // ---- static ----
    let file = u.pathname === '/' ? '/index.html' : u.pathname;
    const fp = path.join(PUBLIC_DIR, path.normalize(file).replace(/^([.][.][\\/])+/, ''));
    if (!fp.startsWith(PUBLIC_DIR)) return send(res, 403, { error: 'Forbidden' });
    fs.readFile(fp, (err, buf) => {
      if (err) {
        // SPA fallback
        return fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (e2, b2) => {
          if (e2) return send(res, 404, { error: 'Not found' });
          send(res, 200, b2, 'text/html');
        });
      }
      send(res, 200, buf, MIME[path.extname(fp)] || 'application/octet-stream');
    });
  } catch (e) {
    console.error(req.method, u.pathname, '→', e.message);
    send(res, 500, { error: e.message });
  }
});

server.listen(PORT, () => {
  console.log(`\n  FlowRecruit X running → http://localhost:${PORT}\n  Data file: ${DATA_FILE}\n  All seed data is fictional.\n`);
});
