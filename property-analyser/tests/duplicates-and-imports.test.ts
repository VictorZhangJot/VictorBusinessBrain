import { describe, it, expect } from "vitest";
import { dedupeKey, isProbableDuplicate } from "../lib/duplicates";
import { parseRows, saleRowSchema, rentalRowSchema, resolveArea } from "../lib/adapters/imports";
import { assessAskingPrice } from "../lib/askingPrice";

describe("duplicate detection", () => {
  const a = {
    street: "Anson Road",
    projectName: "Anson Vantage Tower",
    transactionDate: "2026-03-01",
    floorAreaSqm: 100,
    priceSgd: 2_500_000,
    propertyType: "office",
  };

  it("identical records share a key", () => {
    expect(dedupeKey(a)).toBe(dedupeKey({ ...a }));
    expect(isProbableDuplicate(a, { ...a })).toBe(true);
  });
  it("formatting differences still match", () => {
    expect(isProbableDuplicate(a, { ...a, projectName: "ANSON VANTAGE TOWER", street: "anson road" })).toBe(true);
  });
  it("tiny area drift (<1%) still matches; larger does not", () => {
    expect(isProbableDuplicate(a, { ...a, floorAreaSqm: 100.5 })).toBe(true);
    expect(isProbableDuplicate(a, { ...a, floorAreaSqm: 103 })).toBe(false);
  });
  it("different date or price is not a duplicate", () => {
    expect(isProbableDuplicate(a, { ...a, transactionDate: "2026-03-02" })).toBe(false);
    expect(isProbableDuplicate(a, { ...a, priceSgd: 2_500_100 })).toBe(false);
  });
});

describe("import validation", () => {
  it("accepts a valid sale row and normalises header case/spacing", () => {
    const r = parseRows(
      [{ "Transaction Date": "2026-01-15", "Property Type": "office", "Price SGD": "2,500,000", "Floor Area Sqm": "100" }],
      saleRowSchema
    );
    expect(r.valid).toHaveLength(1);
    expect(r.valid[0].row.price_sgd).toBe(2_500_000);
  });
  it("rejects invalid rows with line numbers and reasons", () => {
    const r = parseRows(
      [
        { transaction_date: "not-a-date", property_type: "office", price_sgd: "100" },
        { transaction_date: "2026-01-01", property_type: "", price_sgd: "-5" },
      ],
      saleRowSchema
    );
    expect(r.valid).toHaveLength(0);
    expect(r.errors).toHaveLength(2);
    expect(r.errors[0].line).toBe(2);
    expect(r.errors[0].message).toMatch(/date/i);
  });
  it("rental rows accept quarter-level aggregated data", () => {
    const r = parseRows(
      [{ lease_quarter: "2026Q1", property_type: "retail", rent_psf_monthly: "9.50", aggregation_level: "street" }],
      rentalRowSchema
    );
    expect(r.valid).toHaveLength(1);
    expect(r.valid[0].row.aggregation_level).toBe("street");
  });
  it("resolveArea converts either unit and preserves the given one", () => {
    expect(resolveArea(100, undefined).sqft).toBeCloseTo(1076.39, 2);
    expect(resolveArea(undefined, 1076.39).sqm).toBeCloseTo(100, 1);
    expect(resolveArea(undefined, undefined)).toEqual({ sqm: null, sqft: null });
  });
});

describe("asking-price assessment", () => {
  const comps = (psfs: number[]) => psfs.map((psf) => ({ psf, score: 80 }));

  it("returns insufficient with fewer than 3 comparables", () => {
    expect(assessAskingPrice(2_000_000, 1000, comps([2000, 2100])).band).toBe("insufficient");
  });
  it("classifies within / above / significantly above", () => {
    const c = comps([2000, 2050, 1950, 2000, 2100]);
    expect(assessAskingPrice(2_000_000, 1000, c).band).toBe("within"); // implied 2000 psf
    expect(assessAskingPrice(2_350_000, 1000, c).band).toBe("above"); // +17.5%
    expect(assessAskingPrice(2_800_000, 1000, c).band).toBe("significantly_above"); // +40%
    expect(assessAskingPrice(1_700_000, 1000, c).band).toBe("below");
    expect(assessAskingPrice(1_400_000, 1000, c).band).toBe("significantly_below");
  });
  it("no floor area means no implied PSF -> insufficient", () => {
    expect(assessAskingPrice(2_000_000, null, comps([2000, 2000, 2000])).band).toBe("insufficient");
  });
});
