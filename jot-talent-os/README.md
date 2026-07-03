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

| Module | What it does |
|---|---|
| **Dashboard** | Open roles, pipeline totals, interview count, recent activity. |
| **Clients** | Employer accounts with contacts, notes and their job orders. |
| **Job Orders** | Roles you are working, each with an auto-extracted prerequisite list and a stage-by-stage candidate pipeline (Sourcing → Screening → Submitted → Interview → Offer → Placed). |
| **Candidates** | Your internal database. Search by skill ("ICU", "Kubernetes", "chiller"), then review the results. |
| **Market Intel** | Live job listings pulled from the MyCareersFuture Singapore API — real postings, not mock data. Every listing is classified as **direct employer** (a BD prospect — one click adds them to Clients) or **recruitment agency** (a competitor), with filter tabs for each. One click extracts and highlights the prerequisites; another scores every candidate against them; a third imports the posting as a job order. |
| **Talent Map** | Company-level intelligence. For every company: which of your candidates work there now, which are alumni (warm intro paths), and which external people you are hunting. Each company page opens with an **organisational chart** — Leadership / Management / Senior / Team layers inferred from job titles, showing your candidates (green), your hunt targets (coral), and dashed "no coverage" gaps you can click to start hunting. Tracks headhunt targets through Identified → Approached → In conversation → CV obtained. "Check live hiring" queries MyCareersFuture for that company's real open roles; the web-search buttons open pre-built LinkedIn people searches and Google x-ray searches (`site:linkedin.com/in "Company" "Role"`) for finding people to hunt. |
| **CV Review** | The keyboard-first review mode. |

**Real vs sample data:** market searches and live-hiring checks are real (MyCareersFuture government API). The seeded candidates, clients, and the three `[Example]` hunt targets are fictional placeholders — replace them with real ones as you work.

## CV Review keys

| Key | Action |
|---|---|
| `↓` / `↑` (or `j` / `k`) | Next / previous CV — instant, no clicking |
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

## Data

Everything lives in `data/db.json` — candidates, clients, job orders, activity log, saved shortlists. Back it up by copying that one file. The seed data ships with 14 sample candidates and 4 sample clients across JOT's niches; replace them as you go.
