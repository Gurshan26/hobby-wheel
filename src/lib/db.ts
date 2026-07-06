import { createClient, type Client, type InValue, type Row } from "@libsql/client";
import activities from "../../activities.json";
import type { ActivityRecord, LogEntryRecord, LogInput } from "@/lib/types";

type SeedActivity = ActivityRecord;

const globalForDb = globalThis as unknown as {
  dbClient?: Client;
  dbReady?: Promise<void>;
};

function getDatabaseUrl() {
  if (process.env.TURSO_DATABASE_URL) {
    return process.env.TURSO_DATABASE_URL;
  }

  if (process.env.DATABASE_URL?.startsWith("file:")) {
    return process.env.DATABASE_URL === "file:./dev.db"
      ? "file:./prisma/dev.db"
      : process.env.DATABASE_URL;
  }

  return "file:./prisma/dev.db";
}

function getClient() {
  if (!globalForDb.dbClient) {
    globalForDb.dbClient = createClient({
      url: getDatabaseUrl(),
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }

  return globalForDb.dbClient;
}

function asString(value: unknown) {
  return String(value ?? "");
}

function asNumber(value: unknown) {
  return Number(value);
}

function asNullableNumber(value: unknown) {
  return value === null || value === undefined ? null : Number(value);
}

function asNullableIso(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const raw = String(value);
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T") + "Z";
  return new Date(normalized).toISOString();
}

function toActivityRecord(row: Row): ActivityRecord {
  return {
    id: asNumber(row.id),
    category: asString(row.category) as ActivityRecord["category"],
    activity: asString(row.activity),
    domainTags: asString(row.domainTags),
    energy: asString(row.energy) as ActivityRecord["energy"],
    setting: asString(row.setting) as ActivityRecord["setting"],
    socialMode: asString(row.socialMode) as ActivityRecord["socialMode"],
    minTime: asNumber(row.minTime),
    maxTime: asNumber(row.maxTime),
    weekdaySlotFit: asString(row.weekdaySlotFit) as ActivityRecord["weekdaySlotFit"],
    cost: asString(row.cost) as ActivityRecord["cost"],
    output: asString(row.output),
    psychologicalNeed: asString(row.psychologicalNeed) as ActivityRecord["psychologicalNeed"],
    moodTarget: asString(row.moodTarget),
    novelty: asString(row.novelty) as ActivityRecord["novelty"],
    friction: asString(row.friction) as ActivityRecord["friction"],
    repeatability: asString(row.repeatability) as ActivityRecord["repeatability"],
    note: asString(row.note),
  };
}

function toLogRecord(row: Row): LogEntryRecord {
  const wouldRepeat = asString(row.wouldRepeat);

  return {
    id: asNumber(row.id),
    activityId: asNumber(row.activityId),
    status: asString(row.status) === "completed" ? "completed" : "pending",
    spunAt: asNullableIso(row.spunAt) ?? new Date().toISOString(),
    completedAt: asNullableIso(row.completedAt),
    durationMinutes: asNullableNumber(row.durationMinutes),
    enjoyment: asNullableNumber(row.enjoyment),
    calmAfter: asNullableNumber(row.calmAfter),
    curiosityToRepeat: asNullableNumber(row.curiosityToRepeat),
    proudCapable: asNullableNumber(row.proudCapable),
    feltLikeMe: asNullableNumber(row.feltLikeMe),
    connected: asNullableNumber(row.connected),
    frictionExperienced: asNullableNumber(row.frictionExperienced),
    wouldRepeat:
      wouldRepeat === "Yes" || wouldRepeat === "Maybe" || wouldRepeat === "No"
        ? wouldRepeat
        : null,
    notes: asString(row.notes),
  };
}

async function ensureDatabase() {
  if (!globalForDb.dbReady) {
    globalForDb.dbReady = initializeDatabase();
  }

  return globalForDb.dbReady;
}

async function initializeDatabase() {
  const db = getClient();

  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS "Activity" (
        "id" INTEGER NOT NULL PRIMARY KEY,
        "category" TEXT NOT NULL,
        "activity" TEXT NOT NULL,
        "domainTags" TEXT NOT NULL,
        "energy" TEXT NOT NULL,
        "setting" TEXT NOT NULL,
        "socialMode" TEXT NOT NULL,
        "minTime" INTEGER NOT NULL,
        "maxTime" INTEGER NOT NULL,
        "weekdaySlotFit" TEXT NOT NULL,
        "cost" TEXT NOT NULL,
        "output" TEXT NOT NULL,
        "psychologicalNeed" TEXT NOT NULL,
        "moodTarget" TEXT NOT NULL,
        "novelty" TEXT NOT NULL,
        "friction" TEXT NOT NULL,
        "repeatability" TEXT NOT NULL,
        "note" TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS "LogEntry" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "activityId" INTEGER NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "spunAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "completedAt" TEXT,
        "durationMinutes" INTEGER,
        "enjoyment" INTEGER,
        "calmAfter" INTEGER,
        "curiosityToRepeat" INTEGER,
        "proudCapable" INTEGER,
        "feltLikeMe" INTEGER,
        "connected" INTEGER,
        "frictionExperienced" INTEGER,
        "wouldRepeat" TEXT,
        "notes" TEXT NOT NULL DEFAULT '',
        CONSTRAINT "LogEntry_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS "Activity_category_idx" ON "Activity"("category")`,
      `CREATE INDEX IF NOT EXISTS "Activity_energy_idx" ON "Activity"("energy")`,
      `CREATE INDEX IF NOT EXISTS "Activity_setting_idx" ON "Activity"("setting")`,
      `CREATE INDEX IF NOT EXISTS "LogEntry_activityId_idx" ON "LogEntry"("activityId")`,
      `CREATE INDEX IF NOT EXISTS "LogEntry_status_idx" ON "LogEntry"("status")`,
      `CREATE INDEX IF NOT EXISTS "LogEntry_spunAt_idx" ON "LogEntry"("spunAt")`,
      `CREATE INDEX IF NOT EXISTS "LogEntry_completedAt_idx" ON "LogEntry"("completedAt")`,
    ],
    "write"
  );

  const count = await db.execute(`SELECT COUNT(*) AS count FROM "Activity"`);
  if (Number(count.rows[0]?.count ?? 0) === activities.length) {
    return;
  }

  const seedStatements = (activities as SeedActivity[]).map((activity) => ({
    sql: `INSERT INTO "Activity" (
      "id", "category", "activity", "domainTags", "energy", "setting", "socialMode",
      "minTime", "maxTime", "weekdaySlotFit", "cost", "output", "psychologicalNeed",
      "moodTarget", "novelty", "friction", "repeatability", "note"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT("id") DO UPDATE SET
      "category" = excluded."category",
      "activity" = excluded."activity",
      "domainTags" = excluded."domainTags",
      "energy" = excluded."energy",
      "setting" = excluded."setting",
      "socialMode" = excluded."socialMode",
      "minTime" = excluded."minTime",
      "maxTime" = excluded."maxTime",
      "weekdaySlotFit" = excluded."weekdaySlotFit",
      "cost" = excluded."cost",
      "output" = excluded."output",
      "psychologicalNeed" = excluded."psychologicalNeed",
      "moodTarget" = excluded."moodTarget",
      "novelty" = excluded."novelty",
      "friction" = excluded."friction",
      "repeatability" = excluded."repeatability",
      "note" = excluded."note"`,
    args: [
      activity.id,
      activity.category,
      activity.activity,
      activity.domainTags,
      activity.energy,
      activity.setting,
      activity.socialMode,
      activity.minTime,
      activity.maxTime,
      activity.weekdaySlotFit,
      activity.cost,
      activity.output,
      activity.psychologicalNeed,
      activity.moodTarget,
      activity.novelty,
      activity.friction,
      activity.repeatability,
      activity.note,
    ] satisfies InValue[],
  }));

  await db.batch(seedStatements, "write");
}

export async function getInitialRecords() {
  await ensureDatabase();
  const db = getClient();
  const [activitiesResult, logsResult] = await Promise.all([
    db.execute(`SELECT * FROM "Activity" ORDER BY "category" ASC, "id" ASC`),
    db.execute(`SELECT * FROM "LogEntry" ORDER BY "spunAt" DESC, "id" DESC`),
  ]);

  return {
    activities: activitiesResult.rows.map(toActivityRecord),
    logs: logsResult.rows.map(toLogRecord),
  };
}

export async function createPendingLog(activityId: number) {
  await ensureDatabase();
  const db = getClient();
  const now = new Date().toISOString();

  const result = await db.execute({
    sql: `INSERT INTO "LogEntry" ("activityId", "status", "spunAt") VALUES (?, 'pending', ?) RETURNING *`,
    args: [activityId, now],
  });

  return toLogRecord(result.rows[0]);
}

export async function deletePendingLog(entryId: number) {
  await ensureDatabase();
  await getClient().execute({
    sql: `DELETE FROM "LogEntry" WHERE "id" = ? AND "status" = 'pending'`,
    args: [entryId],
  });
}

export async function upsertCompletedLog(input: LogInput) {
  await ensureDatabase();
  const db = getClient();
  const completedAt = new Date().toISOString();
  const data = [
    input.activityId,
    "completed",
    completedAt,
    input.durationMinutes,
    input.enjoyment,
    input.calmAfter,
    input.curiosityToRepeat,
    input.proudCapable,
    input.feltLikeMe,
    input.connected,
    input.frictionExperienced,
    input.wouldRepeat,
    input.notes.trim(),
  ] satisfies InValue[];

  const result = input.entryId
    ? await db.execute({
        sql: `UPDATE "LogEntry" SET
          "activityId" = ?,
          "status" = ?,
          "completedAt" = ?,
          "durationMinutes" = ?,
          "enjoyment" = ?,
          "calmAfter" = ?,
          "curiosityToRepeat" = ?,
          "proudCapable" = ?,
          "feltLikeMe" = ?,
          "connected" = ?,
          "frictionExperienced" = ?,
          "wouldRepeat" = ?,
          "notes" = ?
        WHERE "id" = ?
        RETURNING *`,
        args: [...data, input.entryId],
      })
    : await db.execute({
        sql: `INSERT INTO "LogEntry" (
          "activityId", "status", "completedAt", "durationMinutes", "enjoyment",
          "calmAfter", "curiosityToRepeat", "proudCapable", "feltLikeMe",
          "connected", "frictionExperienced", "wouldRepeat", "notes", "spunAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
        args: [...data, completedAt],
      });

  return toLogRecord(result.rows[0]);
}
