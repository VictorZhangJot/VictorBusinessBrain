# JOT TalentOS

In-house recruitment CRM for Jobs of Tomorrow (Singapore). No installation, no dependencies — it runs on plain Node.js and stores everything locally in `data/db.json`.

## Run it

```
node server.js
```

Then open **http://localhost:4820** in your browser.

## What is inside

| Module | What it does |
|---|---|
| **Dashboard** | Open roles, pipeline totals, interview count, recent activity. |
| **Clients** | Employer accounts with contacts, notes and their job orders. |
| **Job Orders** | Roles you are working, each with an auto-extracted prerequisite list and a stage-by-stage candidate pipeline (Sourcing → Screening → Submitted → Interview → Offer → Placed). |
| **Candidates** | Your internal database. Search by skill ("ICU", "Kubernetes", "chiller"), then review the results. |
| **Market Intel** | Live job listings pulled from the MyCareersFuture Singapore API. One click extracts the prerequisites from any posting; another click scores every candidate in your database against them; a third imports the posting as a job order. |
| **CV Review** | The keyboard-first review mode. |

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
