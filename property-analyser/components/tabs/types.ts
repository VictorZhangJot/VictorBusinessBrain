export interface Sale {
  id: string;
  transactionDate: string;
  projectName: string | null;
  street: string | null;
  unitIdentifier: string | null;
  floorLevelBand: string | null;
  floorAreaSqm: number | null;
  floorAreaSqft: number | null;
  propertyType: string;
  priceSgd: number;
  psf: number | null;
  psm: number | null;
  typeOfSale: string | null;
  tenure: string | null;
  remainingLeaseYearsAtSale: number | null;
  sourceName: string;
  sourceUrl: string | null;
  retrievalDate: string;
  reportingPeriod: string | null;
  recordStatus: string;
  confidence: string;
  possibleDuplicate: boolean;
}

export interface Rental {
  id: string;
  leaseStartDate: string | null;
  leaseQuarter: string | null;
  monthlyRentSgd: number | null;
  rentPsfMonthly: number | null;
  floorAreaSqm: number | null;
  street: string | null;
  propertyType: string;
  leaseTermMonths: number | null;
  aggregationLevel: string;
  observations: number | null;
  sourceName: string;
  reportingPeriod: string | null;
  recordStatus: string;
  confidence: string;
  limitation: string | null;
}

export interface NearbyProjectWithImpact {
  id: string;
  name: string;
  projectType: string;
  description: string | null;
  lat: number;
  lng: number;
  status: string;
  expectedCompletion: string | null;
  announcedDate: string | null;
  sourceName: string;
  sourceUrl: string | null;
  retrievalDate: string;
  recordStatus: string;
  confidence: string;
  distanceMetres: number;
  impact: {
    direction: string;
    horizon: string;
    affected: string[];
    reasoning: string;
    assumptions: string[];
    confidenceScore: number;
    nature: string;
  };
}

export interface SwotItem {
  kind: "strength" | "weakness";
  title: string;
  evidence: string;
  source: string;
  importance: string;
  confidence: string;
  basis: string;
}

export interface AnalysisPayload {
  building: {
    id: string;
    name: string;
    address: string;
    postalCode: string | null;
    lat: number | null;
    lng: number | null;
    planningArea: string | null;
    subzone: string | null;
    propertyCategory: string;
    developmentType: string | null;
    completionYear: number | null;
    topDate: string | null;
    tenureType: string;
    leaseCommencement: string | null;
    leaseTermYears: number | null;
    leaseSourceQuality: string | null;
    grossFloorAreaSqm: number | null;
    plotRatio: number | null;
    masterPlanZoning: string | null;
    allowableUse: string | null;
    conservationStatus: string | null;
    numUnits: number | null;
    carParkLots: number | null;
    nearestMrt: string | null;
    nearestMrtMetres: number | null;
    recordStatus: string;
    sourceName: string | null;
    sourceUrl: string | null;
    retrievalDate: string | null;
    confidence: string;
    properties: { id: string; unitNumber: string | null; floorLevel: string | null; floorAreaSqm: number | null }[];
  };
  valuationDate: string;
  leaseBalance:
    | { kind: "freehold" }
    | { kind: "insufficient"; reason: string }
    | { kind: "leasehold"; expiryDate: string; remainingYears: number; remainingMonths: number; remainingDays: number; totalRemainingDays: number; pctRemaining: number; isEstimate: boolean };
  saleStats: {
    count: number;
    latest: { date: string; price: number; psf: number | null; areaSqft: number | null } | null;
    medianPrice: number | null;
    medianPsf: number | null;
    meanPsf: number | null;
    min: number | null;
    max: number | null;
    yoyChangePct: number | null;
    threeYearChangePct: number | null;
    fiveYearChangePct: number | null;
    cagrPct: number | null;
    volumeByYear: Record<string, number>;
  };
  rentalStats: {
    count: number;
    medianRentPsf: number | null;
    meanRentPsf: number | null;
    min: number | null;
    max: number | null;
    trendPct: number | null;
    aggregationLevels: string[];
    marketRentEstimate: {
      lowPsf: number;
      basePsf: number;
      highPsf: number;
      method: string;
      recordsUsed: number;
      confidence: string;
      limitations: string[];
    } | null;
  };
  sales: Sale[];
  rentals: Rental[];
  nearbyProjects: NearbyProjectWithImpact[];
  swot: SwotItem[];
  overallConfidence: { level: string; score: number };
  hasDemoData: boolean;
}

export interface ComparableRow {
  id: string;
  buildingName: string;
  transactionDate: string;
  priceSgd: number;
  psf: number | null;
  floorAreaSqft: number | null;
  floorLevelBand: string | null;
  propertyType: string;
  tenure: string | null;
  remainingLeaseYearsAtSale: number | null;
  sourceName: string;
  recordStatus: string;
  confidence: string;
  similarity: {
    score: number;
    breakdown: Record<string, number>;
    distanceMetres: number | null;
    missingFactors: string[];
    directlyComparable: boolean;
  };
}
