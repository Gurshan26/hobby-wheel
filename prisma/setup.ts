import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { seedActivities } from "./seed";

const prisma = new PrismaClient();

async function applyMigration() {
  const migrationPath = path.join(
    process.cwd(),
    "prisma",
    "migrations",
    "000001_init",
    "migration.sql"
  );
  const migration = await readFile(migrationPath, "utf8");
  const statements = migration
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
}

async function main() {
  await applyMigration();
  await seedActivities(prisma);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
