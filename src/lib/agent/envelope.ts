import { z } from "zod";

/**
 * Permission envelope — user-set policy for what the per-user agent may do
 * (product-plan-v2.md §4, milestones-v2.md M1/M3). Stored server-side in
 * `AgentState.permissionEnvelope` and enforced by the agent runtime (M3);
 * this module is the single source of truth for shape, defaults and labels.
 */

export const PERMISSION_LEVELS = [
  "NEVER_TOUCH",
  "DRAFT_ONLY",
  "COPY_APPROVE",
  "FULL_AUTO",
] as const;
export type PermissionLevel = (typeof PERMISSION_LEVELS)[number];

/** Surfaces the agent can act on. Everything it does maps to exactly one. */
export const ENVELOPE_SURFACES = [
  "hub", // publish/update their page on namesranker.com
  "connectedProfiles", // optimize their existing third-party profiles
  "syndication", // republish their works to connected platforms
  "pitches", // find + pitch opportunities on their behalf
  "rankTracking", // snapshot SERPs and track their name
] as const;
export type EnvelopeSurface = (typeof ENVELOPE_SURFACES)[number];

export interface PermissionEnvelope {
  version: 1;
  surfaces: Record<EnvelopeSurface, PermissionLevel>;
}

export const DEFAULT_ENVELOPE: PermissionEnvelope = {
  version: 1,
  surfaces: {
    // Our own domain — the core promise needs the hub to publish itself.
    hub: "FULL_AUTO",
    // Changes to the user's real profiles are visible + reversible; tell them.
    connectedProfiles: "COPY_APPROVE",
    // Syndicated copies of their own works appear under their name elsewhere.
    syndication: "COPY_APPROVE",
    // Sending mail as the user is the most consequential action — drafts first.
    pitches: "DRAFT_ONLY",
    // SERP tracking is read-only from the user's perspective.
    rankTracking: "FULL_AUTO",
  },
};

export const envelopeSchema: z.ZodType<PermissionEnvelope> = z.object({
  version: z.literal(1),
  surfaces: z.object({
    hub: z.enum(PERMISSION_LEVELS),
    connectedProfiles: z.enum(PERMISSION_LEVELS),
    syndication: z.enum(PERMISSION_LEVELS),
    pitches: z.enum(PERMISSION_LEVELS),
    rankTracking: z.enum(PERMISSION_LEVELS),
  }),
});

export function parseEnvelope(raw: unknown): PermissionEnvelope {
  const parsed = envelopeSchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_ENVELOPE;
}

/** Editor copy (Settings → Permissions). */
export const ENVELOPE_SURFACE_META: {
  surface: EnvelopeSurface;
  title: string;
  description: string;
}[] = [
  {
    surface: "hub",
    title: "Your page on NamesRanker",
    description:
      "Publishing and updating your hub page, sub-pages and directory listing on our domain — the surface we own and optimize.",
  },
  {
    surface: "connectedProfiles",
    title: "Your existing profiles",
    description:
      "Optimizing profiles you already hold (LinkedIn headline, GitHub bio, Medium about, …) so they carry the same descriptor and link back to your hub.",
  },
  {
    surface: "syndication",
    title: "Republishing your work",
    description:
      "Posting transformed versions of your own published works to connected platforms, each with a canonical link back to your original.",
  },
  {
    surface: "pitches",
    title: "Pitches & outreach",
    description:
      "Finding podcasts, publications and directories that fit you, drafting pitches from your real credentials, and sending them on your behalf.",
  },
  {
    surface: "rankTracking",
    title: "Rank tracking",
    description:
      "Snapshotting Google results for your name and sending you movement alerts — read-only, but we treat it as your proof feed.",
  },
];

export const PERMISSION_LEVEL_META: Record<
  PermissionLevel,
  { title: string; description: string }
> = {
  NEVER_TOUCH: {
    title: "Never touch",
    description: "The agent does nothing on this surface.",
  },
  DRAFT_ONLY: {
    title: "Drafts only",
    description: "The agent prepares everything and waits for your explicit OK.",
  },
  COPY_APPROVE: {
    title: "Act + notify",
    description: "The agent acts automatically and shows you what it did, right after.",
  },
  FULL_AUTO: {
    title: "Full auto",
    description: "The agent acts freely within its rules and logs every action to your feed.",
  },
};
