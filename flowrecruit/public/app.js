/* FlowRecruit X — SPA */
'use strict';

let S = null; // full db snapshot
let marketErrors = [];

// ---------- api ----------
async function api(path, method, body) {
  const res = await fetch('/api/' + path, {
    method: method || 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
async function refresh() { S = await api('data'); }
async function mutate(path, method, body) { const r = await api(path, method, body); await refresh(); render(); return r; }

// ---------- utils ----------
const $ = (sel, el) => (el || document).querySelector(sel);
const $$ = (sel, el) => [...(el || document).querySelectorAll(sel)];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => 'S$' + Number(n || 0).toLocaleString();
const AVATAR_COLORS = ['#6455FF', '#007BFF', '#01326A', '#FF9D28', '#1FA36B', '#E54747', '#4AA1FF', '#8a5cf6'];
const avColor = (name) => AVATAR_COLORS[[...String(name)].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
const initials = (name) => String(name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const avatar = (name, sz) => `<span class="avatar" style="background:${avColor(name)};${sz ? `width:${sz}px;height:${sz}px;font-size:${sz / 2.6}px` : ''}">${esc(initials(name))}</span>`;
function timeAgo(iso) {
  if (!iso) return '';
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return Math.floor(d / 60) + 'm ago';
  if (d < 86400) return Math.floor(d / 3600) + 'h ago';
  if (d < 86400 * 30) return Math.floor(d / 86400) + 'd ago';
  return new Date(iso).toLocaleDateString();
}
const dueLabel = (iso) => {
  const diff = Math.round((new Date(iso) - Date.now()) / 86400000);
  if (diff < 0) return `<span style="color:var(--red);font-weight:600">${-diff}d overdue</span>`;
  if (diff === 0) return '<span style="color:var(--orange);font-weight:600">today</span>';
  return `in ${diff}d`;
};
// minimal markdown → html (bold, italics, headers, bullets, line breaks)
function md(text) {
  const lines = esc(text).split('\n');
  let out = '', inList = false;
  for (let ln of lines) {
    ln = ln.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|\s)\*(.+?)\*/g, '$1<em>$2</em>').replace(/(^|\s)_(.+?)_/g, '$1<em>$2</em>');
    if (/^#{1,3}\s/.test(ln)) { if (inList) { out += '</ul>'; inList = false; } out += `<div style="font-weight:800;margin:8px 0 4px">${ln.replace(/^#+\s/, '')}</div>`; continue; }
    if (/^-\s/.test(ln)) { if (!inList) { out += '<ul style="margin:4px 0 4px 18px">'; inList = true; } out += `<li>${ln.slice(2)}</li>`; continue; }
    if (inList) { out += '</ul>'; inList = false; }
    out += ln + '<br>';
  }
  if (inList) out += '</ul>';
  return out;
}
function toast(msg, isError) {
  const t = document.createElement('div');
  t.className = 'toast' + (isError ? ' error' : '');
  t.textContent = msg;
  $('#toastRoot').appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
const byId = (col, id) => (S[col] || []).find((x) => x.id === id) || {};
const userName = (id) => (byId('users', id).name || '—');
const compName = (id) => (byId('companies', id).name || '—');
const candName = (id) => (byId('candidates', id).name || '—');
const me = () => byId('users', S.settings.currentUserId);
const scoreClass = (s) => (s >= 75 ? 'score-hi' : s >= 55 ? 'score-mid' : 'score-lo');
const priChip = (p) => `<span class="chip ${p === 'Urgent' ? 'red' : p === 'High' ? 'orange' : 'grey'}">${esc(p)}</span>`;

// ---------- modal ----------
function openModal(title, bodyHtml, buttons, wide) {
  closeModal();
  const root = $('#modalRoot');
  root.innerHTML = `<div class="modal-backdrop"><div class="modal${wide ? ' wide' : ''}">
    <div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close>✕</button></div>
    <div class="modal-body">${bodyHtml}</div>
    <div class="modal-foot">${(buttons || []).map((b, i) => `<button class="btn ${b.cls || 'btn-primary'}" data-mbtn="${i}">${esc(b.label)}</button>`).join('')}</div>
  </div></div>`;
  $('[data-close]', root).onclick = closeModal;
  $('.modal-backdrop', root).addEventListener('click', (e) => { if (e.target.classList.contains('modal-backdrop')) closeModal(); });
  (buttons || []).forEach((b, i) => { $(`[data-mbtn="${i}"]`, root).onclick = () => b.onClick($('.modal', root)); });
  return $('.modal', root);
}
function closeModal() { $('#modalRoot').innerHTML = ''; }
const formVal = (modal) => { const o = {}; $$('[name]', modal).forEach((el) => { o[el.name] = el.type === 'checkbox' ? el.checked : el.value; }); return o; };

// ---------- AI helpers ----------
async function aiCall(task, payload) { return api('ai/' + task, 'POST', payload); }
function aiBlock(id) { return `<div class="ai-output mt hidden" id="${id}"><span class="ai-tag"><span class="aira-dot"></span> AIRA</span><div class="ai-text"></div></div>`; }
async function runAiInto(blockId, task, payload, btn) {
  const block = $('#' + blockId);
  const old = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Thinking…'; }
  block.classList.remove('hidden');
  $('.ai-text', block).innerHTML = '<span class="spin"></span>';
  try {
    const r = await aiCall(task, payload);
    $('.ai-text', block).innerHTML = md(r.text);
    $('.ai-tag', block).innerHTML = `<span class="aira-dot"></span> AIRA · ${r.engine === 'anthropic' ? esc(S.settings.aiModel) : 'local engine'}`;
  } catch (e) { $('.ai-text', block).textContent = 'AI error: ' + e.message; }
  if (btn) { btn.disabled = false; btn.innerHTML = old; }
}

// ---------- charts (canvas) ----------
function barChart(canvas, labels, values, color) {
  const c = canvas.getContext('2d');
  const W = (canvas.width = canvas.offsetWidth * 2), H = (canvas.height = canvas.offsetHeight * 2);
  c.clearRect(0, 0, W, H);
  const max = Math.max(...values, 1);
  const pad = 30, bw = (W - pad * 2) / labels.length;
  c.font = '600 20px Inter'; c.textAlign = 'center';
  labels.forEach((lb, i) => {
    const h = (values[i] / max) * (H - 90);
    const x = pad + i * bw;
    c.fillStyle = color || '#6455FF';
    roundRect(c, x + bw * 0.18, H - 50 - h, bw * 0.64, h, 8); c.fill();
    c.fillStyle = '#8B8FA8'; c.fillText(lb, x + bw / 2, H - 22);
    c.fillStyle = '#141414'; c.fillText(values[i] ? (values[i] >= 1000 ? Math.round(values[i] / 1000) + 'k' : values[i]) : '', x + bw / 2, H - 58 - h);
  });
}
function roundRect(c, x, y, w, h, r) { r = Math.min(r, h / 2, w / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function donutChart(canvas, entries) {
  const c = canvas.getContext('2d');
  const W = (canvas.width = canvas.offsetWidth * 2), H = (canvas.height = canvas.offsetHeight * 2);
  c.clearRect(0, 0, W, H);
  const total = entries.reduce((s, e) => s + e.value, 0) || 1;
  let a = -Math.PI / 2;
  const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 14;
  entries.forEach((e) => {
    const sweep = (e.value / total) * Math.PI * 2;
    c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, r, a, a + sweep); c.closePath();
    c.fillStyle = e.color; c.fill();
    a += sweep;
  });
  c.beginPath(); c.arc(cx, cy, r * 0.62, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill();
  c.fillStyle = '#141414'; c.font = '800 34px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(String(total), cx, cy - 8);
  c.font = '600 18px Inter'; c.fillStyle = '#8B8FA8'; c.fillText('total', cx, cy + 22);
}

// ---------- router ----------
const routes = {};
function render() {
  const hash = location.hash.replace(/^#\//, '') || 'dashboard';
  const [name, id] = hash.split('/');
  $$('#mainNav a').forEach((a) => a.classList.toggle('active', a.dataset.route === name));
  const fn = routes[name] || routes.dashboard;
  $('#view').innerHTML = '';
  fn(id);
}
window.addEventListener('hashchange', render);

// =========================================================
// DASHBOARD
// =========================================================
routes.dashboard = () => {
  const openJobs = S.jobs.filter((j) => j.status === 'Open');
  const activeCands = S.candidates.filter((c) => c.status === 'Active');
  const pipeValue = S.deals.filter((d) => !['Won', 'Lost'].includes(d.stage)).reduce((s, d) => s + d.value, 0);
  const fees = S.placements.reduce((s, p) => s + p.fee, 0);
  const openTasks = S.tasks.filter((t) => !t.done).sort((a, b) => new Date(a.due) - new Date(b.due));
  const stages = S.settings.stages;
  const stageCounts = stages.map((st) => S.applications.filter((a) => a.stage === st).length);
  const hotMatches = S.marketMatches.filter((m) => m.score >= 80).length;

  const lb = S.users.map((u) => ({
    u,
    placements: S.placements.filter((p) => p.ownerId === u.id).length,
    fees: S.placements.filter((p) => p.ownerId === u.id).reduce((s, p) => s + p.fee, 0),
  })).sort((a, b) => b.fees - a.fees);

  $('#view').innerHTML = `
    <div class="page-head"><div><h1>Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${esc(me().name.split(' ')[0])}</h1>
      <div class="sub">${openJobs.length} open jobs · ${S.applications.length} candidates in play · ${openTasks.length} tasks pending</div></div>
      <div class="page-actions"><a class="btn btn-blue" href="#/market">🛰️ Run Market Match${hotMatches ? ` <span class="chip red" style="margin-left:4px">${hotMatches} hot</span>` : ''}</a></div></div>

    <div class="grid grid-4 mb">
      ${kpi('Open jobs', openJobs.length, '#6455FF', openJobs.filter((j) => j.priority === 'Urgent').length + ' urgent')}
      ${kpi('Active candidates', activeCands.length, '#007BFF', S.candidates.length + ' total in database')}
      ${kpi('Pipeline value', fmt(pipeValue), '#FF9D28', S.deals.filter((d) => d.stage === 'Won').length + ' deals won')}
      ${kpi('Placement fees', fmt(fees), '#1FA36B', S.placements.length + ' placements')}
    </div>

    <div class="grid grid-2 mb">
      <div class="card card-pad"><h2>Pipeline by stage</h2><canvas id="chStage" style="width:100%;height:200px" class="mt"></canvas></div>
      <div class="card card-pad"><h2>Fees by owner</h2>
        <div class="mt">${lb.map((r, i) => `<div class="lb-row"><span class="lb-rank">#${i + 1}</span><span class="flex">${avatar(r.u.name, 26)} ${esc(r.u.name)}</span><span><b>${fmt(r.fees)}</b></span><span class="muted">${r.placements} placed</span></div>`).join('')}</div>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card card-pad"><div class="page-head" style="margin-bottom:8px"><h2>Tasks due</h2><a href="#/tasks" class="btn btn-ghost btn-sm">All tasks</a></div>
        ${openTasks.slice(0, 6).map((t) => `<div class="flex" style="padding:8px 0;border-bottom:1px solid #F3F3F1">
          <input type="checkbox" data-task="${t.id}"> <div style="flex:1"><div class="t-name">${esc(t.title)}</div><div class="t-sub">${userName(t.ownerId)} · due ${dueLabel(t.due)}</div></div>${priChip(t.priority)}</div>`).join('') || '<div class="empty">No open tasks</div>'}
      </div>
      <div class="card card-pad"><h2>Recent activity</h2>
        <ul class="timeline mt">${S.activities.slice(0, 7).map((a) => tlItem(a)).join('')}</ul>
      </div>
    </div>`;

  barChart($('#chStage'), stages, stageCounts);
  $$('input[data-task]').forEach((cb) => cb.onchange = () => mutate('tasks/' + cb.dataset.task, 'PUT', { done: true }).then(() => toast('Task completed')));
};
const kpi = (label, value, color, delta) => `<div class="card kpi"><div class="kpi-accent" style="background:${color}"></div><div class="kpi-label">${esc(label)}</div><div class="kpi-value">${value}</div><div class="kpi-delta up">${esc(delta || '')}</div></div>`;
const TL_ICONS = { note: '📝', email: '✉️', call: '📞', stage_change: '➡️', system: '⚡', placement: '🏆', task: '☑️' };
const tlItem = (a) => `<li><span class="tl-ic">${TL_ICONS[a.type] || '•'}</span><div><div class="tl-text">${esc(a.text)}</div><div class="tl-when">${esc(userName(a.userId))} · ${timeAgo(a.ts)}</div></div></li>`;

// =========================================================
// CANDIDATES
// =========================================================
routes.candidates = (id) => (id ? candidateDetail(id) : candidateList());

function candidateList() {
  const allSkills = [...new Set(S.candidates.flatMap((c) => c.skills || []))].sort();
  $('#view').innerHTML = `
    <div class="page-head"><div><h1>Candidates</h1><div class="sub">${S.candidates.length} in database</div></div>
      <div class="page-actions"><button class="btn btn-ghost" id="boolBtn">🔎 AI Boolean builder</button><button class="btn btn-primary" id="addCand">+ Add candidate</button></div></div>
    <div class="filter-bar">
      <input type="text" id="fSearch" placeholder="Search name, title, employer…">
      <select id="fSkill"><option value="">All skills</option>${allSkills.map((s) => `<option>${esc(s)}</option>`).join('')}</select>
      <select id="fStatus"><option value="">Any status</option><option>Active</option><option>Passive</option><option>Placed</option></select>
      <select id="fSource"><option value="">Any source</option>${[...new Set(S.candidates.map((c) => c.source))].map((s) => `<option>${esc(s)}</option>`).join('')}</select>
      <span class="count-note" id="fCount"></span>
    </div>
    ${aiBlock('boolOut')}
    <div class="card"><table class="data"><thead><tr><th>Candidate</th><th>Skills</th><th>Location</th><th>Exp</th><th>Expectation</th><th>Status</th><th>Owner</th><th>Rating</th></tr></thead><tbody id="candRows"></tbody></table></div>`;

  const draw = () => {
    const q = $('#fSearch').value.toLowerCase(), sk = $('#fSkill').value, st = $('#fStatus').value, so = $('#fSource').value;
    const rows = S.candidates.filter((c) =>
      (!q || (c.name + c.title + c.currentEmployer + (c.skills || []).join(' ')).toLowerCase().includes(q)) &&
      (!sk || (c.skills || []).includes(sk)) && (!st || c.status === st) && (!so || c.source === so));
    $('#fCount').textContent = rows.length + ' shown';
    $('#candRows').innerHTML = rows.map((c) => `<tr class="row-click" onclick="location.hash='#/candidates/${c.id}'">
      <td><div class="flex">${avatar(c.name)}<div><div class="t-name">${esc(c.name)}</div><div class="t-sub">${esc(c.title)} @ ${esc(c.currentEmployer)}</div></div></div></td>
      <td>${(c.skills || []).slice(0, 3).map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</td>
      <td>${esc(c.location)}</td><td>${c.experienceYears}y</td><td>${fmt(c.salaryExpectation)}</td>
      <td><span class="chip ${c.status === 'Active' ? 'green' : c.status === 'Placed' ? 'violet' : 'grey'}">${esc(c.status)}</span></td>
      <td>${esc(userName(c.ownerId))}</td><td><span class="stars">${'★'.repeat(c.rating || 0)}${'☆'.repeat(5 - (c.rating || 0))}</span></td></tr>`).join('') || '<tr><td colspan="8"><div class="empty">No candidates match</div></td></tr>';
  };
  ['fSearch', 'fSkill', 'fStatus', 'fSource'].forEach((i) => ($('#' + i).oninput = draw));
  draw();
  $('#addCand').onclick = () => candidateForm();
  $('#boolBtn').onclick = (e) => {
    const sk = $('#fSkill').value, q = $('#fSearch').value;
    runAiInto('boolOut', 'boolean', { title: q || 'recruiter search', skills: sk ? [sk] : allSkills.slice(0, 4), location: '' }, e.currentTarget);
  };
}

function candidateForm(existing) {
  const c = existing || {};
  const m = openModal(existing ? 'Edit candidate' : 'Add candidate', `<div class="form-grid">
    <div class="full"><label>Full name</label><input name="name" value="${esc(c.name || '')}"></div>
    <div><label>Title</label><input name="title" value="${esc(c.title || '')}"></div>
    <div><label>Current employer</label><input name="currentEmployer" value="${esc(c.currentEmployer || '')}"></div>
    <div><label>Location</label><input name="location" value="${esc(c.location || 'Singapore')}"></div>
    <div><label>Experience (years)</label><input name="experienceYears" type="number" value="${c.experienceYears || 3}"></div>
    <div><label>Salary expectation (SGD)</label><input name="salaryExpectation" type="number" value="${c.salaryExpectation || 80000}"></div>
    <div><label>Notice period</label><select name="noticePeriod">${['Immediate', '1 month', '2 months', '3 months'].map((n) => `<option ${c.noticePeriod === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    <div><label>Email</label><input name="email" value="${esc(c.email || '')}"></div>
    <div><label>Phone</label><input name="phone" value="${esc(c.phone || '')}"></div>
    <div><label>Source</label><select name="source">${['LinkedIn', 'Job Board', 'Referral', 'GitHub', 'Headhunted', 'Career Site'].map((s) => `<option ${c.source === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    <div><label>Status</label><select name="status">${['Active', 'Passive', 'Placed'].map((s) => `<option ${c.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    <div class="full"><label>Skills (comma-separated)</label><input name="skillsRaw" value="${esc((c.skills || []).join(', '))}"></div>
    <div class="full"><label>Summary</label><textarea name="summary" rows="3">${esc(c.summary || '')}</textarea></div>
  </div>`, [
    { label: existing ? 'Save' : 'Add candidate', onClick: async (modal) => {
      const v = formVal(modal);
      v.skills = v.skillsRaw.split(',').map((s) => s.trim()).filter(Boolean); delete v.skillsRaw;
      v.experienceYears = +v.experienceYears; v.salaryExpectation = +v.salaryExpectation;
      if (!v.name) return toast('Name required', true);
      if (existing) await mutate('candidates/' + existing.id, 'PUT', v);
      else { v.ownerId = S.settings.currentUserId; v.rating = 3; v.currency = 'SGD'; v.tags = []; v.workHistory = []; await mutate('candidates', 'POST', v); await api('log', 'POST', { type: 'system', text: 'Candidate added: ' + v.name }); await refresh(); render(); }
      closeModal(); toast(existing ? 'Candidate updated' : 'Candidate added');
    } },
  ]);
  return m;
}

function candidateDetail(id) {
  const c = byId('candidates', id);
  if (!c.id) return (location.hash = '#/candidates');
  const apps = S.applications.filter((a) => a.candidateId === id);
  const acts = S.activities.filter((a) => a.relatedType === 'candidate' && a.relatedId === id);
  const matches = S.marketMatches.filter((m) => m.candidateId === id).slice(0, 5);

  $('#view').innerHTML = `
    <a class="back-link" href="#/candidates">← All candidates</a>
    <div class="page-head"><div class="flex" style="gap:14px">${avatar(c.name, 52)}
      <div><h1>${esc(c.name)}</h1><div class="sub">${esc(c.title)} @ ${esc(c.currentEmployer)} · ${esc(c.location)} · <span class="stars">${'★'.repeat(c.rating || 0)}</span></div></div></div>
      <div class="page-actions">
        <button class="btn btn-ghost" id="aiSummary">✨ AI summary</button>
        <button class="btn btn-ghost" id="aiEmail">✉️ AI outreach</button>
        <button class="btn btn-blue" id="findMatches">🛰️ Market matches</button>
        <button class="btn btn-ghost" id="editCand">Edit</button>
        <button class="btn btn-danger btn-sm" id="delCand">Delete</button>
      </div></div>
    ${aiBlock('candAi')}
    <div class="detail mt">
      <div>
        <div class="card card-pad mb"><h2>Profile</h2><dl class="field-list mt">
          <dt>Email</dt><dd>${esc(c.email)}</dd><dt>Phone</dt><dd>${esc(c.phone)}</dd>
          <dt>LinkedIn</dt><dd>${esc(c.linkedin || '—')}</dd><dt>Experience</dt><dd>${c.experienceYears} years</dd>
          <dt>Expectation</dt><dd>${fmt(c.salaryExpectation)}</dd><dt>Notice</dt><dd>${esc(c.noticePeriod)}</dd>
          <dt>Source</dt><dd>${esc(c.source)}</dd><dt>Owner</dt><dd>${esc(userName(c.ownerId))}</dd>
          <dt>Status</dt><dd><span class="chip ${c.status === 'Active' ? 'green' : 'grey'}">${esc(c.status)}</span></dd>
          <dt>Education</dt><dd>${esc(c.education || '—')}</dd></dl>
          <div class="mt">${(c.skills || []).map((s) => `<span class="chip violet">${esc(s)}</span>`).join('')}</div>
          <p class="mt" style="font-size:13px;color:#3c3f52">${esc(c.summary || '')}</p>
        </div>
        <div class="card card-pad mb"><h2>Work history</h2>
          ${(c.workHistory || []).map((w) => `<div style="padding:8px 0;border-bottom:1px solid #F3F3F1"><div class="t-name">${esc(w.title)}</div><div class="t-sub">${esc(w.company)} · ${w.from}–${w.to}</div></div>`).join('') || '<div class="empty">None recorded</div>'}
        </div>
        <div class="card card-pad"><div class="page-head" style="margin-bottom:6px"><h2>Timeline</h2><button class="btn btn-ghost btn-sm" id="addNote">+ Note</button></div>
          <ul class="timeline">${acts.map(tlItem).join('') || '<div class="empty">No activity yet</div>'}</ul></div>
      </div>
      <div>
        <div class="card card-pad mb"><h2>In pipelines (${apps.length})</h2>
          ${apps.map((a) => { const j = byId('jobs', a.jobId); return `<div style="padding:9px 0;border-bottom:1px solid #F3F3F1"><a href="#/jobs/${j.id}" class="t-name">${esc(j.title)}</a><div class="t-sub">${esc(compName(j.companyId))}</div><span class="chip violet">${esc(a.stage)}</span></div>`; }).join('') || '<div class="empty">Not in any pipeline</div>'}
          <button class="btn btn-ghost btn-sm mt" id="addToJob">+ Add to job</button>
        </div>
        <div class="card card-pad"><h2>Live market matches</h2>
          ${matches.map((m) => { const mj = S.marketJobs.find((x) => x.id === m.marketJobId) || {}; return `<div style="padding:9px 0;border-bottom:1px solid #F3F3F1"><div class="flex" style="justify-content:space-between"><span class="t-name">${esc(mj.title || '(expired fetch)')}</span><span class="score-ring ${scoreClass(m.score)}">${m.score}</span></div><div class="t-sub">${esc(mj.company || '')} · ${esc(mj.source || '')}</div></div>`; }).join('') || '<div class="empty">Run Market Match to see live-market fit</div>'}
        </div>
      </div>
    </div>`;

  $('#aiSummary').onclick = (e) => runAiInto('candAi', 'summary', { candidate: c }, e.currentTarget);
  $('#aiEmail').onclick = (e) => runAiInto('candAi', 'email', { candidate: c, kind: 'outreach' }, e.currentTarget);
  $('#editCand').onclick = () => candidateForm(c);
  $('#delCand').onclick = () => { if (confirm('Delete ' + c.name + '?')) mutate('candidates/' + id, 'DELETE').then(() => { location.hash = '#/candidates'; toast('Deleted'); }); };
  $('#findMatches').onclick = async (e) => {
    const btn = e.currentTarget; btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Matching…';
    try {
      if (!S.marketJobs.length) await api('market/fetch', 'POST', { sources: ['remoteok', 'arbeitnow', 'linkedin', 'indeed', 'mycareersfuture'], query: '' });
      await api('market/match', 'POST', { candidateId: id, minScore: 30 });
      await refresh(); render(); toast('Market match complete');
    } catch (err) { toast(err.message, true); btn.disabled = false; btn.textContent = '🛰️ Market matches'; }
  };
  $('#addNote').onclick = () => openModal('Add note', `<textarea name="text" rows="4" style="width:100%" placeholder="Note about ${esc(c.name)}…"></textarea>`, [
    { label: 'Save note', onClick: async (modal) => { const v = formVal(modal); if (!v.text) return; await api('log', 'POST', { type: 'note', text: v.text, relatedType: 'candidate', relatedId: id }); await refresh(); closeModal(); render(); } },
  ]);
  $('#addToJob').onclick = () => {
    const open = S.jobs.filter((j) => j.status === 'Open' && !apps.some((a) => a.jobId === j.id));
    openModal('Add to job pipeline', `<label>Job</label><select name="jobId" style="width:100%">${open.map((j) => `<option value="${j.id}">${esc(j.title)} — ${esc(compName(j.companyId))}</option>`).join('')}</select>`, [
      { label: 'Add to pipeline', onClick: async (modal) => {
        const v = formVal(modal); if (!v.jobId) return;
        await api('applications', 'POST', { jobId: v.jobId, candidateId: id, stage: 'Sourced', addedAt: new Date().toISOString(), stageChangedAt: new Date().toISOString() });
        await api('log', 'POST', { type: 'stage_change', text: `${c.name} added to ${byId('jobs', v.jobId).title} (Sourced)`, relatedType: 'candidate', relatedId: id });
        await refresh(); closeModal(); render(); toast('Added to pipeline');
      } },
    ]);
  };
}

// =========================================================
// JOBS
// =========================================================
routes.jobs = (id) => (id ? jobDetail(id) : jobList());

function jobList() {
  $('#view').innerHTML = `
    <div class="page-head"><div><h1>Jobs</h1><div class="sub">${S.jobs.filter((j) => j.status === 'Open').length} open of ${S.jobs.length}</div></div>
      <div class="page-actions"><button class="btn btn-primary" id="addJob">+ Add job</button></div></div>
    <div class="card"><table class="data"><thead><tr><th>Job</th><th>Company</th><th>Pipeline</th><th>Salary band</th><th>Priority</th><th>Status</th><th>Owner</th><th>Age</th></tr></thead><tbody>
      ${S.jobs.map((j) => { const n = S.applications.filter((a) => a.jobId === j.id).length; return `<tr class="row-click" onclick="location.hash='#/jobs/${j.id}'">
        <td><div class="t-name">${esc(j.title)}</div><div class="t-sub">${esc(j.location)} · ${esc(j.type)} · ${j.openings} opening(s)${j.importedFrom ? ` · <span class="chip grey">from ${esc(j.importedFrom)}</span>` : ''}</div></td>
        <td>${esc(compName(j.companyId))}</td><td><b>${n}</b> candidates</td>
        <td>${j.salaryMin ? fmt(j.salaryMin) + '–' + fmt(j.salaryMax) : '—'}</td>
        <td>${priChip(j.priority)}</td>
        <td><span class="chip ${j.status === 'Open' ? 'green' : 'grey'}">${esc(j.status)}</span></td>
        <td>${esc(userName(j.ownerId))}</td><td>${timeAgo(j.createdAt)}</td></tr>`; }).join('')}
    </tbody></table></div>`;
  $('#addJob').onclick = () => jobForm();
}

function jobForm(existing) {
  const j = existing || {};
  openModal(existing ? 'Edit job' : 'Add job', `<div class="form-grid">
    <div class="full"><label>Job title</label><input name="title" value="${esc(j.title || '')}"></div>
    <div><label>Company</label><select name="companyId">${S.companies.map((co) => `<option value="${co.id}" ${j.companyId === co.id ? 'selected' : ''}>${esc(co.name)}</option>`).join('')}</select></div>
    <div><label>Location</label><input name="location" value="${esc(j.location || 'Singapore')}"></div>
    <div><label>Salary min</label><input name="salaryMin" type="number" value="${j.salaryMin || 60000}"></div>
    <div><label>Salary max</label><input name="salaryMax" type="number" value="${j.salaryMax || 90000}"></div>
    <div><label>Type</label><select name="type">${['Permanent', 'Contract', 'Temp'].map((t) => `<option ${j.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    <div><label>Priority</label><select name="priority">${['Urgent', 'High', 'Medium', 'Low'].map((p) => `<option ${j.priority === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
    <div><label>Openings</label><input name="openings" type="number" value="${j.openings || 1}"></div>
    <div><label>Fee %</label><input name="fee" type="number" value="${j.fee || 20}"></div>
    <div class="full"><label>Skills (comma-separated)</label><input name="skillsRaw" value="${esc((j.skills || []).join(', '))}"></div>
    <div class="full"><label>Description</label><textarea name="description" rows="4">${esc(j.description || '')}</textarea></div>
  </div>`, [
    { label: '✨ AI-write description', cls: 'btn-ghost', onClick: async (modal) => {
      const v = formVal(modal);
      const btn = $('[data-mbtn="0"]', modal.parentElement); btn.innerHTML = '<span class="spin"></span> Writing…';
      try { const r = await aiCall('jd', { title: v.title, skills: v.skillsRaw.split(',').map((s) => s.trim()).filter(Boolean), location: v.location, job: { salaryMin: +v.salaryMin, salaryMax: +v.salaryMax, type: v.type } }); $('[name=description]', modal).value = r.text; } catch (e) { toast(e.message, true); }
      btn.textContent = '✨ AI-write description';
    } },
    { label: existing ? 'Save' : 'Create job', onClick: async (modal) => {
      const v = formVal(modal);
      if (!v.title) return toast('Title required', true);
      v.skills = v.skillsRaw.split(',').map((s) => s.trim()).filter(Boolean); delete v.skillsRaw;
      ['salaryMin', 'salaryMax', 'openings', 'fee'].forEach((k) => (v[k] = +v[k]));
      if (existing) await mutate('jobs/' + existing.id, 'PUT', v);
      else { v.status = 'Open'; v.ownerId = S.settings.currentUserId; await mutate('jobs', 'POST', v); }
      closeModal(); toast('Saved');
    } },
  ], true);
}

function jobDetail(id) {
  const j = byId('jobs', id);
  if (!j.id) return (location.hash = '#/jobs');
  const stages = S.settings.stages;
  const apps = S.applications.filter((a) => a.jobId === id);

  $('#view').innerHTML = `
    <a class="back-link" href="#/jobs">← All jobs</a>
    <div class="page-head"><div><h1>${esc(j.title)}</h1>
      <div class="sub">${esc(compName(j.companyId))} · ${esc(j.location)} · ${j.salaryMin ? fmt(j.salaryMin) + '–' + fmt(j.salaryMax) : 'salary TBC'} · fee ${j.fee}% · ${priChip(j.priority)} <span class="chip ${j.status === 'Open' ? 'green' : 'grey'}">${esc(j.status)}</span></div></div>
      <div class="page-actions">
        <button class="btn btn-ghost" id="aiJd">✨ AI job description</button>
        <button class="btn btn-blue" id="suggestCands">🎯 Suggest candidates</button>
        <button class="btn btn-ghost" id="editJob">Edit</button>
        <select id="jobStatus">${['Open', 'On Hold', 'Closed'].map((s) => `<option ${j.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
      </div></div>
    ${aiBlock('jobAi')}
    <div class="card card-pad mb mt"><h2>Description</h2><p style="font-size:13px;white-space:pre-wrap;color:#3c3f52;margin-top:6px">${esc(j.description || 'No description yet.')}</p>
      <div class="mt">${(j.skills || []).map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</div></div>
    <h2 class="mb">Pipeline — drag candidates between stages</h2>
    <div class="kanban" id="jobKanban">
      ${stages.map((st) => `<div class="kb-col" data-stage="${esc(st)}">
        <div class="kb-head">${esc(st)} <span class="kb-count">${apps.filter((a) => a.stage === st).length}</span></div>
        ${apps.filter((a) => a.stage === st).map((a) => { const c = byId('candidates', a.candidateId); return `<div class="kb-card" draggable="true" data-app="${a.id}">
          <div class="kb-title">${esc(c.name)}</div><div class="kb-sub">${esc(c.title)} · ${esc(c.location)}</div>
          <div class="kb-meta"><span class="t-sub">${timeAgo(a.stageChangedAt)}</span><a href="#/candidates/${c.id}" onclick="event.stopPropagation()">view</a></div></div>`; }).join('')}
      </div>`).join('')}
    </div>`;

  setupKanban('#jobKanban', async (appId, newStage) => {
    const a = S.applications.find((x) => x.id === appId);
    const c = byId('candidates', a.candidateId);
    await api('applications/' + appId, 'PUT', { stage: newStage, stageChangedAt: new Date().toISOString() });
    await api('log', 'POST', { type: 'stage_change', text: `Moved ${c.name} to ${newStage} — ${j.title}`, relatedType: 'job', relatedId: id });
    if (newStage === 'Placed') {
      await api('placements', 'POST', { candidateId: c.id, jobTitle: j.title, companyId: j.companyId, fee: Math.round(((j.salaryMin + j.salaryMax) / 2) * (j.fee / 100)) || 15000, startDate: new Date().toISOString(), ownerId: S.settings.currentUserId });
      await api('candidates/' + c.id, 'PUT', { status: 'Placed' });
      toast('🏆 Placement recorded for ' + c.name);
    }
    await refresh(); render();
  });

  $('#aiJd').onclick = (e) => runAiInto('jobAi', 'jd', { title: j.title, skills: j.skills, location: j.location, job: j }, e.currentTarget);
  $('#editJob').onclick = () => jobForm(j);
  $('#jobStatus').onchange = (e) => mutate('jobs/' + id, 'PUT', { status: e.target.value }).then(() => toast('Status updated'));
  $('#suggestCands').onclick = () => {
    const inPipe = new Set(apps.map((a) => a.candidateId));
    const scored = S.candidates.filter((c) => !inPipe.has(c.id) && c.status !== 'Placed')
      .map((c) => ({ c, m: clientMatch(c, j) })).filter((x) => x.m.score >= 35).sort((a, b) => b.m.score - a.m.score).slice(0, 10);
    openModal('Suggested candidates — ' + j.title, scored.length ? scored.map((x) => `
      <div class="flex" style="justify-content:space-between;padding:9px 0;border-bottom:1px solid #F3F3F1">
        <div class="flex">${avatar(x.c.name, 30)}<div><div class="t-name">${esc(x.c.name)}</div><div class="t-sub">${esc(x.c.title)} · ${esc(x.c.location)} · matched: ${x.m.matchedSkills.slice(0, 3).map(esc).join(', ') || 'title fit'}</div></div></div>
        <div class="flex"><span class="score-ring ${scoreClass(x.m.score)}">${x.m.score}</span><button class="btn btn-primary btn-sm" data-add="${x.c.id}">Add</button></div>
      </div>`).join('') : '<div class="empty">No candidates scored above threshold</div>', [{ label: 'Done', cls: 'btn-ghost', onClick: closeModal }], true);
    $$('#modalRoot [data-add]').forEach((b) => b.onclick = async () => {
      await api('applications', 'POST', { jobId: id, candidateId: b.dataset.add, stage: 'Sourced', addedAt: new Date().toISOString(), stageChangedAt: new Date().toISOString() });
      b.textContent = '✓ Added'; b.disabled = true;
      await refresh();
    });
  };
}

// client-side match (mirror of server logic, simplified)
function clientMatch(c, j) {
  const cs = (c.skills || []).map((s) => s.toLowerCase());
  const js = (j.skills || []).map((s) => s.toLowerCase());
  const matched = js.filter((s) => cs.some((x) => x === s || x.includes(s) || s.includes(x)));
  const skillScore = js.length ? matched.length / js.length : 0;
  const tw = (t) => t.toLowerCase().split(/\s+/).filter((w) => !['senior', 'junior', 'lead', 'staff', '—', '-'].includes(w));
  const ta = tw(c.title || ''), tb = new Set(tw(j.title || ''));
  const titleScore = ta.length ? ta.filter((w) => tb.has(w)).length / Math.max(ta.length, tb.size) : 0;
  const loc = (c.location || '').toLowerCase().includes((j.location || 'x').toLowerCase().split(/[\/,]/)[0].trim()) || (j.location || '').toLowerCase().includes('remote') ? 1 : 0.3;
  const sal = !j.salaryMax || c.salaryExpectation <= j.salaryMax * 1.05 ? 1 : 0.3;
  return { score: Math.round(100 * (0.5 * skillScore + 0.25 * titleScore + 0.15 * loc + 0.1 * sal)), matchedSkills: matched };
}

// generic kanban DnD
function setupKanban(rootSel, onDrop) {
  const root = $(rootSel);
  $$('.kb-card', root).forEach((card) => {
    card.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', card.dataset.app || card.dataset.deal); card.classList.add('dragging'); });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
  });
  $$('.kb-col', root).forEach((col) => {
    col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', (e) => { e.preventDefault(); col.classList.remove('drag-over'); onDrop(e.dataTransfer.getData('text/plain'), col.dataset.stage); });
  });
}

// =========================================================
// COMPANIES / CONTACTS
// =========================================================
routes.companies = (id) => (id ? companyDetail(id) : companyList());
function companyList() {
  $('#view').innerHTML = `
    <div class="page-head"><div><h1>Companies</h1><div class="sub">${S.companies.length} accounts</div></div>
      <div class="page-actions"><button class="btn btn-primary" id="addCo">+ Add company</button></div></div>
    <div class="card"><table class="data"><thead><tr><th>Company</th><th>Industry</th><th>Location</th><th>Tier</th><th>Hiring signal</th><th>Open jobs</th><th>Owner</th></tr></thead><tbody>
      ${S.companies.map((co) => `<tr class="row-click" onclick="location.hash='#/companies/${co.id}'">
        <td><div class="flex">${avatar(co.name)}<div><div class="t-name">${esc(co.name)}</div><div class="t-sub">${esc(co.website)}</div></div></div></td>
        <td>${esc(co.industry)}</td><td>${esc(co.location)}</td>
        <td><span class="chip ${co.tier === 'A' ? 'violet' : co.tier === 'B' ? '' : 'grey'}">Tier ${esc(co.tier)}</span></td>
        <td class="t-sub" style="max-width:260px">${esc(co.signal || '')}</td>
        <td><b>${S.jobs.filter((jj) => jj.companyId === co.id && jj.status === 'Open').length}</b></td>
        <td>${esc(userName(co.ownerId))}</td></tr>`).join('')}
    </tbody></table></div>`;
  $('#addCo').onclick = () => openModal('Add company', `<div class="form-grid">
      <div class="full"><label>Name</label><input name="name"></div>
      <div><label>Industry</label><input name="industry"></div><div><label>Location</label><input name="location" value="Singapore"></div>
      <div><label>Size</label><input name="size" value="50-200"></div><div><label>Tier</label><select name="tier"><option>A</option><option>B</option><option selected>C</option></select></div>
      <div class="full"><label>Hiring signal</label><input name="signal"></div></div>`, [
    { label: 'Add company', onClick: async (modal) => { const v = formVal(modal); if (!v.name) return; v.ownerId = S.settings.currentUserId; await mutate('companies', 'POST', v); closeModal(); toast('Company added'); } },
  ]);
}
function companyDetail(id) {
  const co = byId('companies', id);
  if (!co.id) return (location.hash = '#/companies');
  const contacts = S.contacts.filter((c) => c.companyId === id);
  const jobs = S.jobs.filter((j) => j.companyId === id);
  const deals = S.deals.filter((d) => d.companyId === id);
  $('#view').innerHTML = `
    <a class="back-link" href="#/companies">← All companies</a>
    <div class="page-head"><div class="flex" style="gap:14px">${avatar(co.name, 52)}<div><h1>${esc(co.name)}</h1>
      <div class="sub">${esc(co.industry)} · ${esc(co.location)} · ${esc(co.size)} staff · <span class="chip violet">Tier ${esc(co.tier)}</span></div></div></div></div>
    ${co.signal ? `<div class="card card-pad mb" style="border-left:3px solid var(--orange)"><b>📡 Hiring signal:</b> ${esc(co.signal)}</div>` : ''}
    <div class="grid grid-3">
      <div class="card card-pad"><h2>Contacts (${contacts.length})</h2>${contacts.map((c) => `<div style="padding:8px 0;border-bottom:1px solid #F3F3F1"><a class="t-name" href="#/contacts">${esc(c.name)}</a><div class="t-sub">${esc(c.title)} · ${esc(c.email)}</div><span class="chip ${c.temperature === 'Hot' ? 'red' : c.temperature === 'Warm' ? 'orange' : 'grey'}">${esc(c.temperature)}</span></div>`).join('') || '<div class="empty">None</div>'}</div>
      <div class="card card-pad"><h2>Jobs (${jobs.length})</h2>${jobs.map((jj) => `<div style="padding:8px 0;border-bottom:1px solid #F3F3F1"><a class="t-name" href="#/jobs/${jj.id}">${esc(jj.title)}</a><div class="t-sub">${S.applications.filter((a) => a.jobId === jj.id).length} in pipeline · ${esc(jj.status)}</div></div>`).join('') || '<div class="empty">None</div>'}</div>
      <div class="card card-pad"><h2>Deals (${deals.length})</h2>${deals.map((d) => `<div style="padding:8px 0;border-bottom:1px solid #F3F3F1"><div class="t-name">${esc(d.name)}</div><div class="t-sub">${fmt(d.value)} · ${esc(d.stage)}</div></div>`).join('') || '<div class="empty">None</div>'}</div>
    </div>`;
}

routes.contacts = () => {
  $('#view').innerHTML = `
    <div class="page-head"><div><h1>Contacts</h1><div class="sub">${S.contacts.length} client contacts</div></div>
      <div class="page-actions"><button class="btn btn-primary" id="addCt">+ Add contact</button></div></div>
    <div class="card"><table class="data"><thead><tr><th>Contact</th><th>Company</th><th>Email</th><th>Phone</th><th>Temperature</th><th>Owner</th><th></th></tr></thead><tbody>
      ${S.contacts.map((c) => `<tr>
        <td><div class="flex">${avatar(c.name)}<div><div class="t-name">${esc(c.name)}</div><div class="t-sub">${esc(c.title)}</div></div></div></td>
        <td><a href="#/companies/${c.companyId}">${esc(compName(c.companyId))}</a></td>
        <td>${esc(c.email)}</td><td>${esc(c.phone)}</td>
        <td><span class="chip ${c.temperature === 'Hot' ? 'red' : c.temperature === 'Warm' ? 'orange' : 'grey'}">${esc(c.temperature)}</span></td>
        <td>${esc(userName(c.ownerId))}</td>
        <td><button class="btn btn-ghost btn-sm" data-email="${c.id}">✨ AI email</button></td></tr>`).join('')}
    </tbody></table></div>
    ${aiBlock('ctAi')}`;
  $('#addCt').onclick = () => openModal('Add contact', `<div class="form-grid">
      <div class="full"><label>Name</label><input name="name"></div>
      <div><label>Title</label><input name="title"></div>
      <div><label>Company</label><select name="companyId">${S.companies.map((co) => `<option value="${co.id}">${esc(co.name)}</option>`).join('')}</select></div>
      <div><label>Email</label><input name="email"></div><div><label>Phone</label><input name="phone"></div>
      <div><label>Temperature</label><select name="temperature"><option>Hot</option><option selected>Warm</option><option>Cold</option></select></div></div>`, [
    { label: 'Add contact', onClick: async (modal) => { const v = formVal(modal); if (!v.name) return; v.ownerId = S.settings.currentUserId; await mutate('contacts', 'POST', v); closeModal(); toast('Contact added'); } },
  ]);
  $$('[data-email]').forEach((b) => b.onclick = (e) => {
    const ct = byId('contacts', b.dataset.email);
    runAiInto('ctAi', 'email', { kind: 'bd', recipientName: ct.name, candidate: { name: ct.name, skills: [], currentEmployer: compName(ct.companyId) }, job: { title: 'partnership on hiring at ' + compName(ct.companyId) } }, e.currentTarget);
    $('#ctAi').scrollIntoView({ behavior: 'smooth' });
  });
};

// =========================================================
// DEALS
// =========================================================
routes.deals = () => {
  const stages = S.settings.dealStages;
  const total = S.deals.filter((d) => !['Won', 'Lost'].includes(d.stage)).reduce((s, d) => s + d.value, 0);
  $('#view').innerHTML = `
    <div class="page-head"><div><h1>Deals</h1><div class="sub">Open pipeline ${fmt(total)} · weighted ${fmt(S.deals.filter((d) => !['Won', 'Lost'].includes(d.stage)).reduce((s, d) => s + d.value * (d.probability || 0) / 100, 0))}</div></div>
      <div class="page-actions"><button class="btn btn-primary" id="addDeal">+ Add deal</button></div></div>
    <div class="kanban" id="dealKanban">
      ${stages.map((st) => { const list = S.deals.filter((d) => d.stage === st); return `<div class="kb-col" data-stage="${esc(st)}">
        <div class="kb-head">${esc(st)} <span class="kb-count">${fmt(list.reduce((s, d) => s + d.value, 0))}</span></div>
        ${list.map((d) => `<div class="kb-card" draggable="true" data-deal="${d.id}">
          <div class="kb-title">${esc(d.name)}</div>
          <div class="kb-sub">${esc(compName(d.companyId))} · ${esc(byId('contacts', d.contactId).name || '')}</div>
          <div class="kb-meta"><span class="kb-value">${fmt(d.value)}</span><span class="t-sub">${d.probability || 0}%</span></div>
          <div class="t-sub" style="margin-top:6px">↪ ${esc(d.nextStep || '')}</div>
        </div>`).join('')}
      </div>`; }).join('')}
    </div>`;
  setupKanban('#dealKanban', async (dealId, newStage) => {
    const d = S.deals.find((x) => x.id === dealId);
    const prob = { Lead: 10, Contacted: 25, Meeting: 50, Proposal: 70, Won: 100, Lost: 0 }[newStage];
    await api('deals/' + dealId, 'PUT', { stage: newStage, probability: prob });
    await api('log', 'POST', { type: 'stage_change', text: `Deal "${d.name}" moved to ${newStage}`, relatedType: 'deal', relatedId: dealId });
    await refresh(); render();
    if (newStage === 'Won') toast('🎉 Deal won: ' + d.name);
  });
  $('#addDeal').onclick = () => openModal('Add deal', `<div class="form-grid">
      <div class="full"><label>Deal name</label><input name="name" placeholder="Company — engagement"></div>
      <div><label>Company</label><select name="companyId">${S.companies.map((co) => `<option value="${co.id}">${esc(co.name)}</option>`).join('')}</select></div>
      <div><label>Contact</label><select name="contactId">${S.contacts.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
      <div><label>Value (SGD)</label><input name="value" type="number" value="50000"></div>
      <div><label>Stage</label><select name="stage">${S.settings.dealStages.slice(0, 4).map((s) => `<option>${s}</option>`).join('')}</select></div>
      <div class="full"><label>Next step</label><input name="nextStep"></div></div>`, [
    { label: 'Add deal', onClick: async (modal) => { const v = formVal(modal); if (!v.name) return; v.value = +v.value; v.ownerId = S.settings.currentUserId; v.probability = 10; await mutate('deals', 'POST', v); closeModal(); toast('Deal added'); } },
  ]);
};

// =========================================================
// SEQUENCES
// =========================================================
routes.sequences = (id) => (id ? sequenceDetail(id) : sequenceList());
const CH_ICON = { email: '✉️', linkedin: '💼', call: '📞', sms: '💬' };
function sequenceList() {
  $('#view').innerHTML = `
    <div class="page-head"><div><h1>Sequences</h1><div class="sub">Multichannel outreach — email, LinkedIn, calls</div></div>
      <div class="page-actions"><button class="btn btn-primary" id="addSeq">+ New sequence</button></div></div>
    <div class="grid grid-3">
      ${S.sequences.map((s) => { const rate = s.stats.sent ? Math.round((s.stats.replied / s.stats.sent) * 100) : 0; return `
      <div class="card card-pad row-click" style="cursor:pointer" onclick="location.hash='#/sequences/${s.id}'">
        <div class="flex" style="justify-content:space-between"><h2>${esc(s.name)}</h2><span class="chip ${s.active ? 'green' : 'grey'}">${s.active ? 'Active' : 'Paused'}</span></div>
        <div class="t-sub mt">${s.steps.length} steps · ${s.enrollments.length} enrolled · audience: ${esc(s.audience)}</div>
        <div class="mt">${s.steps.map((st) => `<span class="chip grey">${CH_ICON[st.channel] || ''} ${st.channel}${st.delayDays ? ' +' + st.delayDays + 'd' : ''}</span>`).join('')}</div>
        <div class="stat-strip mt">
          <div class="st"><b>${s.stats.sent}</b><span>sent</span></div>
          <div class="st"><b>${s.stats.opened}</b><span>opened</span></div>
          <div class="st"><b>${s.stats.replied}</b><span>replied</span></div>
          <div class="st"><b style="color:var(--green)">${rate}%</b><span>reply rate</span></div>
        </div>
      </div>`; }).join('')}
    </div>`;
  $('#addSeq').onclick = () => openModal('New sequence', `<div class="form-grid">
      <div class="full"><label>Name</label><input name="name" placeholder="e.g. Candidate outreach — cloud roles"></div>
      <div><label>Audience</label><select name="audience"><option>Candidates</option><option>Clients</option></select></div>
      <div><label>First-step channel</label><select name="channel"><option>email</option><option>linkedin</option><option>call</option></select></div>
      <div class="full"><label>Step 1 subject</label><input name="subject"></div>
      <div class="full"><label>Step 1 body — use {{first_name}}, {{top_skill}}, {{company}}, {{sender_name}}</label><textarea name="body" rows="5"></textarea></div></div>`, [
    { label: '✨ AI-write step', cls: 'btn-ghost', onClick: async (modal) => {
      const v = formVal(modal);
      const r = await aiCall('email', { kind: v.audience === 'Clients' ? 'bd' : 'outreach', candidate: { name: '{{first_name}}', skills: ['{{top_skill}}'] }, job: { title: v.name } });
      const txt = r.text; const sm = txt.match(/^Subject:\s*(.+)$/m);
      if (sm) $('[name=subject]', modal).value = sm[1];
      $('[name=body]', modal).value = txt.replace(/^Subject:.*\n+/, '');
    } },
    { label: 'Create sequence', onClick: async (modal) => {
      const v = formVal(modal); if (!v.name) return toast('Name required', true);
      await mutate('sequences', 'POST', { name: v.name, audience: v.audience, active: true, ownerId: S.settings.currentUserId, steps: [{ channel: v.channel, delayDays: 0, subject: v.subject, body: v.body }], enrollments: [], stats: { sent: 0, opened: 0, replied: 0, bounced: 0 } });
      closeModal(); toast('Sequence created');
    } },
  ], true);
}
function sequenceDetail(id) {
  const s = byId('sequences', id);
  if (!s.id) return (location.hash = '#/sequences');
  $('#view').innerHTML = `
    <a class="back-link" href="#/sequences">← All sequences</a>
    <div class="page-head"><div><h1>${esc(s.name)}</h1><div class="sub">${esc(s.audience)} · ${s.enrollments.length} enrolled</div></div>
      <div class="page-actions">
        <button class="btn btn-ghost" id="enroll">+ Enroll</button>
        <button class="switch ${s.active ? 'on' : ''}" id="seqToggle" title="Active"></button>
      </div></div>
    <div class="detail">
      <div class="card card-pad"><h2>Steps</h2>
        ${s.steps.map((st, i) => `<div class="seq-step"><span class="seq-ic">${CH_ICON[st.channel] || '•'}</span>
          <div style="flex:1"><div class="seq-delay">Step ${i + 1} · ${st.channel}${st.delayDays ? ` · day +${st.delayDays}` : ' · immediately'}</div>
          ${st.subject ? `<div class="t-name mt" style="margin-top:4px">${esc(st.subject)}</div>` : ''}
          <div class="seq-body">${esc(st.body)}</div></div></div>`).join('')}
        <button class="btn btn-ghost btn-sm mt" id="addStep">+ Add step</button>
      </div>
      <div>
        <div class="card card-pad mb"><h2>Performance</h2>
          <div class="stat-strip mt"><div class="st"><b>${s.stats.sent}</b><span>sent</span></div><div class="st"><b>${s.stats.opened}</b><span>opened</span></div><div class="st"><b>${s.stats.replied}</b><span>replied</span></div></div>
          <div class="mt"><div class="t-sub mb">Open rate</div><div class="bar"><div style="width:${s.stats.sent ? (s.stats.opened / s.stats.sent) * 100 : 0}%"></div></div></div>
          <div class="mt"><div class="t-sub mb">Reply rate</div><div class="bar"><div style="width:${s.stats.sent ? (s.stats.replied / s.stats.sent) * 100 : 0}%;background:var(--green)"></div></div></div>
        </div>
        <div class="card card-pad"><h2>Enrollments</h2>
          ${s.enrollments.map((e) => { const t = e.targetType === 'candidate' ? byId('candidates', e.targetId) : byId('contacts', e.targetId); return `<div style="padding:8px 0;border-bottom:1px solid #F3F3F1"><div class="t-name">${esc(t.name || '?')}</div><div class="t-sub">step ${e.currentStep}/${s.steps.length} · <span class="chip ${e.status === 'Replied' ? 'green' : e.status === 'Active' ? '' : 'grey'}">${esc(e.status)}</span></div></div>`; }).join('') || '<div class="empty">Nobody enrolled yet</div>'}
        </div>
      </div>
    </div>`;
  $('#seqToggle').onclick = () => mutate('sequences/' + id, 'PUT', { active: !s.active }).then(() => toast(s.active ? 'Sequence paused' : 'Sequence activated'));
  $('#addStep').onclick = () => openModal('Add step', `<div class="form-grid">
      <div><label>Channel</label><select name="channel"><option>email</option><option>linkedin</option><option>call</option></select></div>
      <div><label>Delay (days after previous)</label><input name="delayDays" type="number" value="3"></div>
      <div class="full"><label>Subject (email only)</label><input name="subject"></div>
      <div class="full"><label>Body</label><textarea name="body" rows="5"></textarea></div></div>`, [
    { label: 'Add step', onClick: async (modal) => { const v = formVal(modal); s.steps.push({ channel: v.channel, delayDays: +v.delayDays, subject: v.subject, body: v.body }); await mutate('sequences/' + id, 'PUT', { steps: s.steps }); closeModal(); } },
  ]);
  $('#enroll').onclick = () => {
    const pool = s.audience === 'Candidates' ? S.candidates : S.contacts;
    openModal('Enroll into sequence', `<label>Select ${s.audience.toLowerCase()}</label><select name="targetId" style="width:100%">${pool.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select>`, [
      { label: 'Enroll', onClick: async (modal) => {
        const v = formVal(modal);
        s.enrollments.push({ targetType: s.audience === 'Candidates' ? 'candidate' : 'contact', targetId: v.targetId, currentStep: 1, status: 'Active' });
        s.stats.sent += 1;
        await mutate('sequences/' + id, 'PUT', { enrollments: s.enrollments, stats: s.stats });
        await api('log', 'POST', { type: 'email', text: `Enrolled into sequence "${s.name}": step 1 queued`, relatedType: s.audience === 'Candidates' ? 'candidate' : 'contact', relatedId: v.targetId });
        closeModal(); toast('Enrolled — step 1 queued');
      } },
    ]);
  };
}

// =========================================================
// RECIPES (automation)
// =========================================================
routes.recipes = () => {
  $('#view').innerHTML = `
    <div class="page-head"><div><h1>Recipes</h1><div class="sub">Workflow automation — trigger → conditions → actions</div></div>
      <div class="page-actions"><button class="btn btn-primary" id="addRecipe">+ New recipe</button></div></div>
    ${S.recipes.map((r) => `<div class="card card-pad mb">
      <div class="flex" style="justify-content:space-between">
        <h2>${esc(r.name)}</h2>
        <div class="flex"><span class="t-sub">${r.runs} runs · last ${timeAgo(r.lastRun)}</span><button class="switch ${r.active ? 'on' : ''}" data-toggle="${r.id}"></button></div>
      </div>
      <div class="recipe-flow">
        <span class="rf-node">⚡ ${esc(r.trigger)}</span>
        ${(r.conditions || []).map((c) => `<span class="rf-arrow">→</span><span class="rf-node" style="background:#fff1de;color:#b56a00">❓ ${esc(c)}</span>`).join('')}
        ${(r.actions || []).map((a) => `<span class="rf-arrow">→</span><span class="rf-node action">▶ ${esc(a)}</span>`).join('')}
      </div>
    </div>`).join('')}`;
  $$('[data-toggle]').forEach((b) => b.onclick = () => { const r = byId('recipes', b.dataset.toggle); mutate('recipes/' + r.id, 'PUT', { active: !r.active }).then(() => toast(r.active ? 'Recipe paused' : 'Recipe activated')); });
  $('#addRecipe').onclick = () => openModal('New recipe', `<div class="form-grid">
      <div class="full"><label>Name</label><input name="name"></div>
      <div class="full"><label>Trigger</label><select name="trigger">
        <option>Candidate created</option><option>Application stage changed to Submitted</option><option>Application stage changed to Offer</option>
        <option>Deal has no activity for 14 days</option><option>Market Match run finds score ≥ 80</option><option>Sequence reply received</option></select></div>
      <div class="full"><label>Condition (optional)</label><input name="cond" placeholder="e.g. Job status is Open"></div>
      <div class="full"><label>Actions (one per line)</label><textarea name="actions" rows="3" placeholder="Create task for owner\nSend email template"></textarea></div></div>`, [
    { label: 'Create recipe', onClick: async (modal) => {
      const v = formVal(modal); if (!v.name) return;
      await mutate('recipes', 'POST', { name: v.name, trigger: v.trigger, conditions: v.cond ? [v.cond] : [], actions: v.actions.split('\n').filter(Boolean), active: true, runs: 0, lastRun: null });
      closeModal(); toast('Recipe created');
    } },
  ]);
};

// =========================================================
// TASKS
// =========================================================
routes.tasks = () => {
  const open = S.tasks.filter((t) => !t.done).sort((a, b) => new Date(a.due) - new Date(b.due));
  const done = S.tasks.filter((t) => t.done);
  const rel = (t) => t.relatedType === 'candidate' ? `<a href="#/candidates/${t.relatedId}">${esc(candName(t.relatedId))}</a>`
    : t.relatedType === 'job' ? `<a href="#/jobs/${t.relatedId}">${esc(byId('jobs', t.relatedId).title || '')}</a>`
    : t.relatedType === 'deal' ? esc((byId('deals', t.relatedId).name || '')) : '<span class="muted">—</span>';
  $('#view').innerHTML = `
    <div class="page-head"><div><h1>Tasks</h1><div class="sub">${open.length} open · ${done.length} done</div></div>
      <div class="page-actions"><button class="btn btn-primary" id="addTask">+ Add task</button></div></div>
    <div class="card"><table class="data"><thead><tr><th></th><th>Task</th><th>Related to</th><th>Priority</th><th>Owner</th><th>Due</th></tr></thead><tbody>
      ${open.map((t) => `<tr><td><input type="checkbox" data-task="${t.id}"></td><td class="t-name">${esc(t.title)}</td><td>${rel(t)}</td><td>${priChip(t.priority)}</td><td>${esc(userName(t.ownerId))}</td><td>${dueLabel(t.due)}</td></tr>`).join('')}
      ${done.map((t) => `<tr style="opacity:.5"><td>✓</td><td style="text-decoration:line-through">${esc(t.title)}</td><td>${rel(t)}</td><td>${priChip(t.priority)}</td><td>${esc(userName(t.ownerId))}</td><td>done</td></tr>`).join('')}
    </tbody></table></div>`;
  $$('input[data-task]').forEach((cb) => cb.onchange = () => mutate('tasks/' + cb.dataset.task, 'PUT', { done: true }).then(() => toast('Task completed')));
  $('#addTask').onclick = () => quickTaskModal();
};
function quickTaskModal() {
  openModal('Add task', `<div class="form-grid">
    <div class="full"><label>Task</label><input name="title"></div>
    <div><label>Due in (days)</label><input name="days" type="number" value="1"></div>
    <div><label>Priority</label><select name="priority"><option>Urgent</option><option selected>High</option><option>Medium</option><option>Low</option></select></div></div>`, [
    { label: 'Add task', onClick: async (modal) => {
      const v = formVal(modal); if (!v.title) return;
      await mutate('tasks', 'POST', { title: v.title, due: new Date(Date.now() + v.days * 86400000).toISOString(), done: false, priority: v.priority, relatedType: '', relatedId: '', ownerId: S.settings.currentUserId });
      closeModal(); toast('Task added');
    } },
  ]);
}

// =========================================================
// REPORTS
// =========================================================
routes.reports = () => {
  const fees = S.placements.reduce((s, p) => s + p.fee, 0);
  // fees by ~week bucket
  const weeks = [5, 4, 3, 2, 1, 0];
  const feeByWeek = weeks.map((w) => S.placements.filter((p) => { const d = (Date.now() - new Date(p.startDate)) / 86400000; return d >= w * 7 && d < (w + 1) * 7; }).reduce((s, p) => s + p.fee, 0));
  const srcCounts = {};
  S.candidates.forEach((c) => { srcCounts[c.source] = (srcCounts[c.source] || 0) + 1; });
  const srcEntries = Object.entries(srcCounts).map(([k, v], i) => ({ label: k, value: v, color: AVATAR_COLORS[i % AVATAR_COLORS.length] }));
  const stages = S.settings.stages;
  const funnel = stages.map((st, i) => S.applications.filter((a) => stages.indexOf(a.stage) >= i).length);
  const lb = S.users.map((u) => ({ u, fees: S.placements.filter((p) => p.ownerId === u.id).reduce((s, p) => s + p.fee, 0), placed: S.placements.filter((p) => p.ownerId === u.id).length, deals: S.deals.filter((d) => d.ownerId === u.id && d.stage === 'Won').length })).sort((a, b) => b.fees - a.fees);

  $('#view').innerHTML = `
    <div class="page-head"><div><h1>Reports</h1><div class="sub">FlowRecruit BI — placements, sources, conversion, leaderboard</div></div></div>
    <div class="grid grid-4 mb">
      ${kpi('Total fees booked', fmt(fees), '#6455FF', S.placements.length + ' placements')}
      ${kpi('Avg fee', fmt(S.placements.length ? Math.round(fees / S.placements.length) : 0), '#007BFF', 'per placement')}
      ${kpi('Win rate', Math.round((S.deals.filter((d) => d.stage === 'Won').length / Math.max(1, S.deals.filter((d) => ['Won', 'Lost'].includes(d.stage)).length)) * 100) + '%', '#1FA36B', 'of closed deals')}
      ${kpi('Submit→Place', Math.round((S.applications.filter((a) => a.stage === 'Placed').length + S.placements.length) / Math.max(1, S.applications.filter((a) => stages.indexOf(a.stage) >= 2).length) * 100) + '%', '#FF9D28', 'conversion')}
    </div>
    <div class="grid grid-2 mb">
      <div class="card card-pad"><h2>Fees by week (last 6 weeks)</h2><canvas id="chFees" style="width:100%;height:210px" class="mt"></canvas></div>
      <div class="card card-pad"><h2>Candidate source mix</h2>
        <div class="flex"><canvas id="chSrc" style="width:210px;height:210px" class="mt"></canvas>
        <div class="legend" style="flex-direction:column;align-items:flex-start">${srcEntries.map((e) => `<span class="lg"><span class="sw" style="background:${e.color}"></span>${esc(e.label)} — ${e.value}</span>`).join('')}</div></div>
      </div>
    </div>
    <div class="grid grid-2">
      <div class="card card-pad"><h2>Pipeline funnel</h2>
        <div class="mt">${stages.map((st, i) => `<div class="mb"><div class="flex" style="justify-content:space-between;font-size:12px"><b>${esc(st)}</b><span class="muted">${funnel[i]} candidates reached</span></div>
          <div class="bar mt" style="height:14px;margin-top:4px"><div style="width:${(funnel[i] / Math.max(1, funnel[0])) * 100}%;background:linear-gradient(90deg,var(--primary),var(--blue))"></div></div></div>`).join('')}</div>
      </div>
      <div class="card card-pad"><h2>Leaderboard</h2>
        <div class="mt">${lb.map((r, i) => `<div class="lb-row"><span class="lb-rank">#${i + 1}</span><span class="flex">${avatar(r.u.name, 26)} ${esc(r.u.name)} <span class="t-sub">· ${esc(r.u.role)}</span></span><span><b>${fmt(r.fees)}</b></span><span class="muted">${r.placed} placed · ${r.deals} won</span></div>`).join('')}</div>
      </div>
    </div>`;
  barChart($('#chFees'), ['-5w', '-4w', '-3w', '-2w', '-1w', 'now'], feeByWeek, '#007BFF');
  donutChart($('#chSrc'), srcEntries);
};

// =========================================================
// MARKET MATCH (X10)
// =========================================================
let marketSources = null;
let selectedSources = new Set(['remoteok', 'arbeitnow', 'linkedin', 'indeed', 'mycareersfuture']);
let marketTab = 'jobs';

routes.market = async () => {
  if (!marketSources) { try { marketSources = await api('market/sources'); } catch (e) { marketSources = []; } }
  const hot = S.marketMatches.filter((m) => m.score >= 80).length;
  $('#view').innerHTML = `
    <div class="market-hero">
      <h1>🛰️ Market Match <span class="x10-badge" style="vertical-align:middle">X10</span></h1>
      <p>Pull live openings from job-market sources, then score every one against your ${S.candidates.length}-candidate database. Turn open-market demand into jobs, submissions, and BD conversations before anyone else sees them.</p>
      <div class="source-row">${marketSources.map((s) => `
        <span class="src-pill ${selectedSources.has(s.key) ? 'on' : ''}" data-src="${s.key}" title="${esc(s.note)}${s.needs && !s.ready ? ' — ' + esc(s.needs) : ''}">
          <span class="${s.live && s.ready ? 'src-live' : 'src-sample'}"></span>${esc(s.name)}${s.live && !s.ready ? ' 🔑' : ''}</span>`).join('')}
      </div>
      <div class="market-controls">
        <input type="text" id="mq" placeholder="Optional keyword filter — e.g. nurse, kubernetes, data centre…" value="">
        <button class="btn btn-blue" id="mFetch">Fetch market jobs</button>
        <button class="btn btn-primary" id="mMatch" ${S.marketJobs.length ? '' : 'disabled'}>Run matching engine</button>
      </div>
    </div>
    ${marketErrors.length ? `<div class="card card-pad mb" style="border-left:3px solid var(--orange)">${marketErrors.map((e) => `<div class="t-sub">⚠️ <b>${esc(e.source)}</b>: ${esc(e.error)}</div>`).join('')}</div>` : ''}
    <div class="filter-bar">
      <button class="btn ${marketTab === 'jobs' ? 'btn-primary' : 'btn-ghost'}" id="tabJobs">Market jobs (${S.marketJobs.length})</button>
      <button class="btn ${marketTab === 'matches' ? 'btn-primary' : 'btn-ghost'}" id="tabMatches">Matches (${S.marketMatches.length})${hot ? ` · <span style="color:${marketTab === 'matches' ? '#fff' : 'var(--red)'}">${hot} hot</span>` : ''}</button>
      <span class="count-note">Legend: <span class="chip live">live feed</span> <span class="chip sample">sample feed</span></span>
    </div>
    <div id="marketBody"></div>`;

  $$('.src-pill').forEach((p) => p.onclick = () => { const k = p.dataset.src; selectedSources.has(k) ? selectedSources.delete(k) : selectedSources.add(k); p.classList.toggle('on'); });
  $('#tabJobs').onclick = () => { marketTab = 'jobs'; render(); };
  $('#tabMatches').onclick = () => { marketTab = 'matches'; render(); };
  $('#mFetch').onclick = async (e) => {
    const btn = e.currentTarget; btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Fetching live sources…';
    try {
      const r = await api('market/fetch', 'POST', { sources: [...selectedSources], query: $('#mq').value });
      marketErrors = r.errors || [];
      await refresh(); marketTab = 'jobs'; render();
      toast(`Fetched ${r.jobs.length} market jobs${r.errors.length ? ' (' + r.errors.length + ' source error(s))' : ''}`);
    } catch (err) { toast(err.message, true); btn.disabled = false; btn.textContent = 'Fetch market jobs'; }
  };
  $('#mMatch').onclick = async (e) => {
    const btn = e.currentTarget; btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Scoring ' + (S.marketJobs.length * S.candidates.length).toLocaleString() + ' pairs…';
    try {
      await api('market/match', 'POST', { minScore: 45 });
      await refresh(); marketTab = 'matches'; render();
      toast('Matching complete — ' + S.marketMatches.length + ' matches found');
    } catch (err) { toast(err.message, true); btn.disabled = false; btn.textContent = 'Run matching engine'; }
  };

  drawMarketBody();
};

function drawMarketBody() {
  const body = $('#marketBody');
  if (marketTab === 'jobs') {
    body.innerHTML = S.marketJobs.length ? `<div class="grid grid-2">${S.marketJobs.map((mj) => `
      <div class="card mj-card">
        <div>
          <div class="mj-title">${esc(mj.title)}</div>
          <div class="mj-co">${esc(mj.company)} · ${esc(mj.location)}${mj.salaryText ? ' · ' + esc(mj.salaryText) : ''}</div>
          <div class="mt">${mj.skills.slice(0, 6).map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</div>
          <div class="t-sub mt">${esc(mj.description.slice(0, 180))}${mj.description.length > 180 ? '…' : ''}</div>
        </div>
        <div style="text-align:right;display:flex;flex-direction:column;gap:8px;align-items:flex-end">
          <span class="chip ${mj.live ? 'live' : 'sample'}">${esc(mj.source)}</span>
          ${mj.url ? `<a href="${esc(mj.url)}" target="_blank" rel="noopener" class="t-sub">open posting ↗</a>` : ''}
          <button class="btn btn-ghost btn-sm" data-import="${mj.id}">Import as job</button>
        </div>
      </div>`).join('')}</div>`
      : '<div class="card card-pad"><div class="empty">No market jobs fetched yet. Pick sources above and press <b>Fetch market jobs</b>.<br><br>RemoteOK and Arbeitnow are live public APIs with no key needed. Add Adzuna / JSearch keys in Settings for Singapore-focused and LinkedIn/Indeed-aggregated live postings.</div></div>';
    $$('[data-import]', body).forEach((b) => b.onclick = () => importMarketJob(b.dataset.import));
  } else {
    const rows = S.marketMatches.slice(0, 60);
    body.innerHTML = rows.length ? `<div class="card">${rows.map((m) => {
      const mj = S.marketJobs.find((x) => x.id === m.marketJobId) || {};
      const c = byId('candidates', m.candidateId);
      return `<div class="match-row">
        <div class="score-ring ${scoreClass(m.score)}" style="font-size:19px">${m.score}</div>
        <div><div class="t-name">${esc(c.name || '?')}</div><div class="t-sub">${esc(c.title || '')} · ${esc(c.location || '')} · expects ${fmt(c.salaryExpectation)}</div>
          <div class="mt">${m.matchedSkills.slice(0, 4).map((s) => `<span class="chip green">${esc(s)}</span>`).join('')}${m.missingSkills.slice(0, 2).map((s) => `<span class="chip grey" style="text-decoration:line-through">${esc(s)}</span>`).join('')}</div></div>
        <div><div class="t-name">${esc(mj.title || '(refetch needed)')}</div><div class="t-sub">${esc(mj.company || '')} · ${esc(mj.location || '')} · <span class="chip ${mj.live ? 'live' : 'sample'}">${esc(mj.source || '')}</span></div>
          <div class="breakdown mt"><span>skills</span><div class="bar"><div style="width:${m.breakdown.skills}%"></div></div><span>${m.breakdown.skills}%</span>
          <span>title</span><div class="bar"><div style="width:${m.breakdown.title}%;background:var(--blue)"></div></div><span>${m.breakdown.title}%</span>
          <span>location</span><div class="bar"><div style="width:${m.breakdown.location}%;background:var(--orange)"></div></div><span>${m.breakdown.location}%</span></div></div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <button class="btn btn-primary btn-sm" data-pitch="${m.id}">✨ AI pitch</button>
          <button class="btn btn-ghost btn-sm" data-imp2="${m.marketJobId}" data-cand="${m.candidateId}">Import + add</button>
        </div>
      </div>`;
    }).join('')}</div>${aiBlock('pitchOut')}`
      : '<div class="card card-pad"><div class="empty">No matches yet. Fetch market jobs, then press <b>Run matching engine</b>.</div></div>';
    $$('[data-pitch]', body).forEach((b) => b.onclick = (e) => {
      const m = S.marketMatches.find((x) => x.id === b.dataset.pitch);
      const mj = S.marketJobs.find((x) => x.id === m.marketJobId);
      runAiInto('pitchOut', 'match_pitch', { candidate: byId('candidates', m.candidateId), job: mj, matchInfo: m }, e.currentTarget);
      $('#pitchOut').scrollIntoView({ behavior: 'smooth' });
    });
    $$('[data-imp2]', body).forEach((b) => b.onclick = () => importMarketJob(b.dataset.imp2, [b.dataset.cand]));
  }
}

async function importMarketJob(marketJobId, candidateIds) {
  const mj = S.marketJobs.find((x) => x.id === marketJobId);
  if (!mj) return;
  const withCands = candidateIds && candidateIds.length;
  try {
    const r = await api('market/import', 'POST', { marketJobId, candidateIds: candidateIds || [] });
    await refresh();
    toast(`Imported "${mj.title}" as a job${withCands ? ' with ' + candidateIds.length + ' candidate(s) in Sourced' : ''}`);
    location.hash = '#/jobs/' + r.job.id;
  } catch (e) { toast(e.message, true); }
}

// =========================================================
// SETTINGS
// =========================================================
routes.settings = () => {
  const st = S.settings;
  $('#view').innerHTML = `
    <div class="page-head"><div><h1>Settings</h1><div class="sub">Workspace, integrations, and AI configuration</div></div></div>
    <div class="grid grid-2">
      <div class="card card-pad">
        <h2>Workspace</h2>
        <div class="mt"><label>Acting as</label><select id="setUser">${S.users.map((u) => `<option value="${u.id}" ${st.currentUserId === u.id ? 'selected' : ''}>${esc(u.name)} — ${esc(u.role)}</option>`).join('')}</select></div>
        <div class="mt"><label>Pipeline stages (comma-separated)</label><input id="setStages" value="${esc(st.stages.join(', '))}"></div>
        <div class="mt"><label>Deal stages</label><input id="setDealStages" value="${esc(st.dealStages.join(', '))}" disabled title="Fixed in this build"></div>
        <button class="btn btn-primary mt" id="saveWs">Save workspace</button>
        <hr style="border:none;border-top:1px solid #ECECEA;margin:16px 0">
        <h2>Email templates</h2>
        ${S.emailTemplates.map((t) => `<div style="padding:8px 0;border-bottom:1px solid #F3F3F1"><div class="t-name">${esc(t.name)}</div><div class="t-sub">${esc(t.subject)}</div></div>`).join('')}
        <hr style="border:none;border-top:1px solid #ECECEA;margin:16px 0">
        <h2>Demo data</h2>
        <p class="t-sub mt">All seed data is fictional. Reset restores the original seed.</p>
        <button class="btn btn-danger mt" id="resetData">Reset demo data</button>
      </div>
      <div class="card card-pad">
        <h2>AI — AIRA engine</h2>
        <p class="t-sub mt">Without a key, AIRA uses the built-in local engine (rule-based). With an Anthropic API key, every AI feature (chat, summaries, emails, JDs, pitches) runs on a live model.</p>
        <div class="mt"><label>Anthropic API key</label><input id="setAnthropic" type="password" placeholder="sk-ant-…" value="${esc(st.anthropicApiKey || '')}"></div>
        <div class="mt"><label>Model</label><select id="setModel">${['claude-sonnet-5', 'claude-fable-5', 'claude-opus-4-8', 'claude-haiku-4-5-20251001'].map((m) => `<option ${st.aiModel === m ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
        <hr style="border:none;border-top:1px solid #ECECEA;margin:16px 0">
        <h2>Market Match integrations</h2>
        <p class="t-sub mt">RemoteOK + Arbeitnow are live with no key. These unlock more live sources:</p>
        <div class="mt"><label>Adzuna App ID <span class="muted">(free — developer.adzuna.com, Singapore feed)</span></label><input id="setAdzId" value="${esc(st.adzunaAppId || '')}"></div>
        <div class="mt"><label>Adzuna App Key</label><input id="setAdzKey" type="password" value="${esc(st.adzunaAppKey || '')}"></div>
        <div class="mt"><label>JSearch RapidAPI key <span class="muted">(aggregates LinkedIn / Indeed / Glassdoor postings)</span></label><input id="setJsearch" type="password" value="${esc(st.jsearchKey || '')}"></div>
        <button class="btn btn-primary mt" id="saveInteg">Save integrations</button>
        <div class="mt t-sub">🔒 Keys are stored only in your local data.json — never sent anywhere except the provider itself.</div>
      </div>
    </div>`;
  $('#saveWs').onclick = async () => {
    await api('settings', 'PUT', { currentUserId: $('#setUser').value, stages: $('#setStages').value.split(',').map((s) => s.trim()).filter(Boolean) });
    await refresh(); render(); toast('Workspace saved');
  };
  $('#saveInteg').onclick = async () => {
    await api('settings', 'PUT', { anthropicApiKey: $('#setAnthropic').value.trim(), aiModel: $('#setModel').value, adzunaAppId: $('#setAdzId').value.trim(), adzunaAppKey: $('#setAdzKey').value.trim(), jsearchKey: $('#setJsearch').value.trim() });
    marketSources = null;
    await refresh(); toast('Integrations saved');
  };
  $('#resetData').onclick = async () => { if (confirm('Reset all data to the original demo seed?')) { await api('reset', 'POST', {}); await refresh(); render(); toast('Demo data reset'); } };
};

// =========================================================
// GLOBAL: search, quick add, AIRA
// =========================================================
function setupGlobal() {
  const gs = $('#globalSearch'), sr = $('#searchResults');
  gs.oninput = () => {
    const q = gs.value.toLowerCase().trim();
    if (q.length < 2) return sr.classList.add('hidden');
    const hits = [];
    S.candidates.forEach((c) => { if ((c.name + ' ' + c.title + ' ' + (c.skills || []).join(' ')).toLowerCase().includes(q)) hits.push({ kind: 'Candidate', label: c.name, sub: c.title, href: '#/candidates/' + c.id }); });
    S.jobs.forEach((j) => { if ((j.title + ' ' + compName(j.companyId)).toLowerCase().includes(q)) hits.push({ kind: 'Job', label: j.title, sub: compName(j.companyId), href: '#/jobs/' + j.id }); });
    S.companies.forEach((co) => { if (co.name.toLowerCase().includes(q)) hits.push({ kind: 'Company', label: co.name, sub: co.industry, href: '#/companies/' + co.id }); });
    S.contacts.forEach((c) => { if (c.name.toLowerCase().includes(q)) hits.push({ kind: 'Contact', label: c.name, sub: compName(c.companyId), href: '#/contacts' }); });
    sr.innerHTML = hits.slice(0, 10).map((h) => `<div class="sr-item" data-href="${h.href}"><span class="sr-kind">${h.kind}</span><div><div class="t-name">${esc(h.label)}</div><div class="t-sub">${esc(h.sub)}</div></div></div>`).join('')
      + `<div class="sr-item" data-aira="${esc(gs.value)}"><span class="sr-kind" style="color:var(--primary)">AIRA</span><div class="t-name">Ask AIRA: "${esc(gs.value)}"</div></div>`;
    sr.classList.remove('hidden');
    $$('.sr-item', sr).forEach((el) => el.onclick = () => {
      sr.classList.add('hidden'); gs.value = '';
      if (el.dataset.aira) { openAira(); $('#airaText').value = el.dataset.aira; $('#airaForm').dispatchEvent(new Event('submit')); }
      else location.hash = el.dataset.href;
    });
  };
  document.addEventListener('click', (e) => { if (!e.target.closest('.global-search')) sr.classList.add('hidden'); });

  $('#quickTask').onclick = quickTaskModal;
  $('#quickAdd').onclick = () => openModal('Quick add', `
    <div class="grid grid-2">
      ${[['candidate', '👤 Candidate'], ['job', '💼 Job'], ['company', '🏢 Company'], ['contact', '📇 Contact']].map(([k, l]) => `<button class="btn btn-ghost" style="padding:18px" data-qa="${k}">${l}</button>`).join('')}
    </div>`, []).parentElement && $$('#modalRoot [data-qa]').forEach((b) => b.onclick = () => {
    closeModal();
    if (b.dataset.qa === 'candidate') candidateForm();
    if (b.dataset.qa === 'job') jobForm();
    if (b.dataset.qa === 'company') { location.hash = '#/companies'; setTimeout(() => $('#addCo') && $('#addCo').click(), 60); }
    if (b.dataset.qa === 'contact') { location.hash = '#/contacts'; setTimeout(() => $('#addCt') && $('#addCt').click(), 60); }
  });

  // AIRA
  $('#airaLaunch').onclick = openAira;
  $('#airaClose').onclick = () => $('#airaPanel').classList.add('hidden');
  $('#airaForm').onsubmit = async (e) => {
    e.preventDefault();
    const input = $('#airaText'), text = input.value.trim();
    if (!text) return;
    input.value = '';
    const body = $('#airaBody');
    body.insertAdjacentHTML('beforeend', `<div class="aira-msg aira-user">${esc(text)}</div><div class="aira-typing" id="airaTyping"><span class="spin"></span> thinking…</div>`);
    body.scrollTop = body.scrollHeight;
    try {
      const r = await aiCall('chat', { message: text });
      $('#airaTyping').remove();
      body.insertAdjacentHTML('beforeend', `<div class="aira-msg aira-bot">${md(r.text)}</div>`);
      $('#airaEngine').textContent = r.engine === 'anthropic' ? S.settings.aiModel : 'local engine';
    } catch (err) {
      $('#airaTyping').remove();
      body.insertAdjacentHTML('beforeend', `<div class="aira-msg aira-bot">Error: ${esc(err.message)}</div>`);
    }
    body.scrollTop = body.scrollHeight;
  };
}
function openAira() { $('#airaPanel').classList.remove('hidden'); $('#airaText').focus(); }

// ---------- boot ----------
(async function boot() {
  try {
    await refresh();
    $('#userChip').textContent = initials(me().name);
    $('#userChip').title = me().name;
    setupGlobal();
    render();
  } catch (e) {
    $('#view').innerHTML = `<div class="empty">Failed to load data: ${esc(e.message)}<br>Is the server running? <code>node server.js</code></div>`;
  }
})();
