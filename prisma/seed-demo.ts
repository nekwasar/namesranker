import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { Prisma } from "@/generated/prisma/client";
import "dotenv/config";

/**
 * Seeds the EXACTLY TWO demo profiles shown on the landing page (spec §7).
 * Idempotent: upserts by email and re-creates content blocks.
 */

interface DemoProfile {
  email: string;
  firstName: string;
  lastName: string;
  slug: string;
  claimType: "STANDARD" | "KEYWORD";
  keyword: string | null;
  title: string;
  descriptor: string;
  metaTitle: string;
  metaDescription: string;
  photoUrl: string;
  bio: string;
  experience: {
    role: string;
    company: string;
    location: string;
    start: string;
    end: string;
    summary: string;
  }[];
  projects: { title: string; description: string; url: string }[];
  socials: { platform: string; url: string }[];
  testimonials: { quote: string; author: string; role: string }[];
  publications: { title: string; url: string; publisher: string }[];
}

const demoProfiles: DemoProfile[] = [
  {
    email: "demo.alex@namesranker.com",
    firstName: "Alex",
    lastName: "Rivera",
    slug: "alex-rivera",
    claimType: "STANDARD",
    keyword: null,
    title: "Alex Rivera — Product Designer in Austin",
    descriptor: "Product Designer · Austin, TX",
    metaTitle: "Alex Rivera — Product Designer in Austin",
    metaDescription:
      "Alex Rivera is a product designer in Austin specializing in design systems and user research. View Alex's portfolio, projects, and work.",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
    bio: "Product designer with 8 years of experience building design systems and research-driven interfaces for early-stage startups and Fortune 500 teams.",
    experience: [
      {
        role: "Senior Product Designer",
        company: "Lumen Labs",
        location: "Austin, TX",
        start: "2021",
        end: "Present",
        summary: "Own the design system used across 4 product lines.",
      },
      {
        role: "Product Designer",
        company: "Brightpath",
        location: "Austin, TX",
        start: "2018",
        end: "2021",
        summary: "Shipped 20+ features from research to production.",
      },
    ],
    projects: [
      {
        title: "Atlas Design System",
        description: "A 120-component design system with theming and accessibility baked in.",
        url: "https://alex-rivera.namesranker.com/projects/atlas",
      },
      {
        title: "Habit Nest",
        description: "Mobile habit-tracking app that grew to 50k monthly active users.",
        url: "https://alex-rivera.namesranker.com/projects/habit-nest",
      },
    ],
    socials: [
      { platform: "LinkedIn", url: "https://linkedin.com/in/alexrivera" },
      { platform: "Dribbble", url: "https://dribbble.com/alexrivera" },
      { platform: "X", url: "https://x.com/alexrivera" },
    ],
    testimonials: [
      {
        quote: "Alex rebuilt our entire design workflow. Nobody else came close.",
        author: "Sam Patel",
        role: "VP Product, Lumen Labs",
      },
    ],
    publications: [
      {
        title: "Design Systems That Scale",
        url: "https://medium.com/@alexrivera",
        publisher: "Medium",
      },
    ],
  },
  {
    email: "demo.jordan@namesranker.com",
    firstName: "Jordan",
    lastName: "Lee",
    slug: "jordan-lee-codes",
    claimType: "KEYWORD",
    keyword: "codes",
    title: "Jordan Lee — Software Engineer in London",
    descriptor: "Software Engineer · London, UK",
    metaTitle: "Jordan Lee — Software Engineer in London",
    metaDescription:
      "Jordan Lee is a software engineer in London specializing in backend systems and developer tooling. View Jordan's code, projects, and open-source work.",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80",
    bio: "Backend engineer focused on distributed systems, developer tooling, and open source. Previously scaled infrastructure at fintech startups.",
    experience: [
      {
        role: "Senior Software Engineer",
        company: "Meridian Payments",
        location: "London, UK",
        start: "2020",
        end: "Present",
        summary: "Led the migration of the core ledger to event-sourced architecture.",
      },
      {
        role: "Software Engineer",
        company: "Tandem Health",
        location: "London, UK",
        start: "2017",
        end: "2020",
        summary: "Built patient-facing APIs serving 1M+ requests daily.",
      },
    ],
    projects: [
      {
        title: "Ledgerify",
        description: "Open-source event-sourcing toolkit with 4k GitHub stars.",
        url: "https://jordan-lee.namesranker.com/projects/ledgerify",
      },
      {
        title: "Deploycheck",
        description: "CLI that catches risky deploys before they ship.",
        url: "https://jordan-lee.namesranker.com/projects/deploycheck",
      },
    ],
    socials: [
      { platform: "GitHub", url: "https://github.com/jordanlee" },
      { platform: "LinkedIn", url: "https://linkedin.com/in/jordanlee" },
      { platform: "X", url: "https://x.com/jordanlee" },
    ],
    testimonials: [
      {
        quote: "Jordan's event-sourcing work cut our reconciliation time by 90%.",
        author: "Priya Nair",
        role: "CTO, Meridian Payments",
      },
    ],
    publications: [
      {
        title: "Event Sourcing in Practice",
        url: "https://dev.to/jordanlee",
        publisher: "DEV Community",
      },
    ],
  },
];

async function seedDemoProfile(profile: DemoProfile) {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? "",
  });
  const prisma = new PrismaClient({ adapter });

  const user = await prisma.user.upsert({
    where: { email: profile.email },
    update: {},
    create: { email: profile.email },
  });

  await prisma.nameClaim.upsert({
    where: { slug: profile.slug },
    update: { claimedById: user.id },
    create: {
      slug: profile.slug,
      wordCount: 2,
      type: profile.claimType,
      claimedById: user.id,
      keyword: profile.keyword,
      status: "CLAIMED",
    },
  });

  const page = await prisma.page.upsert({
    where: { path: profile.slug },
    update: {
      title: profile.title,
      descriptor: profile.descriptor,
      metaTitle: profile.metaTitle,
      metaDescription: profile.metaDescription,
      status: "LIVE",
    },
    create: {
      ownerId: user.id,
      isHub: true,
      path: profile.slug,
      title: profile.title,
      descriptor: profile.descriptor,
      metaTitle: profile.metaTitle,
      metaDescription: profile.metaDescription,
      status: "LIVE",
      publishedAt: new Date(),
    },
  });

  await prisma.contentBlock.deleteMany({ where: { pageId: page.id } });

  const blocks: {
    type: "BIO" | "PHOTO" | "EXPERIENCE" | "PROJECT" | "SOCIAL" | "TESTIMONIAL" | "PUBLICATION";
    payload: Prisma.InputJsonValue;
    order: number;
  }[] = [
    { type: "PHOTO", payload: { url: profile.photoUrl }, order: 0 },
    { type: "BIO", payload: { text: profile.bio }, order: 1 },
    ...profile.experience.map((e, i) => ({
      type: "EXPERIENCE" as const,
      payload: e,
      order: 2 + i,
    })),
    ...profile.projects.map((p, i) => ({
      type: "PROJECT" as const,
      payload: p,
      order: 2 + profile.experience.length + i,
    })),
    { type: "SOCIAL", payload: { links: profile.socials }, order: 100 },
    ...profile.testimonials.map((t, i) => ({
      type: "TESTIMONIAL" as const,
      payload: t,
      order: 101 + i,
    })),
    ...profile.publications.map((p, i) => ({
      type: "PUBLICATION" as const,
      payload: p,
      order: 103 + i,
    })),
  ];

  await prisma.contentBlock.createMany({
    data: blocks.map((b) => ({ ...b, pageId: page.id })),
  });

  console.log(`Seeded demo profile: ${profile.slug}`);

  await prisma.$disconnect();
}

async function main() {
  for (const profile of demoProfiles) {
    await seedDemoProfile(profile);
  }
  console.log("Demo profiles seeded.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
