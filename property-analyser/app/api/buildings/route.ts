import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

/** Creates a building shell from a OneMap result or manual entry so analysis can begin. */
const bodySchema = z.object({
  name: z.string().min(1).max(150),
  address: z.string().min(1).max(250),
  postalCode: z.string().max(10).optional().nullable(),
  lat: z.number().min(1.1).max(1.5).optional().nullable(),
  lng: z.number().min(103.5).max(104.2).optional().nullable(),
  propertyCategory: z.string().min(1).max(40),
  tenureType: z.string().max(30).optional().default("unknown"),
  sourceName: z.string().max(120).optional().default("Manual entry"),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join("; ") }, { status: 400 });
  }
  const d = parsed.data;
  const existing = await prisma.building.findFirst({
    where: { name: d.name, postalCode: d.postalCode ?? undefined },
  });
  if (existing) return NextResponse.json({ id: existing.id, existed: true });

  const building = await prisma.building.create({
    data: {
      name: d.name,
      address: d.address,
      postalCode: d.postalCode,
      lat: d.lat,
      lng: d.lng,
      propertyCategory: d.propertyCategory,
      tenureType: d.tenureType,
      recordStatus: d.sourceName.startsWith("OneMap") ? "official" : "user",
      sourceName: d.sourceName,
      retrievalDate: new Date(),
      confidence: d.sourceName.startsWith("OneMap") ? "high" : "medium",
      notes: "Created from search; enrich fields via imports or manual entry.",
    },
  });
  return NextResponse.json({ id: building.id, existed: false });
}
