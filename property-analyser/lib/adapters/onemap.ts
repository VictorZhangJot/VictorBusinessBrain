import { SourceAdapter, AdapterAvailability } from "./types";
import { log } from "../log";

/**
 * OneMapAdapter - Singapore Land Authority's OneMap.
 * The address-search endpoint below is public and keyless (verified live).
 * Terms: https://www.onemap.gov.sg/legal/termsofuse.html
 */

export interface OneMapResult {
  buildingName: string;
  address: string;
  postalCode: string | null;
  lat: number;
  lng: number;
  blkNo: string | null;
  roadName: string | null;
}

const SEARCH_URL = "https://www.onemap.gov.sg/api/common/elastic/search";

export const oneMapAdapter: SourceAdapter = {
  name: "onemap",
  label: "OneMap (Singapore Land Authority)",
  kind: "official_api",
  termsUrl: "https://www.onemap.gov.sg/legal/termsofuse.html",
  availability(): AdapterAvailability {
    return { available: true };
  },
};

export async function oneMapSearch(query: string, signal?: AbortSignal): Promise<OneMapResult[]> {
  const url = `${SEARCH_URL}?searchVal=${encodeURIComponent(query)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
  const res = await fetch(url, { signal, headers: { Accept: "application/json" }, next: { revalidate: 3600 } });
  if (!res.ok) {
    log.warn("onemap search failed", { status: res.status, query });
    throw new Error(`OneMap responded with HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    results?: {
      SEARCHVAL?: string;
      BUILDING?: string;
      ADDRESS?: string;
      POSTAL?: string;
      LATITUDE?: string;
      LONGITUDE?: string;
      BLK_NO?: string;
      ROAD_NAME?: string;
    }[];
  };
  return (data.results || [])
    .filter((r) => r.LATITUDE && r.LONGITUDE)
    .map((r) => ({
      buildingName: r.BUILDING && r.BUILDING !== "NIL" ? r.BUILDING : r.SEARCHVAL || "",
      address: r.ADDRESS || "",
      postalCode: r.POSTAL && r.POSTAL !== "NIL" ? r.POSTAL : null,
      lat: Number(r.LATITUDE),
      lng: Number(r.LONGITUDE),
      blkNo: r.BLK_NO && r.BLK_NO !== "NIL" ? r.BLK_NO : null,
      roadName: r.ROAD_NAME && r.ROAD_NAME !== "NIL" ? r.ROAD_NAME : null,
    }));
}
