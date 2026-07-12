import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to use watchlists" }, { status: 401 });
  const items = await prisma.watchlistItem.findMany({ where: { userId: user.id } });
  const buildings = await prisma.building.findMany({
    where: { id: { in: items.map((i) => i.buildingId) } },
    select: { id: true, name: true, address: true, propertyCategory: true },
  });
  return NextResponse.json({ buildings });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to use watchlists" }, { status: 401 });
  const schema = z.object({ buildingId: z.string().min(1), action: z.enum(["add", "remove"]) });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { buildingId, action } = parsed.data;
  if (action === "add") {
    await prisma.watchlistItem.upsert({
      where: { userId_buildingId: { userId: user.id, buildingId } },
      create: { userId: user.id, buildingId },
      update: {},
    });
  } else {
    await prisma.watchlistItem.deleteMany({ where: { userId: user.id, buildingId } });
  }
  return NextResponse.json({ ok: true });
}
