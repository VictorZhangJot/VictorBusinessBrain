/**
 * Rule-based vicinity impact assessment. Each assessment carries reasoning,
 * assumptions and a confidence score, and is explicitly labelled an OPINION
 * derived from typology rules - not a fact.
 */

export type ImpactDirection =
  | "strong_positive"
  | "moderate_positive"
  | "neutral_uncertain"
  | "moderate_negative"
  | "strong_negative";

export type ImpactHorizon = "immediate" | "near_term" | "medium_term" | "long_term";

export interface ImpactAssessment {
  direction: ImpactDirection;
  horizon: ImpactHorizon;
  affected: string[]; // dimensions most affected
  reasoning: string;
  assumptions: string[];
  confidenceScore: number; // 0-100
  nature: "opinion";
}

const CONFIRMED = ["existing", "under_construction", "confirmed", "tendered", "gazetted"];

function horizonFromStatus(status: string, expectedCompletion?: string | null): ImpactHorizon {
  if (status === "existing") return "immediate";
  if (expectedCompletion) {
    const year = parseInt(expectedCompletion, 10);
    if (!Number.isNaN(year)) {
      const diff = year - new Date().getFullYear();
      if (diff <= 1) return "immediate";
      if (diff <= 3) return "near_term";
      if (diff <= 5) return "medium_term";
      return "long_term";
    }
  }
  if (status === "under_construction") return "near_term";
  if (["confirmed", "tendered", "gazetted"].includes(status)) return "medium_term";
  return "long_term";
}

export function assessProjectImpact(
  project: { projectType: string; status: string; expectedCompletion?: string | null; name: string },
  distanceMetres: number,
  subjectCategory: string
): ImpactAssessment {
  const confirmed = CONFIRMED.includes(project.status);
  const near = distanceMetres <= 500;
  const walkable = distanceMetres <= 1000;
  const horizon = horizonFromStatus(project.status, project.expectedCompletion);
  const baseConfidence = confirmed ? 55 : project.status === "proposed" ? 30 : 20;
  const proximityBoost = near ? 15 : walkable ? 8 : 0;
  const confidenceScore = Math.min(85, baseConfidence + proximityBoost);

  const t = project.projectType;

  if (t === "mrt" || t === "mrt_station" || t === "road") {
    return {
      direction: near && confirmed ? "strong_positive" : "moderate_positive",
      horizon,
      affected: ["accessibility", "foot_traffic", "rental_demand", "capital_value"],
      reasoning: `Transport infrastructure ${distanceMetres} m away typically improves accessibility and catchment once open. Short-term construction disruption is possible.`,
      assumptions: [
        "The project completes as announced.",
        "Improved access translates into demand for this property type - not guaranteed for upper-floor strata units.",
      ],
      confidenceScore,
      nature: "opinion",
    };
  }
  if (t === "residential") {
    return {
      direction: subjectCategory === "retail" || subjectCategory === "mall_unit" || subjectCategory === "shophouse"
        ? "moderate_positive"
        : "neutral_uncertain",
      horizon,
      affected: ["resident_catchment", "foot_traffic", "rental_demand"],
      reasoning: `New homes ${distanceMetres} m away enlarge the resident catchment, which mainly benefits retail and F&B uses; the effect on offices is limited.`,
      assumptions: ["Occupancy of the new homes builds up over 1-3 years after completion."],
      confidenceScore,
      nature: "opinion",
    };
  }
  if (t === "office" || t === "retail" || t === "mixed" || t === "business_park") {
    const competing =
      (t === "office" && ["office", "strata_commercial", "business_park"].includes(subjectCategory)) ||
      (t === "retail" && ["retail", "mall_unit", "shophouse"].includes(subjectCategory)) ||
      t === "mixed";
    if (competing && walkable) {
      return {
        direction: confirmed ? "moderate_negative" : "neutral_uncertain",
        horizon,
        affected: ["competition", "supply_of_competing_units", "rental_rate", "construction_disruption"],
        reasoning: `A ${t} project ${distanceMetres} m away adds directly competing space, which can pressure rents on completion; during construction it may also disrupt access and parking. New developments can also raise the profile of the precinct, so the net effect depends on scale.`,
        assumptions: ["The project's use mix competes with this property.", "No offsetting demand growth is assumed."],
        confidenceScore,
        nature: "opinion",
      };
    }
    return {
      direction: "moderate_positive",
      horizon,
      affected: ["office_worker_population", "foot_traffic", "tenant_profile"],
      reasoning: `A ${t} project ${distanceMetres} m away brings workers/shoppers to the area without competing directly with a ${subjectCategory} property.`,
      assumptions: ["The project reaches healthy occupancy."],
      confidenceScore,
      nature: "opinion",
    };
  }
  if (["healthcare", "education", "civic"].includes(t)) {
    return {
      direction: "moderate_positive",
      horizon,
      affected: ["foot_traffic", "tenant_catchment", "visibility"],
      reasoning: `Institutional development ${distanceMetres} m away generally adds steady daytime population and public-realm investment.`,
      assumptions: ["Visitor flows pass near the subject property."],
      confidenceScore,
      nature: "opinion",
    };
  }
  if (t === "redevelopment") {
    return {
      direction: "neutral_uncertain",
      horizon,
      affected: ["redevelopment_potential", "construction_disruption", "supply_of_competing_units"],
      reasoning: `Redevelopment ${distanceMetres} m away cuts both ways: disruption and future supply, but also precinct renewal.`,
      assumptions: ["Outcome depends on the replacement use, which is not yet evidenced."],
      confidenceScore: Math.min(confidenceScore, 40),
      nature: "opinion",
    };
  }
  return {
    direction: "neutral_uncertain",
    horizon,
    affected: [],
    reasoning: `No typology rule covers a "${t}" project; impact has not been scored rather than guessed.`,
    assumptions: [],
    confidenceScore: 15,
    nature: "opinion",
  };
}
