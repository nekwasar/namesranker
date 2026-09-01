import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { saveContent, ContentSection } from "@/lib/settings";
import { photoUrlField } from "@/lib/uploads";
import { ClaimError } from "@/lib/claims/claim";

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

const sectionSchemas: Record<ContentSection, z.ZodTypeAny> = {
  profile: z.object({
    descriptor: z.string().max(200).optional().nullable(),
    photoUrl: photoUrlField,
    bio: z.string().max(2000).optional().nullable(),
  }),
  socials: z.object({ links: z.array(socialLinkSchema).max(20) }),
  experience: z.object({ experience: z.array(experienceSchema).max(20) }),
  projects: z.object({ projects: z.array(projectSchema).max(20) }),
  publications: z.object({ publications: z.array(publicationSchema).max(20) }),
  testimonials: z.object({ testimonials: z.array(testimonialSchema).max(20) }),
};

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const raw = await req.json().catch(() => ({}));
  const section = (raw as { section?: unknown }).section as ContentSection | undefined;
  const schema = section ? sectionSchemas[section] : undefined;
  if (!section || !schema) {
    return NextResponse.json({ error: "invalid_section" }, { status: 400 });
  }

  const parsed = schema.safeParse((raw as { data?: unknown }).data ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_data" }, { status: 400 });
  }

  const pageId = (raw as { pageId?: unknown }).pageId;
  if (typeof pageId !== "string") {
    return NextResponse.json({ error: "invalid_page" }, { status: 400 });
  }

  try {
    const { seoScore } = await saveContent(
      session.sub,
      pageId,
      section,
      parsed.data as Record<string, unknown>
    );
    return NextResponse.json({ ok: true, seoScore });
  } catch (err) {
    if (err instanceof ClaimError && err.code === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw err;
  }
}
