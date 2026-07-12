const SG_LOCALE = "en-SG";
export const SG_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Singapore";
export const CURRENCY = process.env.APP_CURRENCY || "SGD";

export function fmtSGD(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(SG_LOCALE, {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function fmtNum(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(SG_LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function fmtPct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value) || !Number.isFinite(value)) return "—";
  return `${new Intl.NumberFormat(SG_LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)}%`;
}

export function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(SG_LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: SG_TIMEZONE,
  }).format(d);
}

export const NOT_AVAILABLE = "Not available from the connected sources";
