import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, createSession, destroySession, getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  action: z.enum(["register", "login", "logout"]),
  email: z.string().email().max(200).optional(),
  password: z.string().min(8).max(200).optional(),
  displayName: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  const rl = rateLimit(`auth:${req.ip ?? "local"}`, 20);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts - wait a minute" }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request (password must be at least 8 characters)" }, { status: 400 });
  const { action, email, password, displayName } = parsed.data;

  if (action === "logout") {
    await destroySession();
    return NextResponse.json({ ok: true });
  }
  if (!email || !password) return NextResponse.json({ error: "Email and password are required" }, { status: 400 });

  if (action === "register") {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    const user = await prisma.user.create({
      data: { email, passwordHash: await hashPassword(password), displayName: displayName || null },
    });
    await createSession(user.id);
    return NextResponse.json({ ok: true, email: user.email });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
  }
  await createSession(user.id);
  return NextResponse.json({ ok: true, email: user.email });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  const watchlist = await prisma.watchlistItem.findMany({ where: { userId: user.id } });
  return NextResponse.json({
    user: { email: user.email, displayName: user.displayName, role: user.role },
    watchlistBuildingIds: watchlist.map((w) => w.buildingId),
  });
}
