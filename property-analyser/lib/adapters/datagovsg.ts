import { SourceAdapter, AdapterAvailability } from "./types";

/**
 * DataGovSgAdapter - data.gov.sg open datasets.
 * The generic datastore-search API needs no key for public datasets.
 * A dataset id (d_...) must be chosen by the operator from the catalogue at
 * https://data.gov.sg/datasets - ids are NOT hard-coded here because dataset
 * ids change as agencies republish, and guessing one would fabricate a source.
 */

export const dataGovSgAdapter: SourceAdapter = {
  name: "datagovsg",
  label: "data.gov.sg open data",
  kind: "official_api",
  termsUrl: "https://data.gov.sg/open-data-licence",
  availability(): AdapterAvailability {
    if (!process.env.DATAGOVSG_DATASET_ID) {
      return {
        available: false,
        reason: "No data.gov.sg dataset id configured.",
        whatIsNeeded:
          "Browse https://data.gov.sg/datasets, pick a relevant dataset (e.g. commercial rental statistics), and set DATAGOVSG_DATASET_ID in .env to its d_... id.",
      };
    }
    return { available: true };
  },
};

export async function fetchDataGovSgRows(limit = 100, offset = 0): Promise<{ rows: unknown[]; total: number }> {
  const avail = dataGovSgAdapter.availability();
  if (!avail.available) throw new Error(avail.reason);
  const id = process.env.DATAGOVSG_DATASET_ID!;
  const url = `https://data.gov.sg/api/action/datastore_search?resource_id=${encodeURIComponent(id)}&limit=${limit}&offset=${offset}`;
  const res = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`data.gov.sg responded with HTTP ${res.status}`);
  const data = (await res.json()) as {
    success?: boolean;
    result?: { records?: unknown[]; total?: number };
  };
  if (!data.success || !data.result) throw new Error("data.gov.sg returned an unsuccessful response");
  return { rows: data.result.records || [], total: data.result.total || 0 };
}
