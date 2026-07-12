# Source feasibility & access matrix

Checked live on 12–13 July 2026 during development. Re-verify terms before commercial use.

| # | Source | What it offers | Access method | Cost / auth | Automated here? | Notes & restrictions |
| - | ------ | -------------- | ------------- | ----------- | --------------- | -------------------- |
| 1 | **OneMap (SLA)** | Address/building search, geocoding, basemap tiles | REST API, keyless for search + tiles (verified live: `/api/common/elastic/search` returns JSON without auth) | Free | **Yes — live** (`lib/adapters/onemap.ts`) | Attribution required (shown on the map). Premium services (routing) need a token — not used. |
| 2 | **URA Data Service API** | Machine-readable URA datasets incl. property market data | REST with AccessKey → daily token | Free registration at ura.gov.sg/maps/api | **Integration point** (`lib/adapters/ura.ts`) | Exact service ids are listed in the registration pack; the app requires you to paste the commercial-transactions service id into `URA_COMM_SERVICE` rather than guessing one. Token flow implemented. |
| 3 | **URA Property Market Information (web tool)** | Commercial transaction search & CSV download | Manual download from eservice.ura.gov.sg | Free | **Via Import page** | The web tool has no public API; scraping it would breach access controls, so the app takes the legal CSV download instead. |
| 4 | **URA commercial statistics / indices** | Price & rental indices, vacancy, supply | Downloads on ura.gov.sg; some series on data.gov.sg | Free | **Via Import page** (commercial_indices table ready) | Aggregated series only — labelled as index-level data. |
| 5 | **URA REALIS** | Detailed transaction/caveat data | Subscriber web tool with export | Paid subscription | **Import of user's own exports only** | Automation is not offered: REALIS terms restrict access to the subscriber's interactive use. Credentials are never requested or stored; exports stay private to the user's account. |
| 6 | **data.gov.sg** | Open government datasets (incl. some URA/JTC series) | REST `datastore_search`, keyless for public datasets | Free | **Integration point** (`lib/adapters/datagovsg.ts`) | Dataset ids (d_…) change as agencies republish; the operator selects one from the catalogue and sets `DATAGOVSG_DATASET_ID`. Open Data Licence applies. |
| 7 | **URA Master Plan / URA SPACE** | Zoning, plot ratio, conservation | Interactive map; some layers downloadable | Free viewing | **Manual entry + projects CSV import** | Zoning stored per property with source attribution. A GeoJSON layer import is a documented next step. Zoning ≠ project commitment (stated in-app). |
| 8 | **SLA INLIS** | Title, tenure, lot, legal description | Paid per-extract portal | Paid per search | **Manual entry** | The authoritative way to verify lease commencement; entering it upgrades the lease balance from "estimate". |
| 9 | **LTA announcements** | Rail/road projects, completion targets | Press releases / LTA DataMall for operations data | Free | **Projects CSV import** | Only officially announced projects should be imported; status taxonomy (confirmed/tendered/…) enforced by the import schema. |
| 10 | **Government tenders / press releases** | Upcoming developments (GLS, precinct plans) | Web pages | Free | **Projects CSV import / manual entry** | Each project row requires a source_name; confidence defaults low for third-party reports. |
| 11 | **User uploads (CSV/XLSX)** | Anything the user lawfully holds | Import page | — | **Yes** | Zod-validated, duplicate-flagged, source-attributed, private to the account. |

## What this means for the app

- **Fully live now:** OneMap search, geocoding, basemap.
- **Live once configured:** URA Data Service (access key + service id), data.gov.sg (dataset id).
- **Always manual by design:** REALIS (subscription terms), INLIS (paid extracts), PMI web tool (no API).
- **Never done:** bypassing logins/CAPTCHAs/rate limits, automating REALIS, exposing credentials to the browser, or presenting unofficial data as official.
