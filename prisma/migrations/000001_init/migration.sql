CREATE TABLE IF NOT EXISTS "Activity" (
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
);

CREATE TABLE IF NOT EXISTS "LogEntry" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "activityId" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "spunAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" DATETIME,
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
);

CREATE INDEX IF NOT EXISTS "Activity_category_idx" ON "Activity"("category");
CREATE INDEX IF NOT EXISTS "Activity_energy_idx" ON "Activity"("energy");
CREATE INDEX IF NOT EXISTS "Activity_setting_idx" ON "Activity"("setting");
CREATE INDEX IF NOT EXISTS "LogEntry_activityId_idx" ON "LogEntry"("activityId");
CREATE INDEX IF NOT EXISTS "LogEntry_status_idx" ON "LogEntry"("status");
CREATE INDEX IF NOT EXISTS "LogEntry_spunAt_idx" ON "LogEntry"("spunAt");
CREATE INDEX IF NOT EXISTS "LogEntry_completedAt_idx" ON "LogEntry"("completedAt");
