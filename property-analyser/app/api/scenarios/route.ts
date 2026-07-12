import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to save scenarios" }, { status: 401 });
  const buildingId = req.nextUrl.searchParams.get("buildingId") || undefined;
  const items = await prisma.financialAssumption.findMany({
    where: { userId: user.id, ...(buildingId ? { buildingId } : {}) },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  return NextResponse.json({
    saved: items.map((i) => ({ id: i.id, name: i.name, buildingId: i.buildingId, updatedAt: i.updatedAt, inputs: JSON.parse(i.payload) })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to save scenarios" }, { status: 401 });
  const schema = z.object({
    name: z.string().min(1).max(100),
    buildingId: z.string().optional().nullable(),
    inputs: z.record(z.unknown()),
  });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const saved = await prisma.financialAssumption.create({
    data: {
      userId: user.id,
      buildingId: parsed.data.buildingId ?? null,
      name: parsed.data.name,
      payload: JSON.stringify(parsed.data.inputs),
    },
  });
  return NextResponse.json({ ok: true, id: saved.id });
}
