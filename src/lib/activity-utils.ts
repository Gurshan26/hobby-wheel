import type { ActivityRecord, LogEntryRecord } from "@/lib/types";

export const categoryColors: Record<string, string> = {
  "Physical / Movement": "#C4472A",
  "Creative Expression": "#7A4F8C",
  "Intellectual / Learning": "#2E6E8E",
  "Outdoor / Urban Exploration": "#1F6F63",
  "Practical / Making": "#C77B3D",
  "Reflective / Self-connection": "#4B5A8C",
  "Social / Community / Relational": "#A63D5A",
  "Restorative / Low-energy": "#4E7A5E",
  "Cultural / Aesthetic": "#D9A441",
  "Play / Novelty": "#7A8B4A",
};

export function fitScore(log: LogEntryRecord) {
  const enjoyment = log.enjoyment ?? 0;
  const curiosity = log.curiosityToRepeat ?? 0;
  const feltLikeMe = log.feltLikeMe ?? 0;
  const proud = log.proudCapable ?? 0;
  const calm = log.calmAfter ?? 0;
  const friction = log.frictionExperienced ?? 0;

  return enjoyment + curiosity + feltLikeMe + proud + calm - friction;
}

export function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function uniqueCategories(activities: ActivityRecord[]) {
  return Array.from(new Set(activities.map((activity) => activity.category)));
}

export function daylightNow(date = new Date()) {
  const hour = date.getHours() + date.getMinutes() / 60;
  const month = date.getMonth();

  if ([10, 11, 0, 1, 2].includes(month)) {
    return hour >= 6 && hour <= 20.5;
  }

  if ([3, 9].includes(month)) {
    return hour >= 6.5 && hour <= 19;
  }

  return hour >= 7 && hour <= 17.5;
}

export function defaultTimeForNow(date = new Date()) {
  const day = date.getDay();
  const hour = date.getHours();
  const isWeekday = day >= 1 && day <= 5;

  if (isWeekday && hour >= 17 && hour <= 20) return 45;
  if (day === 0 || day === 6) return 60;
  return 30;
}

export function isWeekdayEvening(date = new Date()) {
  const day = date.getDay();
  const hour = date.getHours();
  return day >= 1 && day <= 5 && hour >= 17 && hour <= 21;
}
