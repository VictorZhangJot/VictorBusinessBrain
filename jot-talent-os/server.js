/*
 * JOT TalentOS — zero-dependency local server.
 * Serves the app, persists the database to data/db.json, and proxies
 * live job-market searches to MyCareersFuture (Singapore).
 *
 * Run:  node server.js   →  http://localhost:4820
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4820;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DB_FILE = path.join(ROOT, 'data', 'db.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type || 'application/json; charset=utf-8' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 20 * 1024 * 1024) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<(br|\/p|\/li|\/div|\/h[1-6])\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

/* ---- MyCareersFuture live search proxy ---------------------------------- */
function searchMCF(query, limit) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ sessionId: '', search: query });
    const req = https.request({
      hostname: 'api.mycareersfuture.gov.sg',
      path: `/v2/search?limit=${Math.min(limit || 20, 40)}&offset=0`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent': 'Mozilla/5.0 (JOT TalentOS internal tool)',
        'Accept': 'application/json',
      },
      timeout: 15000,
    }, (resp) => {
      let data = '';
      resp.on('data', (c) => (data += c));
      resp.on('end', () => {
        if (resp.statusCode < 200 || resp.statusCode >= 300) {
          return reject(new Error(`MCF responded ${resp.statusCode}`));
        }
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('timeout', () => { req.destroy(new Error('MCF request timed out')); });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function fetchMCFJob(uuid) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.mycareersfuture.gov.sg',
      path: `/v2/jobs/${encodeURIComponent(uuid)}`,
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (JOT TalentOS internal tool)', 'Accept': 'application/json' },
      timeout: 15000,
    }, (resp) => {
      let data = '';
      resp.on('data', (c) => (data += c));
      resp.on('end', () => {
        if (resp.statusCode < 200 || resp.statusCode >= 300) return reject(new Error(`MCF responded ${resp.statusCode}`));
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('timeout', () => { req.destroy(new Error('MCF request timed out')); });
    req.on('error', reject);
    req.end();
  });
}

function normalizeMCF(raw) {
  const results = (raw && raw.results) || [];
  return results.map((r) => {
    const meta = r.metadata || {};
    const salary = r.salary || {};
    const descText = stripHtml(r.description || '');
    return {
      id: r.uuid || meta.jobPostId || Math.random().toString(36).slice(2),
      source: 'MyCareersFuture',
      title: r.title || 'Untitled role',
      company: (r.postedCompany && r.postedCompany.name) || (r.hiringCompany && r.hiringCompany.name) || 'Undisclosed employer',
      postedBy: (r.postedCompany && r.postedCompany.name) || null,
      hiringFor: (r.hiringCompany && r.hiringCompany.name) || null,
      salaryMin: salary.minimum || null,
      salaryMax: salary.maximum || null,
      salaryType: (salary.type && salary.type.salaryType) || 'Monthly',
      employmentTypes: (r.employmentTypes || []).map((t) => t.employmentType).filter(Boolean),
      positionLevels: (r.positionLevels || []).map((p) => p.position).filter(Boolean),
      categories: (r.categories || []).map((c) => c.category).filter(Boolean),
      skills: (r.skills || []).map((s) => s.skill).filter(Boolean),
      minYearsExperience: meta.minimumYearsExperience != null ? meta.minimumYearsExperience : null,
      postedDate: meta.newPostingDate || meta.originalPostingDate || null,
      closingDate: meta.expiryDate || null,
      applications: meta.totalNumberJobApplication != null ? meta.totalNumberJobApplication : null,
      url: meta.jobDetailsUrl || (r.uuid ? `https://www.mycareersfuture.gov.sg/job/${r.uuid}` : null),
      description: descText.slice(0, 6000),
    };
  });
}

/* ---- HTTP server --------------------------------------------------------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  try {
    if (url.pathname === '/api/db' && req.method === 'GET') {
      return send(res, 200, fs.readFileSync(DB_FILE, 'utf8'));
    }

    if (url.pathname === '/api/db' && req.method === 'POST') {
      const body = await readBody(req);
      JSON.parse(body); // validate before writing
      fs.writeFileSync(DB_FILE, body, 'utf8');
      return send(res, 200, '{"ok":true}');
    }

    if (url.pathname === '/api/market' && req.method === 'GET') {
      const q = url.searchParams.get('q') || '';
      const limit = parseInt(url.searchParams.get('limit') || '20', 10);
      if (!q.trim()) return send(res, 400, JSON.stringify({ error: 'Missing query' }));
      try {
        const raw = await searchMCF(q.trim(), limit);
        const jobs = normalizeMCF(raw);
        return send(res, 200, JSON.stringify({ live: true, total: raw.total || jobs.length, jobs }));
      } catch (e) {
        return send(res, 200, JSON.stringify({ live: false, error: String(e.message || e), jobs: [] }));
      }
    }

    if (url.pathname === '/api/market/detail' && req.method === 'GET') {
      const id = url.searchParams.get('id') || '';
      if (!id.trim()) return send(res, 400, JSON.stringify({ error: 'Missing id' }));
      try {
        const raw = await fetchMCFJob(id.trim());
        return send(res, 200, JSON.stringify({
          ok: true,
          description: stripHtml(raw.description || '').slice(0, 8000),
          otherRequirements: stripHtml(raw.otherRequirements || ''),
          minYearsExperience: raw.minimumYearsExperience != null ? raw.minimumYearsExperience : null,
          skills: (raw.skills || []).map((s) => s.skill).filter(Boolean),
        }));
      } catch (e) {
        return send(res, 200, JSON.stringify({ ok: false, error: String(e.message || e) }));
      }
    }

    // static files
    let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
    filePath = path.normalize(path.join(PUBLIC_DIR, filePath));
    if (!filePath.startsWith(PUBLIC_DIR)) return send(res, 403, 'Forbidden', 'text/plain');
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      return send(res, 200, fs.readFileSync(filePath), MIME[ext] || 'application/octet-stream');
    }
    return send(res, 404, 'Not found', 'text/plain');
  } catch (e) {
    return send(res, 500, JSON.stringify({ error: String(e.message || e) }));
  }
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.log(`TalentOS is already running at http://localhost:${PORT} — using the existing one.`);
    process.exit(0);
  }
  throw e;
});

server.listen(PORT, () => {
  console.log(`JOT TalentOS running at http://localhost:${PORT}`);
});
