"use server";

import { revalidatePath } from "next/cache";
import {
  createPendingLog,
  deletePendingLog,
  getInitialRecords,
  upsertCompletedLog,
} from "@/lib/db";
import type { LogInput } from "@/lib/types";

export async function getInitialData() {
  return getInitialRecords();
}

export async function startActivity(activityId: number) {
  const log = await createPendingLog(activityId);
  revalidatePath("/");
  return log;
}

export async function discardPending(entryId: number) {
  await deletePendingLog(entryId);
  revalidatePath("/");
  return entryId;
}

export async function saveCompletedLog(input: LogInput) {
  const log = await upsertCompletedLog(input);
  revalidatePath("/");
  return log;
}
