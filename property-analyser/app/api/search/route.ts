import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { oneMapSearch } from "@/lib/adapters/onemap";
import { rateLimit } from "@/lib/rateLimit";
import { log } from "@/lib/log";

const querySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  category: z.string().trim().max(40).optional().default(""),
  planningArea: z.string().trim().max(60).optional().default(""),
});

export async function GET(req: NextRequest) {
  const rl = rateLimit(`search:${req.ip ?? "local"}`, 120);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterS) } });
  }
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  const { q, category, planningArea } = parsed.data;

  const where: Record<string, unknown>[] = [];
  if (q) {
    where.push({
      OR: [
        { name: { contains: q } },
        { address: { contains: q } },
        { postalCode: { contains: q } },
      ],
    });
  }
  if (category) where.push({ propertyCategory: category });
  if (planningArea) where.push({ planningArea: { contains: planningArea } });

  const buildings = await prisma.building.findMany({
    where: where.length ? { AND: where } : undefined,
    take: 25,
    orderBy: { name: "asc" },
    include: {
      saleTransactions: { orderBy: { transactionDate: "desc" }, take: 1 },
      _count: { select: { saleTransactions: true, rentalTransactions: true } },
    },
  });

  // OneMap suggestions for locations not yet in the local database.
  let oneMap: Awaited<ReturnType<typeof oneMapSearch>> = [];
  if (q.length >= 3) {
    try {
      oneMap = (await oneMapSearch(q)).slice(0, 5);
    } catch (e) {
      log.warn("OneMap lookup failed during search", { error: String(e) });
    }
  }

  return NextResponse.json({
    buildings: buildings.map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      postalCode: b.postalCode,
      planningArea: b.planningArea,
      propertyCategory: b.propertyCategory,
      tenureType: b.tenureType,
      recordStatus: b.recordStatus,
      saleCount: b._count.saleTransactions,
      rentalCount: b._count.rentalTransactions,
      latestSale: b.saleTransactions[0]
        ? { date: b.saleTransactions[0].transactionDate, price: b.saleTransactions[0].priceSgd, psf: b.saleTransactions[0].psf }
        : null,
    })),
    oneMap: oneMap.map((r) => ({ ...r, source: "OneMap (Singapore Land Authority)" })),
  });
}
