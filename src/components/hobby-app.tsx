"use client";

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  Check,
  Download,
  ListChecks,
  Play,
  Plus,
  RotateCw,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  discardPending,
  saveCompletedLog,
  startActivity,
} from "@/app/actions";
import { ActivityWheel } from "@/components/activity-wheel";
import { InsightsView } from "@/components/insights-view";
import { SpecimenTicket } from "@/components/specimen-ticket";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  average,
  categoryColors,
  daylightNow,
  defaultTimeForNow,
  fitScore,
  isWeekdayEvening,
  uniqueCategories,
} from "@/lib/activity-utils";
import type {
  ActivityRecord,
  LogEntryRecord,
  LogInput,
  RatingKey,
} from "@/lib/types";

type ViewName = "spin" | "pending" | "log" | "insights";
type EnergyFilter = "Low" | "Medium" | "High" | "Any";
type SettingFilter = "Home" | "Outside" | "Anywhere";
type SocialFilter = "Solo" | "Social" | "Either";
type BudgetFilter = "Free" | "Low-cost" | "Any";

type Filters = {
  time: 15 | 30 | 45 | 60;
  energy: EnergyFilter;
  setting: SettingFilter;
  social: SocialFilter;
  budget: BudgetFilter;
};

type UserSettings = {
  showWeekendOnly: boolean;
  defaultMinutes: 15 | 30 | 45 | 60;
  blockStart: string;
  blockEnd: string;
};

type LogDraft = {
  entryId?: number;
  activityId: number;
};

const timeOptions = [15, 30, 45, 60] as const;
const energyOptions: EnergyFilter[] = ["Low", "Medium", "High", "Any"];
const settingOptions: SettingFilter[] = ["Home", "Outside", "Anywhere"];
const socialOptions: SocialFilter[] = ["Solo", "Social", "Either"];
const budgetOptions: BudgetFilter[] = ["Free", "Low-cost", "Any"];

const ratingLabels: Array<{ key: RatingKey; label: string }> = [
  { key: "enjoyment", label: "Enjoyment" },
  { key: "calmAfter", label: "Calm after" },
  { key: "curiosityToRepeat", label: "Curiosity to repeat" },
  { key: "proudCapable", label: "Proud/capable" },
  { key: "feltLikeMe", label: "Felt like me" },
  { key: "connected", label: "Connected" },
  { key: "frictionExperienced", label: "Friction" },
];

const defaultSettings: UserSettings = {
  showWeekendOnly: false,
  defaultMinutes: 45,
  blockStart: "18:15",
  blockEnd: "19:00",
};

export function HobbyApp({
  activities,
  initialLogs,
}: {
  activities: ActivityRecord[];
  initialLogs: LogEntryRecord[];
}) {
  const [view, setView] = useState<ViewName>("spin");
  const [logs, setLogs] = useState(initialLogs);
  const [filters, setFilters] = useState<Filters>({
    time: defaultTimeForNow() as Filters["time"],
    energy: "Any",
    setting: "Anywhere",
    social: "Either",
    budget: "Any",
  });
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [selectedActivity, setSelectedActivity] =
    useState<ActivityRecord | null>(null);
  const [activeEntryId, setActiveEntryId] = useState<number | null>(null);
  const [logDraft, setLogDraft] = useState<LogDraft | null>(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [now, setNow] = useState(0);
  const [firstLaunchAt, setFirstLaunchAt] = useState<string | null>(null);
  const [deepenNote, setDeepenNote] = useState<string | null>(null);
  const [celebrationText, setCelebrationText] = useState<string | null>(null);

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    });
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedSettings = window.localStorage.getItem("hobby-wheel-settings");
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings) as UserSettings;
        setSettings(parsedSettings);
        setFilters((current) => ({
          ...current,
          time: parsedSettings.defaultMinutes,
        }));
      }

      const storedLaunch = window.localStorage.getItem(
        "hobby-wheel-first-launch"
      );
      if (storedLaunch) {
        setFirstLaunchAt(storedLaunch);
      } else {
        const launchDate = new Date().toISOString();
        window.localStorage.setItem("hobby-wheel-first-launch", launchDate);
        setFirstLaunchAt(launchDate);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "hobby-wheel-settings",
      JSON.stringify(settings)
    );
  }, [settings]);

  const activityById = useMemo(
    () => new Map(activities.map((activity) => [activity.id, activity])),
    [activities]
  );

  const pendingLogs = logs.filter((log) => log.status === "pending");
  const activeEntry = activeEntryId
    ? pendingLogs.find((log) => log.id === activeEntryId) ?? null
    : null;
  const activeActivity = activeEntry
    ? activityById.get(activeEntry.activityId) ?? null
    : null;

  const weeksSinceFirstUse = useMemo(() => {
    const earliestLog = logs
      .map((log) => new Date(log.spunAt).getTime())
      .sort((first, second) => first - second)[0];
    const baseline = earliestLog
      ? earliestLog
      : firstLaunchAt
        ? new Date(firstLaunchAt).getTime()
        : now;

    return Math.max(
      1,
      Math.floor(((now || baseline) - baseline) / (1000 * 60 * 60 * 24 * 7)) + 1
    );
  }, [firstLaunchAt, logs, now]);

  const filteredActivities = useMemo(
    () => filterActivities(activities, filters, settings.showWeekendOnly),
    [activities, filters, settings.showWeekendOnly]
  );

  const wheelCategories = uniqueCategories(filteredActivities);

  function updateFilter<Key extends keyof Filters>(
    key: Key,
    value: Filters[Key]
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
    if (key === "time") {
      setSettings((current) => ({
        ...current,
        defaultMinutes: value as UserSettings["defaultMinutes"],
      }));
    }
  }

  function spinWheel() {
    if (isSpinning || filteredActivities.length === 0) return;

    const pickedActivity = chooseActivity(
      filteredActivities,
      logs,
      activityById,
      weeksSinceFirstUse
    );
    const pickedCategoryIndex = Math.max(
      0,
      wheelCategories.indexOf(pickedActivity.category)
    );
    const segmentAngle = 360 / Math.max(1, wheelCategories.length);
    const targetCenter = pickedCategoryIndex * segmentAngle + segmentAngle / 2;
    const targetRotation = 360 - targetCenter;
    const currentRotation = ((wheelRotation % 360) + 360) % 360;
    const extraRotation =
      ((targetRotation - currentRotation + 360) % 360) +
      (5 + Math.floor(Math.random() * 3)) * 360;

    setSelectedActivity(null);
    setDeepenNote(null);
    setIsSpinning(true);
    setWheelRotation((current) => current + extraRotation);

    window.setTimeout(() => {
      setSelectedActivity(pickedActivity);
      setDeepenNote(
        buildDeepenNote(pickedActivity, logs, activityById, weeksSinceFirstUse)
      );
      setIsSpinning(false);
    }, 2650);
  }

  async function handleStartActivity(activity: ActivityRecord) {
    setIsSaving(true);
    try {
      const log = await startActivity(activity.id);
      setLogs((current) => [log, ...current]);
      setActiveEntryId(log.id);
      setView("spin");
    } finally {
      setIsSaving(false);
    }
  }

  function openLogForEntry(entry: LogEntryRecord) {
    setLogDraft({
      entryId: entry.id,
      activityId: entry.activityId,
    });
    setView("log");
  }

  async function handleDiscard(entryId: number) {
    setIsSaving(true);
    try {
      await discardPending(entryId);
      setLogs((current) => current.filter((log) => log.id !== entryId));
      if (activeEntryId === entryId) setActiveEntryId(null);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveLog(input: LogInput) {
    setIsSaving(true);
    try {
      const savedLog = await saveCompletedLog(input);
      setLogs((current) => {
        const exists = current.some((log) => log.id === savedLog.id);
        if (exists) {
          return current.map((log) => (log.id === savedLog.id ? savedLog : log));
        }
        return [savedLog, ...current];
      });
      if (activeEntryId === savedLog.id) setActiveEntryId(null);
      setLogDraft(null);
      setCelebrationText(
        `Logged. Current streak: ${streakDays([savedLog, ...logs])} days.`
      );
      setView("insights");
    } finally {
      setIsSaving(false);
    }
  }

  function exportLogs() {
    const payload = JSON.stringify({ exportedAt: new Date(), logs }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "hobby-wheel-logs.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-28 pt-4 md:px-6 md:pb-10">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-soft)]">
              Field Log
            </p>
            <h1 className="font-heading text-3xl leading-none tracking-normal md:text-4xl">
              Hobby Wheel specimens
            </h1>
          </div>
          <Button
            aria-label="Open settings"
            className="border-[var(--ticket-edge)] bg-[var(--ticket)] text-[var(--ink)] shadow-sm"
            onClick={() =>
              setView((current) => (current === "pending" ? "spin" : "pending"))
            }
            size="icon"
            type="button"
            variant="outline"
          >
            <Settings />
          </Button>
        </header>

        {view === "spin" && (
          <SpinView
            activeActivity={activeActivity}
            activeEntry={activeEntry}
            deepenNote={deepenNote}
            filteredActivities={filteredActivities}
            filters={filters}
            isSaving={isSaving}
            isSpinning={isSpinning}
            onDone={openLogForEntry}
            onFilterChange={updateFilter}
            onSettingsChange={setSettings}
            onSpin={spinWheel}
            onStart={handleStartActivity}
            now={now}
            pendingCount={pendingLogs.length}
            selectedActivity={selectedActivity}
            settings={settings}
            wheelRotation={wheelRotation}
          />
        )}

        {view === "pending" && (
          <PendingView
            activityById={activityById}
            isSaving={isSaving}
            logs={pendingLogs}
            onDiscard={handleDiscard}
            onLog={openLogForEntry}
            onResume={(entry) => {
              setActiveEntryId(entry.id);
              setView("spin");
            }}
            onSettingsChange={setSettings}
            settings={settings}
            onExport={exportLogs}
          />
        )}

        {view === "log" && (
          <LogView
            key={`${logDraft?.entryId ?? "manual"}-${logDraft?.activityId ?? "none"}`}
            activities={activities}
            activityById={activityById}
            draft={logDraft}
            isSaving={isSaving}
            onSave={handleSaveLog}
            pendingLogs={pendingLogs}
          />
        )}

        {view === "insights" && (
          <div className="space-y-3">
            {celebrationText && (
              <Card className="field-panel rounded-[18px] border-[var(--teal)] text-[var(--ink)]">
                <CardContent className="flex items-center gap-2">
                  <Check className="size-4" />
                  <p className="text-sm font-medium">{celebrationText}</p>
                </CardContent>
              </Card>
            )}
            <InsightsView activities={activities} logs={logs} />
          </div>
        )}
      </div>

      <BottomNav
        pendingCount={pendingLogs.length}
        setView={(nextView) => {
          if (nextView === "log" && !logDraft) {
            setLogDraft({
              activityId: selectedActivity?.id ?? activities[0]?.id ?? 1,
            });
          }
          setView(nextView);
        }}
        view={view}
      />
    </main>
  );
}

function SpinView({
  activeActivity,
  activeEntry,
  deepenNote,
  filteredActivities,
  filters,
  isSaving,
  isSpinning,
  now,
  pendingCount,
  selectedActivity,
  settings,
  wheelRotation,
  onDone,
  onFilterChange,
  onSettingsChange,
  onSpin,
  onStart,
}: {
  activeActivity: ActivityRecord | null;
  activeEntry: LogEntryRecord | null;
  deepenNote: string | null;
  filteredActivities: ActivityRecord[];
  filters: Filters;
  isSaving: boolean;
  isSpinning: boolean;
  now: number;
  pendingCount: number;
  selectedActivity: ActivityRecord | null;
  settings: UserSettings;
  wheelRotation: number;
  onDone: (entry: LogEntryRecord) => void;
  onFilterChange: <Key extends keyof Filters>(
    key: Key,
    value: Filters[Key]
  ) => void;
  onSettingsChange: Dispatch<SetStateAction<UserSettings>>;
  onSpin: () => void;
  onStart: (activity: ActivityRecord) => Promise<void>;
}) {
  return (
    <section className="grid gap-5 lg:grid-cols-[420px_1fr] lg:items-start">
      <div className="flex flex-col gap-4">
        <div className="order-1 lg:order-2">
          <ActivityWheel
            activities={filteredActivities}
            disabled={filteredActivities.length === 0}
            isSpinning={isSpinning}
            onSpin={onSpin}
            poolCount={filteredActivities.length}
            rotation={wheelRotation}
          />
        </div>
        <div className="order-2 lg:order-1">
          <FilterPanel
            filters={filters}
            onFilterChange={onFilterChange}
            onSettingsChange={onSettingsChange}
            settings={settings}
          />
        </div>
      </div>

      <div className="space-y-4 pt-24 lg:pt-0">
        {activeEntry && activeActivity && (
          <ActiveCard
            activity={activeActivity}
            elapsed={formatElapsed(now - new Date(activeEntry.spunAt).getTime())}
            onDone={() => onDone(activeEntry)}
          />
        )}

        {pendingCount > 0 && !activeEntry && (
          <Card className="field-panel rounded-[18px]">
            <CardContent className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[var(--berry)]">
                  {pendingCount} pending
                </p>
                <p className="mt-1 text-sm text-[var(--ink-soft)]">
                  Specimens waiting to be filed.
                </p>
              </div>
              <Badge className="rounded-full bg-[var(--berry)] font-mono text-white">
                {pendingCount}
              </Badge>
            </CardContent>
          </Card>
        )}

        {selectedActivity ? (
          <ActivityCard
            activity={selectedActivity}
            deepenNote={deepenNote}
            isSaving={isSaving}
            onSpinAgain={onSpin}
            onStart={() => onStart(selectedActivity)}
          />
        ) : (
          <Card className="field-panel rounded-[18px]">
            <CardContent className="space-y-3">
              <p className="font-heading text-2xl leading-tight">
                No specimen drawn yet.
              </p>
              <p className="text-sm text-[var(--ink-soft)]">
                {filteredActivities.length === 0
                  ? "No entries match these filters."
                  : `${filteredActivities.length} possible specimens in range.`}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}

function FilterPanel({
  filters,
  settings,
  onFilterChange,
  onSettingsChange,
}: {
  filters: Filters;
  settings: UserSettings;
  onFilterChange: <Key extends keyof Filters>(
    key: Key,
    value: Filters[Key]
  ) => void;
  onSettingsChange: Dispatch<SetStateAction<UserSettings>>;
}) {
  return (
    <Card className="field-panel rounded-[18px]">
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 lg:block lg:space-y-4">
          <ChipGroup
            label="Time"
            options={timeOptions}
            renderLabel={(value) => (value === 60 ? "60+" : `${value}`)}
            selected={filters.time}
            onSelect={(value) => onFilterChange("time", value)}
          />
          <ChipGroup
            label="Energy"
            options={energyOptions}
            selected={filters.energy}
            onSelect={(value) => onFilterChange("energy", value)}
          />
          <ChipGroup
            label="Setting"
            options={settingOptions}
            selected={filters.setting}
            onSelect={(value) => onFilterChange("setting", value)}
          />
          <ChipGroup
            label="Social"
            options={socialOptions}
            selected={filters.social}
            onSelect={(value) => onFilterChange("social", value)}
          />
          <ChipGroup
            label="Budget"
            options={budgetOptions}
            selected={filters.budget}
            onSelect={(value) => onFilterChange("budget", value)}
          />
          <div className="space-y-2">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--ink-soft)]">
              Weekend
            </p>
            <label className="flex min-h-8 items-center justify-between gap-3 border border-[color-mix(in_srgb,var(--ink-soft),transparent_58%)] bg-transparent px-3 text-sm text-[var(--ink)]">
              <span>Show</span>
              <Switch
                checked={settings.showWeekendOnly}
                onCheckedChange={(checked) =>
                  onSettingsChange((current) => ({
                    ...current,
                    showWeekendOnly: checked,
                  }))
                }
              />
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChipGroup<Option extends string | number>({
  label,
  options,
  selected,
  renderLabel,
  onSelect,
}: {
  label: string;
  options: readonly Option[];
  selected: Option;
  renderLabel?: (value: Option) => string;
  onSelect: (value: Option) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--ink-soft)]">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            className={`rounded-full border px-3 font-mono text-[11px] font-semibold uppercase tracking-[0.04em] ${
              selected === option
                ? "border-[var(--teal)] bg-[var(--teal)] text-[var(--ticket)] shadow-[inset_0_2px_0_rgba(255,255,255,0.18),inset_0_-3px_0_rgba(0,0,0,0.15)] hover:bg-[var(--teal)]"
                : "border-[color-mix(in_srgb,var(--ink-soft),transparent_42%)] bg-transparent text-[var(--ink-soft)] hover:bg-[rgba(255,255,255,0.22)]"
            }`}
            key={option}
            onClick={() => onSelect(option)}
            size="sm"
            type="button"
            variant="outline"
          >
            {renderLabel ? renderLabel(option) : option}
          </Button>
        ))}
      </div>
    </div>
  );
}

function ActivityCard({
  activity,
  deepenNote,
  isSaving,
  onSpinAgain,
  onStart,
}: {
  activity: ActivityRecord;
  deepenNote: string | null;
  isSaving: boolean;
  onSpinAgain: () => void;
  onStart: () => void;
}) {
  return (
    <SpecimenTicket
      activity={activity}
      deepenNote={deepenNote}
      actions={
        <>
          <Button
            className="h-11 rounded-none border-[var(--ink)] bg-[var(--gold)] font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink)] hover:bg-[var(--gold)]"
            disabled={isSaving}
            onClick={onStart}
            type="button"
          >
            <Play />
            Start
          </Button>
          <Button
            className="h-11 rounded-none border-[var(--ink-soft)] bg-transparent font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink)] hover:bg-[rgba(255,255,255,0.25)]"
            disabled={isSaving}
            onClick={onSpinAgain}
            type="button"
            variant="outline"
          >
            <RotateCw />
            Draw again
          </Button>
        </>
      }
    />
  );
}

function ActiveCard({
  activity,
  elapsed,
  onDone,
}: {
  activity: ActivityRecord;
  elapsed: string;
  onDone: () => void;
}) {
  return (
    <Card className="field-panel rounded-[18px] border-[var(--teal)]">
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--teal)]">
              Active specimen
            </p>
            <p className="mt-1 font-heading text-xl leading-tight text-[var(--ink)]">
              {activity.activity}
            </p>
          </div>
          <span className="border border-[var(--teal)] bg-[color-mix(in_srgb,var(--teal),white_84%)] px-3 py-1 font-mono text-lg text-[var(--ink)]">
            {elapsed}
          </span>
        </div>
        <Button
          className="w-full rounded-none border-[var(--teal)] bg-[var(--teal)] font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ticket)] hover:bg-[var(--teal)]"
          onClick={onDone}
        >
          <Check />
          File this specimen
        </Button>
      </CardContent>
    </Card>
  );
}

function PendingView({
  activityById,
  isSaving,
  logs,
  settings,
  onDiscard,
  onExport,
  onLog,
  onResume,
  onSettingsChange,
}: {
  activityById: Map<number, ActivityRecord>;
  isSaving: boolean;
  logs: LogEntryRecord[];
  settings: UserSettings;
  onDiscard: (entryId: number) => Promise<void>;
  onExport: () => void;
  onLog: (entry: LogEntryRecord) => void;
  onResume: (entry: LogEntryRecord) => void;
  onSettingsChange: Dispatch<SetStateAction<UserSettings>>;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        {logs.length === 0 ? (
          <Card className="rounded-lg shadow-sm">
            <CardContent>
              <p className="text-lg font-semibold">No pending activities.</p>
              <p className="text-sm text-muted-foreground">
                Started activities will stay here until logged or discarded.
              </p>
            </CardContent>
          </Card>
        ) : (
          logs.map((log) => {
            const activity = activityById.get(log.activityId);
            if (!activity) return null;

            return (
              <Card className="rounded-lg shadow-sm" key={log.id}>
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge
                        className="mb-2 rounded-full text-white"
                        style={{ backgroundColor: categoryColors[activity.category] }}
                      >
                        {activity.category}
                      </Badge>
                      <p className="text-lg font-semibold leading-snug">
                        {activity.activity}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Started {new Date(log.spunAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button onClick={() => onResume(log)} type="button">
                      <Play />
                      Resume
                    </Button>
                    <Button
                      onClick={() => onLog(log)}
                      type="button"
                      variant="outline"
                    >
                      <Check />
                      Log
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            disabled={isSaving}
                            type="button"
                            variant="outline"
                          />
                        }
                      >
                        <Trash2 />
                        Discard
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Discard this attempt?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This removes the pending activity without logging it.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              void onDiscard(log.id);
                            }}
                          >
                            Discard
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <SettingsPanel
        onExport={onExport}
        onSettingsChange={onSettingsChange}
        settings={settings}
      />
    </section>
  );
}

function SettingsPanel({
  settings,
  onExport,
  onSettingsChange,
}: {
  settings: UserSettings;
  onExport: () => void;
  onSettingsChange: Dispatch<SetStateAction<UserSettings>>;
}) {
  return (
    <Card className="h-fit rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center justify-between gap-4 text-sm">
          <span>Show weekend-only activities</span>
          <Switch
            checked={settings.showWeekendOnly}
            onCheckedChange={(checked) =>
              onSettingsChange((current) => ({
                ...current,
                showWeekendOnly: checked,
              }))
            }
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="block-start">Start</Label>
            <Input
              id="block-start"
              onChange={(event) =>
                onSettingsChange((current) => ({
                  ...current,
                  blockStart: event.target.value,
                }))
              }
              type="time"
              value={settings.blockStart}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="block-end">End</Label>
            <Input
              id="block-end"
              onChange={(event) =>
                onSettingsChange((current) => ({
                  ...current,
                  blockEnd: event.target.value,
                }))
              }
              type="time"
              value={settings.blockEnd}
            />
          </div>
        </div>
        <ChipGroup
          label="Default minutes"
          options={timeOptions}
          renderLabel={(value) => (value === 60 ? "60+" : `${value}`)}
          selected={settings.defaultMinutes}
          onSelect={(value) =>
            onSettingsChange((current) => ({
              ...current,
              defaultMinutes: value,
            }))
          }
        />
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={onExport} type="button" variant="outline">
          <Download />
          Export logs
        </Button>
      </CardFooter>
    </Card>
  );
}

function LogView({
  activities,
  activityById,
  draft,
  isSaving,
  pendingLogs,
  onSave,
}: {
  activities: ActivityRecord[];
  activityById: Map<number, ActivityRecord>;
  draft: LogDraft | null;
  isSaving: boolean;
  pendingLogs: LogEntryRecord[];
  onSave: (input: LogInput) => Promise<void>;
}) {
  const pendingEntry = draft?.entryId
    ? pendingLogs.find((log) => log.id === draft.entryId) ?? null
    : null;
  const initialActivityId = draft?.activityId ?? activities[0]?.id ?? 1;
  const [activityId, setActivityId] = useState(initialActivityId);
  const [durationMinutes, setDurationMinutes] = useState(() =>
    pendingEntry
      ? Math.max(
          1,
          Math.round((Date.now() - new Date(pendingEntry.spunAt).getTime()) / 60000)
        )
      : activityById.get(initialActivityId)?.minTime ?? 30
  );
  const [ratings, setRatings] = useState<Record<RatingKey, number>>({
    enjoyment: 7,
    calmAfter: 7,
    curiosityToRepeat: 7,
    proudCapable: 7,
    feltLikeMe: 7,
    connected: 5,
    frictionExperienced: 4,
  });
  const [wouldRepeat, setWouldRepeat] =
    useState<LogInput["wouldRepeat"]>("Maybe");
  const [notes, setNotes] = useState("");

  const selectedActivity = activityById.get(activityId);

  return (
    <form
      className="mx-auto max-w-2xl space-y-4 pb-24"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave({
          entryId: draft?.entryId,
          activityId,
          durationMinutes,
          enjoyment: ratings.enjoyment,
          calmAfter: ratings.calmAfter,
          curiosityToRepeat: ratings.curiosityToRepeat,
          proudCapable: ratings.proudCapable,
          feltLikeMe: ratings.feltLikeMe,
          connected: ratings.connected,
          frictionExperienced: ratings.frictionExperienced,
          wouldRepeat,
          notes,
        });
      }}
    >
      {selectedActivity && (
        <SpecimenTicket
          activity={selectedActivity}
          className="mb-4"
          label="Filing specimen"
          variant="compact"
        />
      )}

      <Card className="field-panel rounded-[18px]">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">
            Field notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label
              className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--ink-soft)]"
              htmlFor="activity"
            >
              Specimen
            </Label>
            <select
              className="min-h-11 w-full rounded-none border border-[var(--ticket-edge)] bg-[var(--ticket)] px-3 text-sm text-[var(--ink)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color-mix(in_srgb,var(--gold),white_35%)]"
              id="activity"
              onChange={(event) => setActivityId(Number(event.target.value))}
              value={activityId}
            >
              {activities.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.activity}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label
              className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--ink-soft)]"
              htmlFor="duration"
            >
              Duration
            </Label>
            <Input
              className="rounded-none border-[var(--ticket-edge)] bg-[var(--ticket)] font-mono text-[var(--ink)]"
              id="duration"
              min={1}
              onChange={(event) =>
                setDurationMinutes(Math.max(1, Number(event.target.value)))
              }
              type="number"
              value={durationMinutes}
            />
          </div>

          <div className="space-y-4">
            {ratingLabels.map((rating) => (
              <RatingScale
                key={rating.key}
                label={rating.label}
                onChange={(value) =>
                  setRatings((current) => ({
                    ...current,
                    [rating.key]: value,
                  }))
                }
                value={ratings[rating.key]}
              />
            ))}
          </div>

          <div className="space-y-2">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--ink-soft)]">
              Would repeat
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(["Yes", "Maybe", "No"] as const).map((value) => (
                <Button
                  className={`rounded-none border font-mono text-xs font-semibold uppercase tracking-[0.12em] ${
                    wouldRepeat === value
                      ? "border-[var(--teal)] bg-[var(--teal)] text-[var(--ticket)] hover:bg-[var(--teal)]"
                      : "border-[var(--ink-soft)] bg-transparent text-[var(--ink)] hover:bg-[rgba(255,255,255,0.25)]"
                  }`}
                  key={value}
                  onClick={() => setWouldRepeat(value)}
                  type="button"
                  variant="outline"
                >
                  {value}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label
              className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--ink-soft)]"
              htmlFor="notes"
            >
              Field note
            </Label>
            <Textarea
              className="rounded-none border-[var(--ticket-edge)] bg-[var(--ticket)] text-[var(--ink)]"
              id="notes"
              placeholder="What did you like or dislike?"
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              value={notes}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="h-12 w-full rounded-none border-[var(--ink)] bg-[var(--gold)] font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink)] hover:bg-[var(--gold)]"
            disabled={isSaving}
            size="lg"
            type="submit"
          >
            <Check />
            Save field note
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

function RatingScale({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--ink-soft)]">
          {label}
        </p>
        <span className="font-mono text-sm text-[var(--berry)]">{value}/10</span>
      </div>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
          <button
            aria-label={`${label} ${score}`}
            className={`h-9 border font-mono text-xs transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[color-mix(in_srgb,var(--gold),white_35%)] ${
              score <= value
                ? "border-[var(--teal)] bg-[var(--teal)] text-[var(--ticket)]"
                : "border-[var(--ticket-edge)] bg-transparent text-[var(--ink-soft)]"
            }`}
            key={score}
            onClick={() => onChange(score)}
            type="button"
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  );
}

function BottomNav({
  pendingCount,
  view,
  setView,
}: {
  pendingCount: number;
  view: ViewName;
  setView: (view: ViewName) => void;
}) {
  const navItems: Array<{
    view: ViewName;
    label: string;
    Icon: typeof RotateCw;
  }> = [
    { view: "spin", label: "Spin", Icon: RotateCw },
    { view: "pending", label: "Pending", Icon: ListChecks },
    { view: "log", label: "Log", Icon: Plus },
    { view: "insights", label: "Insights", Icon: Sparkles },
  ];

  return (
    <nav className="ticket-nav fixed inset-x-0 bottom-0 z-40 px-3 pb-2 pt-4 shadow-[0_-10px_24px_rgba(32,43,56,0.12)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {navItems.map(({ view: itemView, label, Icon }) => (
          <button
            className={`relative flex min-h-14 flex-col items-center justify-center gap-1 border border-transparent font-mono text-[10px] font-semibold uppercase tracking-[0.08em] transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[color-mix(in_srgb,var(--gold),white_35%)] ${
              view === itemView
                ? "-translate-y-1 border-[var(--ticket-edge)] bg-[var(--ticket)] text-[var(--ink)] shadow-[0_8px_16px_rgba(32,43,56,0.14)] after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:bg-[var(--gold)]"
                : "text-[var(--ink-soft)] hover:bg-[rgba(255,255,255,0.28)]"
            }`}
            key={itemView}
            onClick={() => setView(itemView)}
            type="button"
          >
            <Icon className="size-5" />
            <span>{label}</span>
            {itemView === "pending" && pendingCount > 0 && (
              <span className="absolute right-2 top-1 rounded-full bg-[var(--berry)] px-1.5 py-0.5 font-mono text-[10px] text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}

function filterActivities(
  activities: ActivityRecord[],
  filters: Filters,
  showWeekendOnly: boolean
) {
  const currentDate = new Date();

  return activities.filter((activity) => {
    if (!fitsTime(activity, filters.time)) return false;
    if (filters.energy !== "Any" && activity.energy !== filters.energy) {
      return false;
    }
    if (!fitsSetting(activity, filters.setting)) return false;
    if (!fitsSocial(activity, filters.social)) return false;
    if (!fitsBudget(activity, filters.budget)) return false;
    if (
      activity.weekdaySlotFit === "Weekend-only" &&
      isWeekdayEvening(currentDate) &&
      !showWeekendOnly
    ) {
      return false;
    }
    if (
      activity.weekdaySlotFit === "Daylight-dependent" &&
      !daylightNow(currentDate)
    ) {
      return false;
    }

    return true;
  });
}

function fitsTime(activity: ActivityRecord, time: Filters["time"]) {
  if (time === 60) return activity.minTime <= 120;
  return activity.minTime <= time && activity.maxTime <= time + 20;
}

function fitsSetting(activity: ActivityRecord, setting: SettingFilter) {
  if (setting === "Anywhere") return true;
  if (setting === "Home") {
    return activity.setting === "Home" || activity.setting === "Anywhere";
  }
  return activity.setting.startsWith("Outdoor") || activity.setting === "Anywhere";
}

function fitsSocial(activity: ActivityRecord, social: SocialFilter) {
  if (social === "Either") return true;
  return activity.socialMode === social || activity.socialMode === "Either";
}

function fitsBudget(activity: ActivityRecord, budget: BudgetFilter) {
  if (budget === "Any") return true;
  if (budget === "Low-cost") {
    return activity.cost === "Free" || activity.cost === "Low-cost";
  }
  return activity.cost === "Free";
}

function chooseActivity(
  activities: ActivityRecord[],
  logs: LogEntryRecord[],
  activityById: Map<number, ActivityRecord>,
  weeksSinceFirstUse: number
) {
  const latestLog = [...logs].sort(
    (first, second) =>
      new Date(second.spunAt).getTime() - new Date(first.spunAt).getTime()
  )[0];
  const latestCategory = latestLog
    ? activityById.get(latestLog.activityId)?.category
    : null;
  const alternatives = latestCategory
    ? activities.filter((activity) => activity.category !== latestCategory)
    : activities;
  const basePool = alternatives.length > 0 ? alternatives : activities;
  const completedLogs = logs.filter((log) => log.status === "completed");

  if (weeksSinceFirstUse <= 4 || completedLogs.length < 15 || Math.random() < 0.3) {
    return randomItem(basePool);
  }

  const topCategories = topFitCategories(completedLogs, activityById, 3);
  const weightedPool = basePool.flatMap((activity) =>
    topCategories.includes(activity.category) ? [activity, activity] : [activity]
  );

  return randomItem(weightedPool);
}

function topFitCategories(
  logs: LogEntryRecord[],
  activityById: Map<number, ActivityRecord>,
  count: number
) {
  const rows = Array.from(
    logs.reduce((groups, log) => {
      const activity = activityById.get(log.activityId);
      if (!activity) return groups;
      const scores = groups.get(activity.category) ?? [];
      scores.push(fitScore(log));
      groups.set(activity.category, scores);
      return groups;
    }, new Map<string, number[]>())
  );

  return rows
    .map(([category, scores]) => ({ category, score: average(scores) }))
    .sort((first, second) => second.score - first.score)
    .slice(0, count)
    .map((row) => row.category);
}

function buildDeepenNote(
  activity: ActivityRecord,
  logs: LogEntryRecord[],
  activityById: Map<number, ActivityRecord>,
  weeksSinceFirstUse: number
) {
  if (weeksSinceFirstUse < 9) return null;

  const categoryLogs = logs.filter((log) => {
    const loggedActivity = activityById.get(log.activityId);
    return log.status === "completed" && loggedActivity?.category === activity.category;
  });
  const averageFit = average(categoryLogs.map(fitScore));

  if (categoryLogs.length >= 5 && averageFit >= 34) {
    return `You keep coming back to ${activity.category}. This could be a good day to try a bigger version.`;
  }

  return null;
}

function randomItem<Item>(items: Item[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function formatElapsed(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function streakDays(logs: LogEntryRecord[]) {
  const days = Array.from(
    new Set(
      logs
        .filter((log) => log.status === "completed")
        .map((log) =>
          new Date(log.completedAt ?? log.spunAt).toISOString().slice(0, 10)
        )
    )
  ).sort((first, second) => (first > second ? -1 : 1));

  if (days.length === 0) return 0;

  let streak = 0;
  let cursor = new Date();
  for (const day of days) {
    const cursorKey = cursor.toISOString().slice(0, 10);
    if (day !== cursorKey) break;
    streak += 1;
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }

  return streak;
}
