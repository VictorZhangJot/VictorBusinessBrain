import { haversineMetres } from "./geo";

/**
 * Similarity scoring - documented formula (max 100 points):
 *
 *   Location proximity      25  (same building 25; <=250m 22; <=500m 18; <=1km 13; <=2km 8; else 3)
 *   Property-type match     15  (exact 15; related category 8; else 0)
 *   Floor-area similarity   15  (diff <=10% 15; <=25% 10; <=50% 5; else 0)
 *   Floor-level similarity  10  (same band 10; adjacent band 6; known but different 3)
 *   Tenure similarity       10  (same tenure type 10; both leasehold, different term 6; else 0)
 *   Remaining lease         10  (diff <=5y 10; <=15y 6; <=30y 3; else 0)
 *   Transaction recency     15  (<=6mo 15; <=12mo 12; <=24mo 9; <=36mo 6; <=60mo 3; else 1)
 *
 * Missing data scores 0 for that factor AND is listed in `missingFactors`.
 * A record with a missing major characteristic (type, area or location) is
 * never labelled "directly comparable".
 */

export interface ComparableSubject {
  buildingId?: string | null;
  lat?: number | null;
  lng?: number | null;
  propertyCategory: string;
  floorAreaSqm?: number | null;
  floorLevelBand?: string | null;
  tenureType: string; // freehold | leasehold_99 | ...
  remainingLeaseYears?: number | null; // Infinity for freehold
}

export interface ComparableCandidate {
  id: string;
  buildingId?: string | null;
  lat?: number | null;
  lng?: number | null;
  propertyType: string;
  floorAreaSqm?: number | null;
  floorLevelBand?: string | null;
  tenure?: string | null;
  remainingLeaseYearsAtSale?: number | null;
  transactionDate: Date;
}

export interface SimilarityResult {
  score: number;
  breakdown: Record<string, number>;
  distanceMetres: number | null;
  missingFactors: string[];
  directlyComparable: boolean;
}

const RELATED_TYPES: Record<string, string[]> = {
  office: ["strata_commercial", "mixed_commercial", "business_park"],
  retail: ["mall_unit", "mixed_commercial", "shophouse"],
  mall_unit: ["retail", "mixed_commercial"],
  shophouse: ["retail", "mixed_commercial"],
  mixed_commercial: ["office", "retail", "shophouse", "mall_unit", "strata_commercial"],
  strata_commercial: ["office", "mixed_commercial"],
  business_park: ["office"],
  industrial: [], // never treated as related to commercial categories
};

function normaliseTenure(t?: string | null): string | null {
  if (!t) return null;
  const s = t.toLowerCase();
  if (s.includes("free")) return "freehold";
  if (s.includes("999")) return "leasehold_999";
  if (s.includes("99")) return "leasehold_99";
  if (s.includes("lease")) return "leasehold_other";
  return t;
}

function parseFloorBand(band?: string | null): number | null {
  if (!band) return null;
  const m = band.match(/(\d+)/g);
  if (!m) return band.toUpperCase().startsWith("B") ? 0 : null;
  const nums = m.map(Number);
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function scoreComparable(
  subject: ComparableSubject,
  candidate: ComparableCandidate,
  asOfDate: Date = new Date()
): SimilarityResult {
  const breakdown: Record<string, number> = {};
  const missing: string[] = [];

  // Location (25)
  let distance: number | null = null;
  if (subject.buildingId && candidate.buildingId && subject.buildingId === candidate.buildingId) {
    breakdown.location = 25;
    distance = 0;
  } else if (
    subject.lat != null && subject.lng != null &&
    candidate.lat != null && candidate.lng != null
  ) {
    distance = haversineMetres(subject.lat, subject.lng, candidate.lat, candidate.lng);
    breakdown.location = distance <= 250 ? 22 : distance <= 500 ? 18 : distance <= 1000 ? 13 : distance <= 2000 ? 8 : 3;
  } else {
    breakdown.location = 0;
    missing.push("location");
  }

  // Property type (15)
  if (candidate.propertyType) {
    if (candidate.propertyType === subject.propertyCategory) breakdown.propertyType = 15;
    else if ((RELATED_TYPES[subject.propertyCategory] || []).includes(candidate.propertyType)) breakdown.propertyType = 8;
    else breakdown.propertyType = 0;
  } else {
    breakdown.propertyType = 0;
    missing.push("propertyType");
  }

  // Floor area (15)
  if (subject.floorAreaSqm && candidate.floorAreaSqm) {
    const diff = Math.abs(candidate.floorAreaSqm - subject.floorAreaSqm) / subject.floorAreaSqm;
    breakdown.floorArea = diff <= 0.1 ? 15 : diff <= 0.25 ? 10 : diff <= 0.5 ? 5 : 0;
  } else {
    breakdown.floorArea = 0;
    missing.push("floorArea");
  }

  // Floor level (10)
  const sBand = parseFloorBand(subject.floorLevelBand);
  const cBand = parseFloorBand(candidate.floorLevelBand);
  if (sBand !== null && cBand !== null) {
    const diff = Math.abs(sBand - cBand);
    breakdown.floorLevel = diff <= 2 ? 10 : diff <= 7 ? 6 : 3;
  } else {
    breakdown.floorLevel = 0;
    missing.push("floorLevel");
  }

  // Tenure (10)
  const cTenure = normaliseTenure(candidate.tenure);
  if (cTenure) {
    if (cTenure === subject.tenureType) breakdown.tenure = 10;
    else if (cTenure.startsWith("leasehold") && subject.tenureType.startsWith("leasehold")) breakdown.tenure = 6;
    else breakdown.tenure = 0;
  } else {
    breakdown.tenure = 0;
    missing.push("tenure");
  }

  // Remaining lease (10)
  const sLease = subject.remainingLeaseYears;
  const cLease = candidate.remainingLeaseYearsAtSale;
  if (sLease != null && cLease != null) {
    if (!Number.isFinite(sLease) && !Number.isFinite(cLease)) breakdown.remainingLease = 10; // both freehold
    else if (!Number.isFinite(sLease) || !Number.isFinite(cLease)) breakdown.remainingLease = 0;
    else {
      const diff = Math.abs(sLease - cLease);
      breakdown.remainingLease = diff <= 5 ? 10 : diff <= 15 ? 6 : diff <= 30 ? 3 : 0;
    }
  } else {
    breakdown.remainingLease = 0;
    missing.push("remainingLease");
  }

  // Recency (15)
  const ageMonths = (asOfDate.getTime() - candidate.transactionDate.getTime()) / (86_400_000 * 30.4375);
  breakdown.recency =
    ageMonths <= 6 ? 15 : ageMonths <= 12 ? 12 : ageMonths <= 24 ? 9 : ageMonths <= 36 ? 6 : ageMonths <= 60 ? 3 : 1;

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const majorMissing = missing.some((f) => ["location", "propertyType", "floorArea"].includes(f));
  const directlyComparable = !majorMissing && breakdown.propertyType > 0 && score >= 60;

  return { score, breakdown, distanceMetres: distance, missingFactors: missing, directlyComparable };
}
