import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const keywords: { profession: string; keywords: string[] }[] = [
  {
    profession: "engineering",
    keywords: [
      "codes",
      "builds",
      "engineers",
      "develops",
      "architects",
      "automates",
      "integrates",
      "optimizes",
      "deploys",
      "shapes",
      "scales",
      "prototypes",
    ],
  },
  {
    profession: "design",
    keywords: [
      "designs",
      "illustrates",
      "sketches",
      "brands",
      "art-directs",
      "creates",
      "crafts",
      "visualizes",
      "styles",
      "prototypes",
      "animates",
      "concepts",
    ],
  },
  {
    profession: "writing",
    keywords: [
      "writes",
      "authors",
      "edits",
      "publishes",
      "reports",
      "blogs",
      "composes",
      "narrates",
      "drafts",
      "copywrites",
      "journalisms",
      "critiques",
    ],
  },
  {
    profession: "marketing",
    keywords: [
      "markets",
      "grows",
      "campaigns",
      "launches",
      "brands",
      "promotes",
      "sells",
      "converts",
      "targets",
      "positions",
      "amplifies",
      "optimizes",
    ],
  },
  {
    profession: "sales",
    keywords: [
      "sells",
      "closes",
      "prospers",
      "negotiates",
      "grows",
      "accounts",
      "partners",
      "expands",
      "revenues",
      "closes-deals",
      "nurtures",
      "qualifies",
    ],
  },
  {
    profession: "finance",
    keywords: [
      "analyzes",
      "audits",
      "invests",
      "forecasts",
      "models",
      "budgets",
      "values",
      "manages",
      "reports",
      "plans",
      "advises",
      "optimizes",
    ],
  },
  {
    profession: "healthcare",
    keywords: [
      "cares",
      "heals",
      "treats",
      "diagnoses",
      "advocates",
      "consults",
      "nurses",
      "specializes",
      "researches",
      "rehabilitates",
      "supports",
      "educates",
    ],
  },
  {
    profession: "education",
    keywords: [
      "teaches",
      "educates",
      "mentors",
      "trains",
      "coaches",
      "lectures",
      "tutors",
      "guides",
      "develops",
      "instructs",
      "facilitates",
      "inspires",
    ],
  },
  {
    profession: "legal",
    keywords: [
      "advocates",
      "counsels",
      "litigates",
      "contracts",
      "defends",
      "advises",
      "negotiates",
      "researches",
      "arbitrates",
      "represents",
      "mediates",
      "regulates",
    ],
  },
  {
    profession: "creative",
    keywords: [
      "creates",
      "films",
      "photographs",
      "paints",
      "sculpts",
      "performs",
      "directs",
      "produces",
      "composes",
      "choreographs",
      "writes",
      "designs",
    ],
  },
  {
    profession: "entrepreneurship",
    keywords: [
      "founds",
      "builds",
      "leads",
      "launches",
      "innovates",
      "invests",
      "scales",
      "bootstraps",
      "disrupts",
      "grows",
      "strategizes",
      "creates",
    ],
  },
  {
    profession: "research",
    keywords: [
      "researches",
      "analyzes",
      "publishes",
      "experiments",
      "innovates",
      "investigates",
      "develops",
      "models",
      "reviews",
      "measures",
      "discovers",
      "synthesizes",
    ],
  },
];

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? "",
  });
  const prisma = new PrismaClient({ adapter });

  console.log("Seeding keywords...");

  let created = 0;
  for (const { profession, keywords: kws } of keywords) {
    for (const keyword of kws) {
      await prisma.keyword.upsert({
        where: { profession_keyword: { profession, keyword } },
        update: {},
        create: { profession, keyword },
      });
      created++;
    }
  }

  const total = await prisma.keyword.count();
  console.log(`Seeded ${created} keywords (total in DB: ${total}).`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
