# Singapore Commercial Property Analyser

Research a Singapore commercial property end-to-end: consolidated property profile, sale and
rental history, comparable-sales scoring, vicinity and Master Plan context, SWOT, and a full
investment calculator with scenarios, sensitivity tables, IRR and NPV.

> **Not a valuation.** This app is for information and preliminary analysis only. It is not a
> formal valuation and not financial, legal, tax or investment advice. See the disclaimers in
> the app footer and in each property's **Sources & Assumptions** tab.

## Quick start (local)

```bash
cd property-analyser
npm install
npx prisma migrate dev      # creates the SQLite database
npx tsx prisma/seed.ts      # loads clearly-labelled FICTIONAL demo data
npm run dev                 # http://localhost:4850
```

Demo sign-in (for watchlists and saved scenarios): `demo@local` / `demo1234`.

Run the calculation-engine tests: `npm test` (54 tests).

## What's inside

| Area | Where |
| --- | --- |
| Search (name / address / postal / planning area / type) + live OneMap matches | `/` |
| 9-tab analysis dashboard | `/property/[id]` |
| CSV / XLSX import with validation + duplicate flagging | `/import` |
| Connector status, terms links, retrieval log | `/sources` |
| Accounts, watchlist | `/account` |
| Calculation engine (decimal-safe: lease, mortgage, yields, DSCR, IRR, NPV, scenarios) | `lib/` |
| Data adapters (OneMap live; URA / data.gov.sg integration points; REALIS & user imports) | `lib/adapters/` |
| Database schema (17+ tables with source lineage) | `prisma/schema.prisma` |
| Import templates | `templates/` |
| Tests + fixtures (freehold, 999-yr, 99-yr, <30-yr, missing data…) | `tests/` |
| Deployment guide (Vercel, Supabase/Postgres, Docker, VPS) | `docs/DEPLOYMENT.md` |
| Data-source feasibility & access matrix | `docs/SOURCE-FEASIBILITY.md` |
| Data-import guide | `docs/DATA-IMPORT.md` |

## Data honesty rules baked in

- **Seed data is fictional** and every record is flagged `demo`, with a banner in the UI.
  The app never presents demo or estimated data as official.
- Missing fields display *"Not available from the connected sources"* — never guessed.
- Rental records aggregated above unit level are labelled as such and never presented as a
  verified unit tenancy.
- Possible duplicate imports are **flagged for review, never auto-deleted**.
- Every record carries source name, URL, retrieval date, reporting period, record status
  (official / user / demo / estimated / derived) and a confidence level.
- Comparable scoring (documented in-app) never labels a record "directly comparable" when a
  major characteristic is missing, and never mixes industrial into commercial comparisons.
- Growth rates (YoY, 3y, 5y, CAGR) return "insufficient comparable data" instead of a number
  when the underlying observations are too thin.
- Tax rates (BSD bands, GST) live in a dated rules table (`lib/taxRules.ts`), not hard-coded
  into the calculator, and can be overridden per calculation.

## Connecting real data

1. **OneMap** — works out of the box (address search + basemap, no key).
2. **URA Data Service API** — register free at <https://www.ura.gov.sg/maps/api/>, then set
   `URA_ACCESS_KEY` and `URA_COMM_SERVICE` in `.env` (the service id list comes with your
   registration; the app deliberately does not guess it).
3. **URA Property Market Information** — download commercial transaction CSVs manually and
   use the Import page.
4. **data.gov.sg** — pick a dataset id from the catalogue and set `DATAGOVSG_DATASET_ID`.
5. **REALIS** — export from your own subscription and import the file. The app never
   automates REALIS access and never sees your REALIS credentials.
6. **SLA INLIS** — buy the title extract and enter tenure details manually (this upgrades the
   lease balance from "estimate" to verified).

## Known limitations

- Local dev uses SQLite; geospatial radius queries run in the app (haversine) rather than
  PostGIS. The Postgres/PostGIS path is documented in `docs/DEPLOYMENT.md`.
- The URA and data.gov.sg connectors are integration points that activate once credentials /
  dataset ids are supplied — they are not exercised in the demo.
- Master Plan zoning is stored per property (imported or manually entered); there is no live
  URA SPACE layer yet.
- PDF export is via the print-friendly report (browser "Save as PDF"); a server-rendered PDF
  is a next step.
- Industrial properties are supported as a clearly-separated optional module only.

## Recommended next steps

1. Register for the URA Data Service key and wire `URA_COMM_SERVICE` (unlocks scheduled
   background imports of official commercial transactions).
2. Add a background job (cron) that refreshes connected sources and records retrievals.
3. Server-side PDF report generation.
4. URA SPACE / Master Plan GeoJSON layer on the vicinity map.
5. Switch production to Postgres + PostGIS and move radius filtering into SQL.
6. Team roles (the `role` field on users is already in place).
