import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getEnvelope, setEnvelope, logWork } from "@/lib/agent/state";
import { envelopeSchema, PERMISSION_LEVELS } from "@/lib/agent/envelope";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const envelope = await getEnvelope(session.sub);
  return NextResponse.json({ envelope });
}

const putSchema = z.object({
  surfaces: z.object({
    hub: z.enum(PERMISSION_LEVELS),
    connectedProfiles: z.enum(PERMISSION_LEVELS),
    syndication: z.enum(PERMISSION_LEVELS),
    pitches: z.enum(PERMISSION_LEVELS),
    rankTracking: z.enum(PERMISSION_LEVELS),
  }),
});

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = putSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_envelope" }, { status: 400 });
  }

  const envelope = { version: 1 as const, surfaces: parsed.data.surfaces };
  const valid = envelopeSchema.safeParse(envelope);
  if (!valid.success) {
    return NextResponse.json({ error: "invalid_envelope" }, { status: 400 });
  }

  await setEnvelope(session.sub, envelope);
  await logWork(session.sub, "envelope.update", null, {
    surfaces: envelope.surfaces,
  });

  return NextResponse.json({ envelope });
}
