export type ActivityRecord = {
  id: number;
  category: string;
  activity: string;
  domainTags: string;
  energy: "Low" | "Medium" | "High";
  setting: "Home" | "Outdoor-nearby" | "Outdoor-destination" | "Anywhere";
  socialMode: "Solo" | "Social" | "Either";
  minTime: number;
  maxTime: number;
  weekdaySlotFit: "Yes" | "Daylight-dependent" | "Weekend-only";
  cost: "Free" | "Low-cost" | "Paid";
  output: string;
  psychologicalNeed: "Autonomy" | "Competence" | "Relatedness";
  moodTarget: string;
  novelty: "Familiar" | "New" | "Slightly scary";
  friction: "Easy" | "Moderate" | "Hard";
  repeatability: "Daily" | "Weekly" | "Occasional";
  note: string;
};

export type LogEntryRecord = {
  id: number;
  activityId: number;
  status: "completed" | "pending";
  spunAt: string;
  completedAt: string | null;
  durationMinutes: number | null;
  enjoyment: number | null;
  calmAfter: number | null;
  curiosityToRepeat: number | null;
  proudCapable: number | null;
  feltLikeMe: number | null;
  connected: number | null;
  frictionExperienced: number | null;
  wouldRepeat: "Yes" | "Maybe" | "No" | null;
  notes: string;
};

export type LogInput = {
  entryId?: number;
  activityId: number;
  durationMinutes: number;
  enjoyment: number;
  calmAfter: number;
  curiosityToRepeat: number;
  proudCapable: number;
  feltLikeMe: number;
  connected: number;
  frictionExperienced: number;
  wouldRepeat: "Yes" | "Maybe" | "No";
  notes: string;
};

export type RatingKey =
  | "enjoyment"
  | "calmAfter"
  | "curiosityToRepeat"
  | "proudCapable"
  | "feltLikeMe"
  | "connected"
  | "frictionExperienced";
