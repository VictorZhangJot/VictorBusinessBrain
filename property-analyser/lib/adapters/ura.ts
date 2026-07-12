import { SourceAdapter, AdapterAvailability } from "./types";
import { log } from "../log";

/**
 * UraTransactionAdapter - URA Data Service API.
 *
 * INTEGRATION POINT (clearly marked, per project rules):
 *  - Register free at https://www.ura.gov.sg/maps/api/ to receive an access key.
 *  - Put the key in URA_ACCESS_KEY.
 *  - After registration URA's documentation lists the exact `service` ids
 *    available to your account. Put the commercial-transactions service id in
 *    URA_COMM_SERVICE. This app deliberately does NOT hard-code a service id
 *    it cannot verify - fabricating one would break the no-fabrication rule.
 *  - URA also publishes commercial transactions through the Property Market
 *    Information web tool (manual CSV download), which the Import page accepts.
 *
 * The adapter exchanges the access key for a daily token, then calls the
 * configured service. Without both env vars it reports itself unavailable and
 * the UI directs the user to the import workflow instead.
 */

const TOKEN_URL = "https://eservice.ura.gov.sg/uraDataService/insertNewToken/v1";
const DATA_URL = "https://eservice.ura.gov.sg/uraDataService/invokeUraDS/v1";

let cachedToken: { token: string; day: string } | null = null;

export const uraTransactionAdapter: SourceAdapter = {
  name: "ura_data_service",
  label: "URA Data Service API",
  kind: "official_api",
  termsUrl: "https://www.ura.gov.sg/maps/api/#terms-of-use",
  availability(): AdapterAvailability {
    if (!process.env.URA_ACCESS_KEY) {
      return {
        available: false,
        reason: "No URA access key configured.",
        whatIsNeeded:
          "Register (free) at https://www.ura.gov.sg/maps/api/ and set URA_ACCESS_KEY in .env. Alternatively, download commercial transactions from URA's Property Market Information tool and use the Import page.",
      };
    }
    if (!process.env.URA_COMM_SERVICE) {
      return {
        available: false,
        reason: "URA access key present but no service id configured.",
        whatIsNeeded:
          "Set URA_COMM_SERVICE to the commercial-transactions service id listed in the API documentation provided with your URA registration.",
      };
    }
    return { available: true };
  },
};

async function getToken(): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  if (cachedToken && cachedToken.day === today) return cachedToken.token;
  const res = await fetch(TOKEN_URL, {
    headers: { AccessKey: process.env.URA_ACCESS_KEY!, "User-Agent": "sg-commercial-property-analyser" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`URA token request failed: HTTP ${res.status}`);
  const data = (await res.json()) as { Status?: string; Result?: string };
  if (data.Status !== "Success" || !data.Result) {
    throw new Error(`URA token request rejected: ${JSON.stringify(data)}`);
  }
  cachedToken = { token: data.Result, day: today };
  return data.Result;
}

/**
 * Fetches raw rows from the configured URA service. The caller maps fields -
 * field names differ by service and are documented in URA's registration pack.
 */
export async function fetchUraService(extraParams: Record<string, string> = {}): Promise<unknown[]> {
  const avail = uraTransactionAdapter.availability();
  if (!avail.available) throw new Error(avail.reason);
  const token = await getToken();
  const params = new URLSearchParams({ service: process.env.URA_COMM_SERVICE!, ...extraParams });
  const res = await fetch(`${DATA_URL}?${params}`, {
    headers: {
      AccessKey: process.env.URA_ACCESS_KEY!,
      Token: token,
      "User-Agent": "sg-commercial-property-analyser",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`URA data request failed: HTTP ${res.status}`);
  const data = (await res.json()) as { Status?: string; Result?: unknown[]; Message?: string };
  if (data.Status !== "Success") {
    log.error("URA data request rejected", { message: data.Message });
    throw new Error(`URA data request rejected: ${data.Message || "unknown error"}`);
  }
  return data.Result || [];
}
