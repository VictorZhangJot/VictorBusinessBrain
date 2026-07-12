import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adapterStatuses } from "@/lib/adapters/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  const [sources, retrievals, uploads] = await Promise.all([
    prisma.propertySource.findMany({ orderBy: { name: "asc" } }),
    prisma.sourceRetrieval.findMany({ orderBy: { retrievedAt: "desc" }, take: 25 }),
    prisma.upload.findMany({ orderBy: { createdAt: "desc" }, take: 25 }),
  ]);
  return NextResponse.json({ adapters: adapterStatuses(), sources, retrievals, uploads });
}
