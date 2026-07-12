import { LeaseBalance } from "./lease";
import { haversineMetres } from "./geo";

export interface SwotItem {
  kind: "strength" | "weakness";
  title: string;
  evidence: string;
  source: string;
  importance: "low" | "medium" | "high";
  confidence: "high" | "medium" | "low";
  basis: "verified" | "inference";
}

interface SwotContext {
  building: {
    name: string;
    tenureType: string;
    completionYear?: number | null;
    nearestMrt?: string | null;
    nearestMrtMetres?: number | null;
    lat?: number | null;
    lng?: number | null;
    conservationStatus?: string | null;
  };
  leaseBalance: LeaseBalance;
  saleCount3y: number;
  psfTrend3yPct: number | null;
  rentTrendPct: number | null;
  rentalObservations: number;
  nearbyProjects: {
    name: string;
    projectType: string;
    status: string;
    lat: number;
    lng: number;
    expectedCompletion?: string | null;
    sourceName: string;
  }[];
}

/**
 * Rule-based SWOT generation. Every rule fires only when the underlying data
 * exists, and each item carries its evidence, source and basis. No rule emits
 * a generic claim that would be true of every property.
 */
export function generateSwot(ctx: SwotContext): SwotItem[] {
  const items: SwotItem[] = [];
  const b = ctx.building;
  const thisYear = new Date().getFullYear();

  // Tenure / lease
  if (b.tenureType === "freehold") {
    items.push({
      kind: "strength",
      title: "Freehold tenure",
      evidence: "Recorded tenure is freehold - no lease decay and no financing haircut for a short lease.",
      source: "Property record (tenure field)",
      importance: "high",
      confidence: "high",
      basis: "verified",
    });
  }
  if (ctx.leaseBalance.kind === "leasehold") {
    const yrs = ctx.leaseBalance.remainingYears;
    if (yrs >= 900) {
      items.push({
        kind: "strength",
        title: "999-year lease (effectively freehold)",
        evidence: `Approximately ${yrs} years remain on the lease.`,
        source: "Lease-balance calculation from recorded lease terms",
        importance: "high",
        confidence: ctx.leaseBalance.isEstimate ? "medium" : "high",
        basis: ctx.leaseBalance.isEstimate ? "inference" : "verified",
      });
    } else if (yrs < 30) {
      items.push({
        kind: "weakness",
        title: "Short remaining lease",
        evidence: `Roughly ${yrs} years remain. Bank financing is typically harder and value decay accelerates below ~30 years.`,
        source: "Lease-balance calculation from recorded lease terms",
        importance: "high",
        confidence: ctx.leaseBalance.isEstimate ? "medium" : "high",
        basis: "verified",
      });
    } else if (yrs < 60) {
      items.push({
        kind: "weakness",
        title: "Lease decay is becoming material",
        evidence: `Roughly ${yrs} years remain; buyers' financing terms and exit liquidity tighten as the lease shortens.`,
        source: "Lease-balance calculation from recorded lease terms",
        importance: "medium",
        confidence: "medium",
        basis: "inference",
      });
    }
  }

  // Building age
  if (b.completionYear) {
    const age = thisYear - b.completionYear;
    if (age <= 10) {
      items.push({
        kind: "strength",
        title: "Recently completed building",
        evidence: `Completed in ${b.completionYear} (~${age} years old); lower near-term maintenance and capex risk.`,
        source: "Property record (completion year)",
        importance: "medium",
        confidence: "medium",
        basis: "verified",
      });
    } else if (age >= 40) {
      items.push({
        kind: "weakness",
        title: "Ageing building",
        evidence: `Completed in ${b.completionYear} (~${age} years old); expect higher maintenance cost and possible obsolescence versus newer stock.`,
        source: "Property record (completion year)",
        importance: "medium",
        confidence: "medium",
        basis: "verified",
      });
    }
  }

  // MRT access
  if (b.nearestMrtMetres != null && b.nearestMrt) {
    if (b.nearestMrtMetres <= 400) {
      items.push({
        kind: "strength",
        title: "Strong MRT accessibility",
        evidence: `${b.nearestMrt} is about ${Math.round(b.nearestMrtMetres)} m away (roughly a 5-minute walk).`,
        source: "Recorded MRT distance",
        importance: "high",
        confidence: "high",
        basis: "verified",
      });
    } else if (b.nearestMrtMetres > 1000) {
      items.push({
        kind: "weakness",
        title: "Weak MRT accessibility",
        evidence: `Nearest station (${b.nearestMrt}) is about ${Math.round(b.nearestMrtMetres)} m away.`,
        source: "Recorded MRT distance",
        importance: "medium",
        confidence: "high",
        basis: "verified",
      });
    }
  }

  // Conservation
  if (b.conservationStatus && b.conservationStatus.toLowerCase().includes("conserv")) {
    items.push({
      kind: "weakness",
      title: "Conservation restrictions",
      evidence: `Status recorded as "${b.conservationStatus}" - works and use changes need conservation approval; scarcity can also support value.`,
      source: "Property record (conservation status)",
      importance: "medium",
      confidence: "medium",
      basis: "verified",
    });
  }

  // Liquidity
  if (ctx.saleCount3y >= 8) {
    items.push({
      kind: "strength",
      title: "Good transaction liquidity",
      evidence: `${ctx.saleCount3y} recorded sales in this building/vicinity in the last 3 years - pricing evidence and exit liquidity are comparatively strong.`,
      source: "Sale-transaction records in this database",
      importance: "medium",
      confidence: "medium",
      basis: "verified",
    });
  } else if (ctx.saleCount3y > 0 && ctx.saleCount3y <= 2) {
    items.push({
      kind: "weakness",
      title: "Thin transaction liquidity",
      evidence: `Only ${ctx.saleCount3y} recorded sale(s) in the last 3 years - pricing is harder to evidence and exits may take longer.`,
      source: "Sale-transaction records in this database",
      importance: "medium",
      confidence: "medium",
      basis: "verified",
    });
  }

  // Price trend
  if (ctx.psfTrend3yPct != null) {
    if (ctx.psfTrend3yPct >= 10) {
      items.push({
        kind: "strength",
        title: "Rising transacted prices",
        evidence: `Median PSF is up ~${ctx.psfTrend3yPct.toFixed(1)}% over 3 years in the recorded data.`,
        source: "Sale-transaction records in this database",
        importance: "medium",
        confidence: "medium",
        basis: "verified",
      });
    } else if (ctx.psfTrend3yPct <= -10) {
      items.push({
        kind: "weakness",
        title: "Declining transacted prices",
        evidence: `Median PSF is down ~${Math.abs(ctx.psfTrend3yPct).toFixed(1)}% over 3 years in the recorded data.`,
        source: "Sale-transaction records in this database",
        importance: "high",
        confidence: "medium",
        basis: "verified",
      });
    }
  }

  // Rental trend
  if (ctx.rentTrendPct != null && ctx.rentalObservations >= 4) {
    if (ctx.rentTrendPct <= -8) {
      items.push({
        kind: "weakness",
        title: "Declining rental trend",
        evidence: `Median rent PSF is down ~${Math.abs(ctx.rentTrendPct).toFixed(1)}% across ${ctx.rentalObservations} rental records.`,
        source: "Rental records in this database",
        importance: "high",
        confidence: "medium",
        basis: "verified",
      });
    } else if (ctx.rentTrendPct >= 8) {
      items.push({
        kind: "strength",
        title: "Rental resilience",
        evidence: `Median rent PSF is up ~${ctx.rentTrendPct.toFixed(1)}% across ${ctx.rentalObservations} rental records.`,
        source: "Rental records in this database",
        importance: "medium",
        confidence: "medium",
        basis: "verified",
      });
    }
  }

  // Nearby projects
  if (b.lat != null && b.lng != null) {
    for (const p of ctx.nearbyProjects) {
      const dist = haversineMetres(b.lat, b.lng, p.lat, p.lng);
      if (dist > 2000) continue;
      const confirmed = ["under_construction", "confirmed", "gazetted", "tendered"].includes(p.status);
      if (p.projectType === "mrt" || p.projectType === "mrt_station") {
        items.push({
          kind: "strength",
          title: `Upcoming transport: ${p.name}`,
          evidence: `${p.name} (${p.status.replace(/_/g, " ")}) ~${dist} m away${p.expectedCompletion ? `, expected ${p.expectedCompletion}` : ""}. Improved access typically supports rents and footfall.`,
          source: p.sourceName,
          importance: confirmed ? "high" : "low",
          confidence: confirmed ? "medium" : "low",
          basis: "inference",
        });
      } else if (["office", "retail", "mixed"].includes(p.projectType) && confirmed && dist <= 1000) {
        items.push({
          kind: "weakness",
          title: `Competing new supply: ${p.name}`,
          evidence: `${p.projectType} project (${p.status.replace(/_/g, " ")}) ~${dist} m away${p.expectedCompletion ? `, expected ${p.expectedCompletion}` : ""} adds competing space; construction may also disrupt access short-term.`,
          source: p.sourceName,
          importance: "medium",
          confidence: "medium",
          basis: "inference",
        });
      } else if (p.projectType === "residential" && confirmed && dist <= 1000) {
        items.push({
          kind: "strength",
          title: `Growing resident catchment: ${p.name}`,
          evidence: `Residential project (${p.status.replace(/_/g, " ")}) ~${dist} m away${p.expectedCompletion ? `, expected ${p.expectedCompletion}` : ""} enlarges the customer base for retail/F&B uses.`,
          source: p.sourceName,
          importance: "medium",
          confidence: "medium",
          basis: "inference",
        });
      }
    }
  }

  return items;
}
