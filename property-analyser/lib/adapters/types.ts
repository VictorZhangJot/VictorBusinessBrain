/**
 * Modular data-adapter architecture. Every source implements SourceAdapter so
 * connectors can be added or replaced without touching the rest of the app.
 */

export type AdapterAvailability =
  | { available: true }
  | { available: false; reason: string; whatIsNeeded: string };

export interface SourceRecordMeta {
  sourceName: string;
  sourceUrl?: string;
  retrievalDate: string; // ISO
  reportingPeriod?: string;
  recordStatus: "official" | "user" | "demo" | "estimated" | "derived";
  confidence: "high" | "medium" | "low" | "insufficient";
  limitation?: string;
}

export interface SourceAdapter {
  /** Stable machine name, e.g. "onemap". */
  name: string;
  /** Human label shown in the Sources tab. */
  label: string;
  kind: "official_api" | "official_download" | "subscription_export" | "user_upload" | "manual_entry";
  /** Checks configuration/credentials WITHOUT calling the network. */
  availability(): AdapterAvailability;
  /** Terms-of-use URL the operator must review before enabling the source. */
  termsUrl?: string;
}
