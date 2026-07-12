import { describe, it, expect } from "vitest";
import { scoreComparable } from "../lib/comparables";

const NOW = new Date("2026-07-13");

const subject = {
  buildingId: "b1",
  lat: 1.2746,
  lng: 103.8452,
  propertyCategory: "office",
  floorAreaSqm: 100,
  floorLevelBand: "11-15",
  tenureType: "leasehold_99",
  remainingLeaseYears: 45,
};

describe("comparable scoring", () => {
  it("same building, same everything, recent -> near-perfect score", () => {
    const r = scoreComparable(subject, {
      id: "t1",
      buildingId: "b1",
      propertyType: "office",
      floorAreaSqm: 102,
      floorLevelBand: "11-15",
      tenure: "leasehold_99",
      remainingLeaseYearsAtSale: 46,
      transactionDate: new Date("2026-05-01"),
    }, NOW);
    expect(r.score).toBe(100);
    expect(r.directlyComparable).toBe(true);
  });

  it("industrial candidate scores 0 for type against an office subject", () => {
    const r = scoreComparable(subject, {
      id: "t2",
      buildingId: "b9",
      lat: 1.33,
      lng: 103.9,
      propertyType: "industrial",
      floorAreaSqm: 100,
      transactionDate: new Date("2026-01-01"),
    }, NOW);
    expect(r.breakdown.propertyType).toBe(0);
    expect(r.directlyComparable).toBe(false);
  });

  it("missing major data is disclosed and blocks 'directly comparable'", () => {
    const r = scoreComparable(subject, {
      id: "t3",
      buildingId: "b2",
      lat: 1.2748,
      lng: 103.8455,
      propertyType: "office",
      floorAreaSqm: null,
      transactionDate: new Date("2026-06-01"),
    }, NOW);
    expect(r.missingFactors).toContain("floorArea");
    expect(r.directlyComparable).toBe(false);
  });

  it("distance decays the location score", () => {
    const near = scoreComparable(subject, {
      id: "t4", buildingId: "b2", lat: 1.2750, lng: 103.8455, propertyType: "office",
      floorAreaSqm: 100, transactionDate: new Date("2026-06-01"),
    }, NOW);
    const far = scoreComparable(subject, {
      id: "t5", buildingId: "b3", lat: 1.30, lng: 103.90, propertyType: "office",
      floorAreaSqm: 100, transactionDate: new Date("2026-06-01"),
    }, NOW);
    expect(near.breakdown.location).toBeGreaterThan(far.breakdown.location);
  });

  it("older transactions score lower on recency", () => {
    const recent = scoreComparable(subject, {
      id: "t6", buildingId: "b1", propertyType: "office", floorAreaSqm: 100,
      transactionDate: new Date("2026-06-01"),
    }, NOW);
    const old = scoreComparable(subject, {
      id: "t7", buildingId: "b1", propertyType: "office", floorAreaSqm: 100,
      transactionDate: new Date("2019-06-01"),
    }, NOW);
    expect(recent.breakdown.recency).toBe(15);
    expect(old.breakdown.recency).toBe(1);
  });

  it("freehold subject vs freehold candidate scores full lease points", () => {
    const r = scoreComparable(
      { ...subject, tenureType: "freehold", remainingLeaseYears: Infinity },
      {
        id: "t8", buildingId: "b1", propertyType: "office", floorAreaSqm: 100,
        tenure: "Freehold", remainingLeaseYearsAtSale: Infinity,
        transactionDate: new Date("2026-06-01"),
      },
      NOW
    );
    expect(r.breakdown.tenure).toBe(10);
    expect(r.breakdown.remainingLease).toBe(10);
  });
});
