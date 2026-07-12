-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "postalCode" TEXT,
    "lat" REAL,
    "lng" REAL,
    "planningArea" TEXT,
    "subzone" TEXT,
    "propertyCategory" TEXT NOT NULL,
    "developmentType" TEXT,
    "completionYear" INTEGER,
    "topDate" DATETIME,
    "tenureType" TEXT NOT NULL,
    "leaseCommencement" DATETIME,
    "leaseTermYears" INTEGER,
    "leaseSourceQuality" TEXT,
    "grossFloorAreaSqm" REAL,
    "plotRatio" REAL,
    "masterPlanZoning" TEXT,
    "allowableUse" TEXT,
    "conservationStatus" TEXT,
    "numUnits" INTEGER,
    "carParkLots" INTEGER,
    "nearestMrt" TEXT,
    "nearestMrtMetres" REAL,
    "recordStatus" TEXT NOT NULL DEFAULT 'user',
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "retrievalDate" DATETIME,
    "confidence" TEXT NOT NULL DEFAULT 'medium',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buildingId" TEXT NOT NULL,
    "unitNumber" TEXT,
    "floorLevel" TEXT,
    "floorAreaSqm" REAL,
    "usageType" TEXT,
    "recordStatus" TEXT NOT NULL DEFAULT 'user',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Property_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LandParcel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buildingId" TEXT NOT NULL,
    "lotNumber" TEXT,
    "siteAreaSqm" REAL,
    "geometryWkt" TEXT,
    "sourceName" TEXT,
    "retrievalDate" DATETIME,
    CONSTRAINT "LandParcel_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SaleTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buildingId" TEXT,
    "transactionDate" DATETIME NOT NULL,
    "projectName" TEXT,
    "street" TEXT,
    "postalCode" TEXT,
    "unitIdentifier" TEXT,
    "floorLevelBand" TEXT,
    "floorAreaSqm" REAL,
    "floorAreaSqft" REAL,
    "propertyType" TEXT NOT NULL,
    "priceSgd" REAL NOT NULL,
    "psf" REAL,
    "psm" REAL,
    "typeOfSale" TEXT,
    "tenure" TEXT,
    "leaseCommencement" DATETIME,
    "leaseTermYears" INTEGER,
    "remainingLeaseYearsAtSale" REAL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "retrievalDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportingPeriod" TEXT,
    "recordStatus" TEXT NOT NULL DEFAULT 'user',
    "confidence" TEXT NOT NULL DEFAULT 'medium',
    "limitation" TEXT,
    "rawPayload" TEXT,
    "dedupeKey" TEXT,
    "possibleDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "duplicateOfId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SaleTransaction_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RentalTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buildingId" TEXT,
    "leaseStartDate" DATETIME,
    "leaseQuarter" TEXT,
    "monthlyRentSgd" REAL,
    "rentPsfMonthly" REAL,
    "floorAreaSqm" REAL,
    "street" TEXT,
    "propertyType" TEXT NOT NULL,
    "leaseTermMonths" INTEGER,
    "aggregationLevel" TEXT NOT NULL DEFAULT 'unit',
    "observations" INTEGER,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "retrievalDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportingPeriod" TEXT,
    "recordStatus" TEXT NOT NULL DEFAULT 'user',
    "confidence" TEXT NOT NULL DEFAULT 'medium',
    "limitation" TEXT,
    "rawPayload" TEXT,
    "dedupeKey" TEXT,
    "possibleDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RentalTransaction_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommercialIndex" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "indexName" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "retrievalDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordStatus" TEXT NOT NULL DEFAULT 'user'
);

-- CreateTable
CREATE TABLE "PlanningZone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planningArea" TEXT NOT NULL,
    "subzone" TEXT,
    "zoning" TEXT,
    "plotRatio" REAL,
    "geometryWkt" TEXT,
    "sourceName" TEXT,
    "effectiveDate" DATETIME,
    "retrievalDate" DATETIME
);

-- CreateTable
CREATE TABLE "MasterPlanFeature" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "featureType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "lat" REAL,
    "lng" REAL,
    "geometryWkt" TEXT,
    "status" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "effectiveDate" DATETIME,
    "retrievalDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordStatus" TEXT NOT NULL DEFAULT 'user'
);

-- CreateTable
CREATE TABLE "NearbyProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "description" TEXT,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "expectedCompletion" TEXT,
    "announcedDate" DATETIME,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "retrievalDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordStatus" TEXT NOT NULL DEFAULT 'user',
    "confidence" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TransportProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "transportType" TEXT NOT NULL,
    "lat" REAL,
    "lng" REAL,
    "status" TEXT NOT NULL,
    "expectedCompletion" TEXT,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "retrievalDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordStatus" TEXT NOT NULL DEFAULT 'user'
);

-- CreateTable
CREATE TABLE "PropertySource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "baseUrl" TEXT,
    "termsUrl" TEXT,
    "authority" TEXT NOT NULL,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "SourceRetrieval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceName" TEXT NOT NULL,
    "retrievedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestInfo" TEXT,
    "recordCount" INTEGER,
    "status" TEXT NOT NULL,
    "errorDetail" TEXT
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WatchlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "fileName" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "rowsImported" INTEGER NOT NULL,
    "rowsFlagged" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Upload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserPropertyOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserPropertyOverride_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinancialAssumption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "propertyId" TEXT,
    "buildingId" TEXT,
    "name" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FinancialAssumption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FinancialAssumption_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinancialScenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "assumptionId" TEXT,
    "name" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancialScenario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalysisReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT,
    "buildingId" TEXT,
    "title" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalysisReport_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComparableResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subjectBuildingId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "similarityScore" REAL NOT NULL,
    "scoreBreakdown" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "LandParcel_buildingId_key" ON "LandParcel"("buildingId");

-- CreateIndex
CREATE INDEX "SaleTransaction_buildingId_transactionDate_idx" ON "SaleTransaction"("buildingId", "transactionDate");

-- CreateIndex
CREATE INDEX "SaleTransaction_dedupeKey_idx" ON "SaleTransaction"("dedupeKey");

-- CreateIndex
CREATE INDEX "RentalTransaction_buildingId_leaseStartDate_idx" ON "RentalTransaction"("buildingId", "leaseStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialIndex_indexName_period_key" ON "CommercialIndex"("indexName", "period");

-- CreateIndex
CREATE UNIQUE INDEX "PropertySource_name_key" ON "PropertySource"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_userId_buildingId_key" ON "WatchlistItem"("userId", "buildingId");

-- CreateIndex
CREATE INDEX "ComparableResult_subjectBuildingId_idx" ON "ComparableResult"("subjectBuildingId");
