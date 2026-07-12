# Data-import guide

The Import page (`/import`) accepts `.csv`, `.xlsx` or `.xls` (max 10 MB / 20,000 rows).
Headers are case- and spacing-insensitive (`Transaction Date` → `transaction_date`).
Every row is validated; rejected rows are reported with line numbers and reasons.
Possible duplicates are **flagged, never deleted** (amber rows in the Sale History table).

Templates live in `templates/`:

- `sale-transactions-template.csv`
- `rental-records-template.csv`
- `nearby-projects-template.csv`

## Sale transactions (`kind = sales`)

| Column | Required | Notes |
| ------ | -------- | ----- |
| transaction_date | ✅ | `YYYY-MM-DD` |
| property_type | ✅ | office, retail, mall_unit, shophouse, mixed_commercial, strata_commercial, business_park, industrial |
| price_sgd | ✅ | positive; `$`/commas tolerated |
| floor_area_sqm / floor_area_sqft | one recommended | either unit; the other is derived (1 sqm = 10.7639 sqft) and the original preserved |
| project_name, street, postal_code | recommended | project_name is used to link the row to a building already in the database |
| floor_level, unit_identifier | optional | e.g. `11-15`, `#12-05` |
| type_of_sale, tenure, lease_commencement, lease_term_years | optional | tenure free-text is normalised (99-year, 999-year, freehold) |
| source_name, source_url | recommended | falls back to the form's source field |

### Getting the official file
URA → Property Market Information → Commercial transactions → search → download CSV.
Map its columns to the template (usually: Sale Date → transaction_date, Transacted Price →
price_sgd, Area (SQM) → floor_area_sqm, Floor Level → floor_level).

### REALIS exports
Export from your own subscription, tick the REALIS checkbox on the Import page. Rows are
stored as `official` with the REALIS source label and stay private to your account. Automated
REALIS extraction is deliberately not supported.

## Rental records (`kind = rentals`)

| Column | Required | Notes |
| ------ | -------- | ----- |
| property_type | ✅ | as above |
| lease_start **or** lease_quarter | one | `YYYY-MM-DD` or `2026Q1` |
| monthly_rent_sgd or rent_psf_monthly | one | PSF derived when rent + area are present |
| aggregation_level | important | `unit`, `building`, `street`, `locality`, `index` — anything above `unit` is labelled in the UI and never shown as a verified tenancy |
| observations | recommended for aggregated rows | number of tenancies behind the figure |
| floor_area_sqm / sqft, lease_term_months, street, source_name, source_url | optional | |

## Nearby projects (`kind = projects`)

| Column | Required | Notes |
| ------ | -------- | ----- |
| name, project_type, lat, lng, status | ✅ | status ∈ existing, under_construction, confirmed, tendered, gazetted, proposed, draft_intention, long_term_concept, unverified |
| source_name | ✅ | projects must cite a source (e.g. "URA press release 12 Jun 2026") |
| description, expected_completion, announced_date, source_url | optional | |

Only import projects from official announcements or clearly-labelled reports; the impact
assessment shown in the app is always labelled an opinion with its assumptions.
