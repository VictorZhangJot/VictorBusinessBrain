# JOT Singapore Salary Calculator

A lead-generation and SEO tool for Jobs of Tomorrow (JOT). Candidates enter their career
profile and get a percentile-based Singapore salary benchmark, a bell-curve market view,
matched job opportunities, likely-hiring companies, skills-gap advice, a downloadable PDF
report — and an optional free recruiter review (the lead capture).

**Version 1 runs entirely on mock Singapore data.** The backend uses a modular
data-provider system so real sources (APIs, licensed reports, uploaded CSVs, permitted
Apify actors) can be plugged in later without changing the calculator.

---

## How to run it

You need Node.js installed. Open two terminals.

**Terminal 1 — backend (API on port 4840):**
```
cd salary-calculator/backend
npm install
npm start
```

**Terminal 2 — frontend (site on port 4841):**
```
cd salary-calculator/frontend
npm install
npm run dev
```

Then open **http://localhost:4841** in a browser.

Pages:
- `/` — landing page
- `/calculator` — 4-step salary profile form
- `/results` — salary dashboard (reached after submitting the form)
- `/admin` — CSV upload + data source overview

## How to upload salary benchmark CSVs

1. Go to `/admin`.
2. Click **Download CSV template** to get a file with the correct columns and one sample row.
3. Fill it in (one row per role benchmark, monthly S$ figures, dates as YYYY-MM-DD,
   skills separated by semicolons).
4. Choose the file and click **Upload & validate**.

Each row is checked for: missing title, missing/invalid salary numbers, missing/invalid
source date, and non-Singapore location (warning — non-SG rows upload but are never used
in calculations). Valid rows are appended to
`backend/src/data/uploadedBenchmarks.json` and immediately join the benchmark pool.

## Where the data lives

| Data | File |
|---|---|
| Mock salary benchmarks | `backend/src/data/mockSalaryBenchmarks.json` |
| Mock job opportunities | `backend/src/data/mockJobs.json` |
| Mock company hiring data | `backend/src/data/mockCompanies.json` |
| Uploaded CSV benchmarks | `backend/src/data/uploadedBenchmarks.json` (created on first upload) |
| Captured leads | `backend/src/data/leads.json` + `backend/src/data/resumes/` |

Storage is JSON files (chosen over SQLite for v1 simplicity). Leads stay on this machine —
connect a CRM/email service before public deployment.

## How to replace mock data with real data

1. **Manual dataset**: edit `mockSalaryBenchmarks.json` directly with verified numbers —
   keep the same fields, update `source`, `sourceType` and `sourceDate` honestly.
2. **CSV uploads**: use the admin page (above) — no code changes needed.
3. **APIs / future connectors**: implement the placeholder providers below.

## Where to connect future APIs

All providers live in `backend/src/providers/` and are registered in
`providers/index.js`. Each placeholder file contains comments explaining exactly where
approved access should be wired in:

- `salaryBenchmarkProvider.js` — licensed salary reports / MOM wage data
- `jobBoardProvider.js` — any job board offering an official API
- `apifyProvider.js` — Apify actors **where the target site permits collection**
- `myCareersFutureProvider.js` — official / data.gov.sg channels only
- `glassdoorLikeProvider.js`, `jobStreetProvider.js`, `linkedInJobsProvider.js` —
  **placeholders only**; these platforms prohibit scraping, so they activate only with
  official partner API access or licensed data.

⚠️ Compliance rule baked into the design: no scraping logic for protected platforms
anywhere in the codebase. New sources must be official APIs, licensed data, uploads, or
collection methods the target site permits.

## API endpoints

- `POST /api/salary/calculate` — profile in, percentiles/confidence/interpretation/sources out
- `POST or GET /api/jobs/recommend` — matched jobs with 0–100 match scores and reasons
- `POST or GET /api/companies/recommend` — likely-hiring companies with scores
- `POST /api/admin/upload-salary-csv` — multipart CSV upload with validation report
- `GET /api/sources` — all sources, record counts, latest dates, connector status
- `POST /api/leads` — lead capture (name, email, phone, target role, resume, consent)

## How the calculation works (short version)

`salaryMatchingService` scores every Singapore benchmark record against the profile
(title match weighted highest, then specialization, experience band, seniority, industry,
skills, qualification, data recency). `salaryCalculationService` removes outliers, takes
a weighted average of each percentile, places the candidate's current/expected salary on
the curve, and produces a confidence score (record count, title-match strength, recency,
consistency, source quality). Low confidence triggers a "directional estimate" warning.

## How to deploy

- **Frontend**: `npm run build` in `frontend/` produces static files in `frontend/dist/`
  — host on Vercel/Netlify or the JOT website. Set the API URL via a reverse proxy or
  change the axios `baseURL` in `frontend/src/services/api.js`.
- **Backend**: any Node host (Render, Railway, a small VPS). Run `node server.js`.
  Move data files to persistent storage, add authentication to `/admin` and rate-limiting
  before going public.

## Tech stack

Frontend: React 18, Vite, Tailwind CSS, Recharts (bell curve), Axios, jsPDF + html2canvas
(PDF export). Backend: Node.js, Express, Multer (uploads), PapaParse (CSV), JSON storage.
