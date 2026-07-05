import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PrismaClient, type Prisma } from "@prisma/client";

type SeedActivity = {
  id: number;
  category: string;
  activity: string;
  domainTags: string;
  energy: string;
  setting: string;
  socialMode: string;
  minTime: number;
  maxTime: number;
  weekdaySlotFit: string;
  cost: string;
  output: string;
  psychologicalNeed: string;
  moodTarget: string;
  novelty: string;
  friction: string;
  repeatability: string;
  note: string;
};

export async function seedActivities(client: Prisma.TransactionClient | PrismaClient) {
  const sourcePath = path.join(process.cwd(), "activities.json");
  const raw = await readFile(sourcePath, "utf8");
  const activities = JSON.parse(raw) as SeedActivity[];

  for (const activity of activities) {
    await client.activity.upsert({
      where: { id: activity.id },
      update: activity,
      create: activity,
    });
  }

  console.log(`Seeded ${activities.length} activities.`);
}

async function main() {
  const prisma = new PrismaClient();
  await seedActivities(prisma);
  await prisma.$disconnect();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
