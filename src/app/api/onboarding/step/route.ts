import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { saveStep } from "@/lib/onboarding";

export const runtime = "nodejs";

const socialLinkSchema = z.object({
  platform: z.string().max(50),
  url: z.string().url().or(z.literal("")),
});
const experienceSchema = z.object({
  role: z.string().max(100),
  company: z.string().max(100),
  location: z.string().max(100).optional().nullable(),
  start: z.string().max(20).optional().nullable(),
  end: z.string().max(20).optional().nullable(),
  summary: z.string().max(1000).optional().nullable(),
});
const projectSchema = z.object({
  title: z.string().max(200),
  description: z.string().max(2000).optional().nullable(),
  url: z.string().url().or(z.literal("")).optional().nullable(),
});
const publicationSchema = z.object({
  title: z.string().max(300),
  url: z.string().url().or(z.literal("")).optional().nullable(),
  publisher: z.string().max(100).optional().nullable(),
});
const testimonialSchema = z.object({
  quote: z.string().max(2000),
  author: z.string().max(100).optional().nullable(),
  role: z.string().max(100).optional().nullable(),
});
const connectorSchema = z.object({
  type: z.enum(["RSS", "GITHUB", "YOUTUBE"]),
  externalUrl: z.string().url().or(z.literal("")),
});

const stepSchemas: Record<number, z.ZodTypeAny> = {
  2: z.object({
    descriptor: z.string().max(200).optional().nullable(),
    photoUrl: z.string().url().or(z.literal("")).optional().nullable(),
    bio: z.string().max(2000).optional().nullable(),
  }),
  3: z.object({ links: z.array(socialLinkSchema).max(20) }),
  4: z.object({
    experience: z.array(experienceSchema).max(20),
    projects: z.array(projectSchema).max(20),
  }),
  5: z.object({
    publications: z.array(publicationSchema).max(20),
    testimonials: z.array(testimonialSchema).max(20),
  }),
  6: z.object({ connectors: z.array(connectorSchema).max(3) }),
};

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const raw = await req.json().catch(() => ({}));
  const step = (raw as { step?: unknown }).step;
  if (typeof step !== "number" || !(step in stepSchemas)) {
    return NextResponse.json({ error: "invalid_step" }, { status: 400 });
  }

  const schema = stepSchemas[step];
  const parsed = schema.safeParse((raw as { data?: unknown }).data ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_data" }, { status: 400 });
  }

  try {
    await saveStep(session.sub, step, parsed.data as Record<string, unknown>);
    return NextResponse.json({ ok: true, step }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "no_claim" }, { status: 409 });
  }
}
