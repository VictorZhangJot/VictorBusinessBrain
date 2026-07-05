# JOT TalentOS

In-house recruitment CRM for Jobs of Tomorrow (Singapore). No installation, no dependencies — it runs on plain Node.js and stores everything locally in `data/db.json`.

## Run it

Double-click **`Start TalentOS.bat`** — it starts the server and opens the app in your browser at http://localhost:4820. Keep the black window open while you work; close it to stop. (Double-clicking again while it is already running is harmless.)

Or from a terminal:

```
node server.js
```

Then open **http://localhost:4820** in your browser.

Note: `public/index.html` is the interface, but it does not work opened directly as a file — the server behind it provides your database and the live MyCareersFuture connection.

## What is inside

Built on the patterns of the market-leading agency platforms (Bullhorn, Vincere, Loxo): one database for clients + candidates + jobs, kanban pipelines, placement analytics, CV parsing, instant global search, and an assistant.

| Module | What it does |
|---|---|
| **Dashboard** | Open roles, pipeline totals, weighted revenue forecast, follow-ups due (overdue flagged), recent activity. |
| **Assistant** | A recruiting copilot chat. Understands "find ICU nurses available now", "who fits the ML Engineer job?", "search the market for staff nurse", "who works at Equinix?", "what should I do today?", "remind me to call X tomorrow", "how is revenue?" — every answer executes real searches on your data. Set an `ANTHROPIC_API_KEY` environment variable before starting the server and free-form questions route to Claude. |
| **Pipeline Board** | Kanban view of every candidate in every open pipeline. Drag cards across stages; dropping on **Placed** books the placement fee automatically (fee % × annual salary). |
| **Reports** | Booked fees, weighted pipeline forecast (stage-weighted: Offer 75%, Interview 45%, Submitted 25%…), average time-to-fill, funnel conversion, source effectiveness, revenue by client. |
| **Clients** | Employer accounts with contacts, notes and their job orders. |
| **Job Orders** | Roles you are working, each with an auto-extracted prerequisite list and a stage-by-stage candidate pipeline (Sourcing → Screening → Submitted → Interview → Offer → Placed). |
| **Candidates** | Your internal database. Search understands synonyms and typos; adding a candidate has a **paste-CV parser** (name, title, contact, years, education, skills, certs and summary auto-extracted) plus duplicate detection. |
| **Market Intel** | Live job listings pulled from the MyCareersFuture Singapore API — real postings, not mock data. Every listing is classified as **direct employer** (a BD prospect — one click adds them to Clients) or **recruitment agency** (a competitor), with filter tabs for each. One click extracts and highlights the prerequisites; another scores every candidate against them; a third imports the posting as a job order. |
| **Talent Map** | Company-level intelligence. For every company: which of your candidates work there now, which are alumni (warm intro paths), and which external people you are hunting. Each company page opens with an **organisational chart** — Leadership / Management / Senior / Team layers inferred from job titles, showing your candidates (green), your hunt targets (coral), and dashed "no coverage" gaps you can click to start hunting. Tracks headhunt targets through Identified → Approached → In conversation → CV obtained. "Check live hiring" queries MyCareersFuture for that company's real open roles; the web-search buttons open pre-built LinkedIn people searches and Google x-ray searches (`site:linkedin.com/in "Company" "Role"`) for finding people to hunt. |
| **CV Review** | The keyboard-first review mode. |
| **Integrations** | Connect Manatal (your recruitment CRM/ATS). Shows connection status and a one-click "Sync candidates from Manatal" that pulls your Manatal database in, matching existing candidates by email and adding new ones with skills auto-extracted from their profile. |

**Real vs sample data:** market searches and live-hiring checks are real (MyCareersFuture government API). The seeded candidates, clients, and the three `[Example]` hunt targets are fictional placeholders — replace them with real ones as you work.

## Keyboard

| Key | Action |
|---|---|
| `Ctrl+K` | Command palette — instant search across candidates, clients, jobs, companies and actions, anywhere in the app |
| `↓` / `↑` (or `j` / `k`) | (CV Review) Next / previous CV — instant, no clicking |
| `S` | Shortlist (auto-advances to the next CV) |
| `X` | Reject (auto-advances) |
| `Esc` | Exit review |

Decisions can be saved as a named shortlist, which also appears in the activity feed.

## How prerequisite extraction works

The engine reads a job description and pulls out:

- **Skills** — matched against a taxonomy of ~90 canonical skills with synonyms, tuned for healthcare (SNB, BCLS/ACLS, med-surg, ICU…), data centres (UPS, chillers, CRAC, BMS, CDCP…), and AI/tech (Python, PyTorch, Kubernetes, LLM fine-tuning…)
- **Minimum years of experience** — phrases like "minimum 5 years", "3+ years"
- **Minimum education** — NITEC / Diploma / Degree / Master's / PhD
- **Certifications** — professional registrations and certs treated separately

Candidates are then scored: skills 55%, certifications 15%, years of experience 20%, education 10% (weights re-normalise when a category is absent from the posting).

## Connecting Manatal (or Claude for the Assistant)

Credentials never go through chat or the browser — they live in one local file only.

1. Copy `.env.example` to `.env` (same folder). `.env` is git-ignored — it stays on this machine and is never committed.
2. Open `.env` yourself in Notepad and paste your token(s) in:
   - `MANATAL_API_TOKEN` — from Manatal: Administration → Features → Open API → Generate new token (Enterprise Plus plan).
   - `ANTHROPIC_API_KEY` — optional, only needed for the Assistant's free-form Claude answers.
3. Close and reopen `Start TalentOS.bat` so the server picks up the new value.
4. Open the **Integrations** tab to confirm the connection, then press "Sync candidates from Manatal".

## Data

Everything lives in `data/db.json` — candidates, clients, job orders, activity log, saved shortlists. Back it up by copying that one file. The seed data ships with 14 sample candidates and 4 sample clients across JOT's niches; replace them as you go.
