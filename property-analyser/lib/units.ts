import Decimal from "decimal.js";

/** Official conversion factor: 1 square metre = 10.7639 square feet. */
export const SQM_TO_SQFT = new Decimal("10.7639");

export function sqmToSqft(sqm: number): number {
  return new Decimal(sqm).mul(SQM_TO_SQFT).toDecimalPlaces(2).toNumber();
}

export function sqftToSqm(sqft: number): number {
  return new Decimal(sqft).div(SQM_TO_SQFT).toDecimalPlaces(2).toNumber();
}

/** Price per square metre -> price per square foot. */
export function psmToPsf(psm: number): number {
  return new Decimal(psm).div(SQM_TO_SQFT).toDecimalPlaces(2).toNumber();
}

/** Price per square foot -> price per square metre. */
export function psfToPsm(psf: number): number {
  return new Decimal(psf).mul(SQM_TO_SQFT).toDecimalPlaces(2).toNumber();
}

export function annualToMonthly(annual: number): number {
  return new Decimal(annual).div(12).toDecimalPlaces(2).toNumber();
}

export function monthlyToAnnual(monthly: number): number {
  return new Decimal(monthly).mul(12).toDecimalPlaces(2).toNumber();
}
