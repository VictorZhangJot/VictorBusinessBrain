import { SourceAdapter } from "./types";
import { oneMapAdapter } from "./onemap";
import { uraTransactionAdapter } from "./ura";
import { dataGovSgAdapter } from "./datagovsg";
import { userUploadAdapter, realisImportAdapter, masterPlanAdapter, slaPropertyAdapter } from "./imports";

/** Central registry - add or replace sources here without touching the app. */
export const adapters: SourceAdapter[] = [
  oneMapAdapter,
  uraTransactionAdapter,
  dataGovSgAdapter,
  realisImportAdapter,
  userUploadAdapter,
  masterPlanAdapter,
  slaPropertyAdapter,
];

export function adapterStatuses() {
  return adapters.map((a) => ({
    name: a.name,
    label: a.label,
    kind: a.kind,
    termsUrl: a.termsUrl ?? null,
    ...(() => {
      const av = a.availability();
      return av.available
        ? { available: true as const, reason: null, whatIsNeeded: null }
        : { available: false as const, reason: av.reason, whatIsNeeded: av.whatIsNeeded };
    })(),
  }));
}
