"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/prisma";
import type { ActivityRecord, LogEntryRecord, LogInput } from "@/lib/types";

function toActivityRecord(activity: {
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
}): ActivityRecord {
  return activity as ActivityRecord;
}

function toLogRecord(log: {
  id: number;
  activityId: number;
  status: string;
  spunAt: Date;
  completedAt: Date | null;
  durationMinutes: number | null;
  enjoyment: number | null;
  calmAfter: number | null;
  curiosityToRepeat: number | null;
  proudCapable: number | null;
  feltLikeMe: number | null;
  connected: number | null;
  frictionExperienced: number | null;
  wouldRepeat: string | null;
  notes: string;
}): LogEntryRecord {
  return {
    ...log,
    status: log.status === "completed" ? "completed" : "pending",
    spunAt: log.spunAt.toISOString(),
    completedAt: log.completedAt?.toISOString() ?? null,
    wouldRepeat:
      log.wouldRepeat === "Yes" ||
      log.wouldRepeat === "Maybe" ||
      log.wouldRepeat === "No"
        ? log.wouldRepeat
        : null,
  };
}

export async function getInitialData() {
  const prisma = getPrisma();
  const [activities, logs] = await Promise.all([
    prisma.activity.findMany({ orderBy: [{ category: "asc" }, { id: "asc" }] }),
    prisma.logEntry.findMany({ orderBy: { spunAt: "desc" } }),
  ]);

  return {
    activities: activities.map(toActivityRecord),
    logs: logs.map(toLogRecord),
  };
}

export async function startActivity(activityId: number) {
  const prisma = getPrisma();
  const log = await prisma.logEntry.create({
    data: {
      activityId,
      status: "pending",
      spunAt: new Date(),
    },
  });

  revalidatePath("/");
  return toLogRecord(log);
}

export async function discardPending(entryId: number) {
  const prisma = getPrisma();
  await prisma.logEntry.deleteMany({
    where: {
      id: entryId,
      status: "pending",
    },
  });

  revalidatePath("/");
  return entryId;
}

export async function saveCompletedLog(input: LogInput) {
  const prisma = getPrisma();
  const data = {
    activityId: input.activityId,
    status: "completed",
    completedAt: new Date(),
    durationMinutes: input.durationMinutes,
    enjoyment: input.enjoyment,
    calmAfter: input.calmAfter,
    curiosityToRepeat: input.curiosityToRepeat,
    proudCapable: input.proudCapable,
    feltLikeMe: input.feltLikeMe,
    connected: input.connected,
    frictionExperienced: input.frictionExperienced,
    wouldRepeat: input.wouldRepeat,
    notes: input.notes.trim(),
  };

  const log = input.entryId
    ? await prisma.logEntry.update({
        where: { id: input.entryId },
        data,
      })
    : await prisma.logEntry.create({
        data: {
          ...data,
          spunAt: new Date(),
        },
      });

  revalidatePath("/");
  return toLogRecord(log);
}
