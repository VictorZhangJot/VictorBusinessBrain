/**
 * Seed data - ENTIRELY FICTIONAL demonstration records.
 * Every record is flagged recordStatus = "demo" and the UI shows a banner
 * explaining that demo data must not be used for real decisions.
 * Building names carry a "(Demo)" suffix so they cannot be mistaken for
 * verified records of real buildings.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_SOURCE = "Demo dataset (fictional records for demonstration)";
const SQM_TO_SQFT = 10.7639;

// Deterministic pseudo-random generator so the seed is reproducible.
function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

async function main() {
  console.log("Seeding demo data...");

  // --- Sources ---------------------------------------------------------------
  const sources = [
    { name: "OneMap (Singapore Land Authority)", kind: "official_api", baseUrl: "https://www.onemap.gov.sg", termsUrl: "https://www.onemap.gov.sg/legal/termsofuse.html", authority: "government", notes: "Address search + basemap tiles. Keyless endpoints in use." },
    { name: "URA Data Service API", kind: "official_api", baseUrl: "https://eservice.ura.gov.sg/uraDataService", termsUrl: "https://www.ura.gov.sg/maps/api/#terms-of-use", authority: "government", notes: "Needs free access key + service id (see .env.example)." },
    { name: "URA Property Market Information (manual download)", kind: "official_download", baseUrl: "https://eservice.ura.gov.sg/property-market-information/pmiCommercialTransactionSearch", termsUrl: "https://www.ura.gov.sg/Corporate/Terms-of-Use", authority: "government", notes: "Download CSV manually, then use the Import page." },
    { name: "data.gov.sg open data", kind: "official_api", baseUrl: "https://data.gov.sg", termsUrl: "https://data.gov.sg/open-data-licence", authority: "government", notes: "Set DATAGOVSG_DATASET_ID to enable." },
    { name: "REALIS export import", kind: "subscription_export", baseUrl: "https://www.ura.gov.sg/reis/index", termsUrl: "https://www.ura.gov.sg/reis/index", authority: "government", notes: "Import XLSX/CSV exported from the user's own subscription. No automated extraction." },
    { name: "SLA INLIS (manual entry)", kind: "manual_entry", baseUrl: "https://app.sla.gov.sg/inlis", termsUrl: "https://app.sla.gov.sg/inlis", authority: "government", notes: "Paid title extracts; enter tenure details manually." },
    { name: DEMO_SOURCE, kind: "manual_entry", baseUrl: null, termsUrl: null, authority: "user", notes: "Fictional records used to demonstrate the app before real data is imported." },
  ];
  for (const s of sources) {
    await prisma.propertySource.upsert({ where: { name: s.name }, create: s, update: s });
  }

  // --- Demo user ---------------------------------------------------------------
  const passwordHash = await bcrypt.hash("demo1234", 10);
  await prisma.user.upsert({
    where: { email: "demo@local" },
    create: { email: "demo@local", passwordHash, displayName: "Demo User", role: "owner" },
    update: {},
  });

  // --- Buildings -----------------------------------------------------------
  const demoMeta = {
    recordStatus: "demo",
    sourceName: DEMO_SOURCE,
    retrievalDate: new Date(),
    confidence: "low",
    notes: "Fictional demonstration record.",
  };

  const buildings = [
    {
      key: "anson",
      name: "Anson Vantage Tower (Demo)",
      address: "88 Anson Road Singapore 079914 (fictional)",
      postalCode: "079914",
      lat: 1.2746, lng: 103.8452,
      planningArea: "Downtown Core", subzone: "Anson",
      propertyCategory: "office", developmentType: "Strata office tower",
      completionYear: 1976, tenureType: "leasehold_99",
      leaseCommencement: new Date("1972-06-01"), leaseTermYears: 99,
      leaseSourceQuality: "reported",
      grossFloorAreaSqm: 42000, plotRatio: 11.2, masterPlanZoning: "Commercial",
      allowableUse: "Office, ancillary retail", numUnits: 420, carParkLots: 180,
      nearestMrt: "Tanjong Pagar MRT", nearestMrtMetres: 260,
      basePsf2016: 1950, psfDrift: 0.028, salesCount: 18, unitSqmRange: [55, 210] as const,
      rentPsf2022: 5.4, rentDrift: 0.03, rentalCount: 12, rentalLevel: "unit",
    },
    {
      key: "boatquay",
      name: "Clemens Quay Shophouse (Demo)",
      address: "61 Boat Quay Singapore 049851 (fictional)",
      postalCode: "049851",
      lat: 1.2872, lng: 103.8498,
      planningArea: "Downtown Core", subzone: "Boat Quay",
      propertyCategory: "shophouse", developmentType: "Conservation shophouse",
      completionYear: 1895, tenureType: "leasehold_999",
      leaseCommencement: new Date("1827-01-01"), leaseTermYears: 999,
      leaseSourceQuality: "reported",
      grossFloorAreaSqm: 480, plotRatio: null, masterPlanZoning: "Commercial",
      allowableUse: "F&B, office upper floors", numUnits: 1, carParkLots: 0,
      conservationStatus: "Conserved (demo record)",
      nearestMrt: "Raffles Place MRT", nearestMrtMetres: 420,
      basePsf2016: 3900, psfDrift: 0.032, salesCount: 6, unitSqmRange: [140, 300] as const,
      rentPsf2022: 7.8, rentDrift: 0.025, rentalCount: 8, rentalLevel: "street",
    },
    {
      key: "katong",
      name: "Katong Heritage House (Demo)",
      address: "212 East Coast Road Singapore 428914 (fictional)",
      postalCode: "428914",
      lat: 1.3062, lng: 103.9049,
      planningArea: "Marine Parade", subzone: "Marine Parade",
      propertyCategory: "shophouse", developmentType: "Freehold shophouse",
      completionYear: 1928, tenureType: "freehold",
      leaseSourceQuality: "reported",
      grossFloorAreaSqm: 350, masterPlanZoning: "Commercial & Residential",
      allowableUse: "Retail ground floor, residential above", numUnits: 1, carParkLots: 0,
      nearestMrt: "Marine Parade MRT", nearestMrtMetres: 380,
      basePsf2016: 2500, psfDrift: 0.04, salesCount: 5, unitSqmRange: [150, 320] as const,
      rentPsf2022: 5.2, rentDrift: 0.035, rentalCount: 7, rentalLevel: "street",
    },
    {
      key: "bugis",
      name: "Bugis Junction Point (Demo)",
      address: "230 Victoria Street Singapore 188024 (fictional)",
      postalCode: "188024",
      lat: 1.2996, lng: 103.8554,
      planningArea: "Rochor", subzone: "Bugis",
      propertyCategory: "mall_unit", developmentType: "Strata retail mall",
      completionYear: 1994, tenureType: "leasehold_99",
      leaseCommencement: new Date("1990-09-01"), leaseTermYears: 99,
      leaseSourceQuality: "reported",
      grossFloorAreaSqm: 28000, plotRatio: 7.0, masterPlanZoning: "Commercial",
      allowableUse: "Retail, F&B", numUnits: 260, carParkLots: 120,
      nearestMrt: "Bugis MRT", nearestMrtMetres: 150,
      basePsf2016: 3300, psfDrift: 0.012, salesCount: 14, unitSqmRange: [18, 95] as const,
      rentPsf2022: 9.5, rentDrift: 0.02, rentalCount: 10, rentalLevel: "building",
    },
    {
      key: "pearl",
      name: "Pearl Crest Centre (Demo)",
      address: "5 Eu Tong Sen Street Singapore 059817 (fictional)",
      postalCode: "059817",
      lat: 1.2853, lng: 103.8441,
      planningArea: "Outram", subzone: "Pearl's Hill",
      propertyCategory: "strata_commercial", developmentType: "Older strata podium",
      completionYear: 1970, tenureType: "leasehold_99",
      leaseCommencement: new Date("1955-01-01"), leaseTermYears: 99,
      leaseSourceQuality: "estimated",
      grossFloorAreaSqm: 15000, plotRatio: 5.6, masterPlanZoning: "Commercial",
      allowableUse: "Retail, office", numUnits: 190, carParkLots: 60,
      nearestMrt: "Chinatown MRT", nearestMrtMetres: 210,
      basePsf2016: 1150, psfDrift: -0.015, salesCount: 9, unitSqmRange: [30, 120] as const,
      rentPsf2022: 3.6, rentDrift: -0.01, rentalCount: 6, rentalLevel: "building",
    },
    {
      key: "riverfront",
      name: "Riverfront Mixed (Demo)",
      address: "300 Havelock Road Singapore 169633 (fictional)",
      postalCode: "169633",
      lat: 1.2889, lng: 103.8367,
      planningArea: "Singapore River", subzone: "Robertson Quay",
      propertyCategory: "mixed_commercial", developmentType: "Mixed-use podium",
      completionYear: null, tenureType: "unknown",
      leaseSourceQuality: "unknown",
      masterPlanZoning: null,
      nearestMrt: "Havelock MRT", nearestMrtMetres: 300,
      basePsf2016: 0, psfDrift: 0, salesCount: 0, unitSqmRange: [40, 40] as const,
      rentPsf2022: 0, rentDrift: 0, rentalCount: 0, rentalLevel: "unit",
    },
    {
      key: "ubi",
      name: "Ubi TechPark Block (Demo)",
      address: "10 Ubi Crescent Singapore 408564 (fictional)",
      postalCode: "408564",
      lat: 1.3298, lng: 103.8991,
      planningArea: "Geylang", subzone: "Kampong Ubi",
      propertyCategory: "industrial", developmentType: "B1 industrial (optional module - kept separate from commercial comparisons)",
      completionYear: 2001, tenureType: "leasehold_other",
      leaseCommencement: new Date("1997-01-01"), leaseTermYears: 60,
      leaseSourceQuality: "reported",
      grossFloorAreaSqm: 22000, masterPlanZoning: "Business 1",
      allowableUse: "Light industrial", numUnits: 150, carParkLots: 200,
      nearestMrt: "Ubi MRT", nearestMrtMetres: 350,
      basePsf2016: 620, psfDrift: 0.01, salesCount: 7, unitSqmRange: [100, 400] as const,
      rentPsf2022: 1.9, rentDrift: 0.01, rentalCount: 5, rentalLevel: "building",
    },
  ];

  const rand = lcg(42);
  const floorBands = ["01-05", "06-10", "11-15", "16-20", "21-25"];

  for (const b of buildings) {
    const { key, basePsf2016, psfDrift, salesCount, unitSqmRange, rentPsf2022, rentDrift, rentalCount, rentalLevel, ...data } = b;
    const building = await prisma.building.create({ data: { ...data, ...demoMeta } });

    // one representative property (unit) per building
    await prisma.property.create({
      data: {
        buildingId: building.id,
        unitNumber: key === "anson" ? "#12-05" : null,
        floorLevel: key === "anson" ? "11-15" : null,
        floorAreaSqm: (unitSqmRange[0] + unitSqmRange[1]) / 2,
        usageType: data.propertyCategory,
        recordStatus: "demo",
      },
    });

    // Sale transactions: spread over the past 10 years with a drift + noise.
    for (let i = 0; i < salesCount; i++) {
      const yearsAgo = rand() * 10;
      const txDate = new Date(Date.now() - yearsAgo * 365.25 * 86_400_000);
      const yearsSince2016 = txDate.getFullYear() - 2016 + txDate.getMonth() / 12;
      const psf = basePsf2016 * Math.pow(1 + psfDrift, yearsSince2016) * (0.92 + rand() * 0.16);
      const sqm = unitSqmRange[0] + rand() * (unitSqmRange[1] - unitSqmRange[0]);
      const sqft = sqm * SQM_TO_SQFT;
      const price = Math.round((psf * sqft) / 1000) * 1000;
      let remainingLease: number | null = null;
      if (data.tenureType !== "freehold" && "leaseCommencement" in data && data.leaseCommencement && data.leaseTermYears) {
        const expiry = new Date(data.leaseCommencement as Date);
        expiry.setFullYear(expiry.getFullYear() + (data.leaseTermYears as number));
        remainingLease = Math.round(((expiry.getTime() - txDate.getTime()) / (365.25 * 86_400_000)) * 10) / 10;
      }
      await prisma.saleTransaction.create({
        data: {
          buildingId: building.id,
          transactionDate: txDate,
          projectName: data.name,
          street: data.address.split(" Singapore")[0].replace(/^\d+\s/, ""),
          postalCode: data.postalCode,
          floorLevelBand: floorBands[Math.floor(rand() * floorBands.length)],
          floorAreaSqm: Math.round(sqm * 10) / 10,
          floorAreaSqft: Math.round(sqft * 10) / 10,
          propertyType: data.propertyCategory,
          priceSgd: price,
          psf: Math.round((price / sqft) * 100) / 100,
          psm: Math.round((price / sqm) * 100) / 100,
          typeOfSale: rand() > 0.8 ? "sub_sale" : "resale",
          tenure: data.tenureType,
          remainingLeaseYearsAtSale: remainingLease,
          sourceName: DEMO_SOURCE,
          retrievalDate: new Date(),
          reportingPeriod: `${txDate.getFullYear()}Q${Math.floor(txDate.getMonth() / 3) + 1}`,
          recordStatus: "demo",
          confidence: "low",
          limitation: "Fictional demonstration record - do not use for real analysis.",
        },
      });
    }

    // Rental records
    for (let i = 0; i < rentalCount; i++) {
      const yearsAgo = rand() * 4;
      const start = new Date(Date.now() - yearsAgo * 365.25 * 86_400_000);
      const yearsSince2022 = start.getFullYear() - 2022 + start.getMonth() / 12;
      const rentPsf = rentPsf2022 * Math.pow(1 + rentDrift, yearsSince2022) * (0.9 + rand() * 0.2);
      const sqm = unitSqmRange[0] + rand() * (unitSqmRange[1] - unitSqmRange[0]);
      const sqft = sqm * SQM_TO_SQFT;
      const aggregated = rentalLevel !== "unit";
      await prisma.rentalTransaction.create({
        data: {
          buildingId: building.id,
          leaseStartDate: aggregated ? null : start,
          leaseQuarter: `${start.getFullYear()}Q${Math.floor(start.getMonth() / 3) + 1}`,
          monthlyRentSgd: aggregated ? null : Math.round(rentPsf * sqft),
          rentPsfMonthly: Math.round(rentPsf * 100) / 100,
          floorAreaSqm: aggregated ? null : Math.round(sqm * 10) / 10,
          street: data.address.split(" Singapore")[0].replace(/^\d+\s/, ""),
          propertyType: data.propertyCategory,
          leaseTermMonths: aggregated ? null : 24 + Math.floor(rand() * 3) * 12,
          aggregationLevel: rentalLevel,
          observations: aggregated ? 3 + Math.floor(rand() * 12) : 1,
          sourceName: DEMO_SOURCE,
          reportingPeriod: `${start.getFullYear()}Q${Math.floor(start.getMonth() / 3) + 1}`,
          recordStatus: "demo",
          confidence: "low",
          limitation: aggregated
            ? `Aggregated at ${rentalLevel} level - this is not a verified unit-level tenancy. Fictional demo record.`
            : "Fictional demonstration record.",
        },
      });
    }
  }

  // --- Nearby projects (fictional) -------------------------------------------
  const projects = [
    { name: "Demo Interchange Station (Planned)", projectType: "mrt", description: "Fictional MRT interchange to demonstrate transport-impact analysis.", lat: 1.2761, lng: 103.8438, status: "confirmed", expectedCompletion: "2029", sourceName: DEMO_SOURCE },
    { name: "Demo Tower @ Anson", projectType: "office", description: "Fictional 40-storey office development.", lat: 1.2738, lng: 103.8460, status: "under_construction", expectedCompletion: "2027", sourceName: DEMO_SOURCE },
    { name: "Demo Residences (Marine Parade)", projectType: "residential", description: "Fictional 600-unit residential project.", lat: 1.3050, lng: 103.9070, status: "confirmed", expectedCompletion: "2028", sourceName: DEMO_SOURCE },
    { name: "Demo Retail Podium (Bugis)", projectType: "retail", description: "Fictional competing retail podium.", lat: 1.3003, lng: 103.8542, status: "tendered", expectedCompletion: null, sourceName: DEMO_SOURCE },
    { name: "Demo Precinct Improvement Plan", projectType: "civic", description: "Fictional public-realm improvement works.", lat: 1.2866, lng: 103.8489, status: "proposed", expectedCompletion: null, sourceName: DEMO_SOURCE },
  ];
  for (const p of projects) {
    await prisma.nearbyProject.create({ data: { ...p, recordStatus: "demo", confidence: "low" } });
  }

  const counts = {
    buildings: await prisma.building.count(),
    sales: await prisma.saleTransaction.count(),
    rentals: await prisma.rentalTransaction.count(),
    projects: await prisma.nearbyProject.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
