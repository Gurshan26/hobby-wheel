"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ActivityRecord, LogEntryRecord } from "@/lib/types";
import { average, categoryColors, fitScore } from "@/lib/activity-utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type InsightsViewProps = {
  activities: ActivityRecord[];
  logs: LogEntryRecord[];
};

type MetricKey =
  | "enjoyment"
  | "feltLikeMe"
  | "curiosityToRepeat"
  | "calmAfter";

const metricLabels: Record<MetricKey, string> = {
  enjoyment: "Enjoyment by category",
  feltLikeMe: "Felt-like-me by category",
  curiosityToRepeat: "Curiosity-to-repeat by category",
  calmAfter: "Calm score by category",
};

function chartColor(category: string) {
  return categoryColors[category] ?? "#8f8171";
}

export function InsightsView({ activities, logs }: InsightsViewProps) {
  const activityById = new Map(
    activities.map((activity) => [activity.id, activity])
  );
  const completedLogs = logs
    .filter((log) => log.status === "completed")
    .filter((log) => activityById.has(log.activityId));

  const categoryRows = Array.from(
    completedLogs.reduce((groups, log) => {
      const activity = activityById.get(log.activityId);
      if (!activity) return groups;
      const existing = groups.get(activity.category) ?? [];
      existing.push(log);
      groups.set(activity.category, existing);
      return groups;
    }, new Map<string, LogEntryRecord[]>())
  ).map(([category, categoryLogs]) => ({
    category,
    count: categoryLogs.length,
    enjoyment: average(
      categoryLogs.flatMap((log) =>
        log.enjoyment === null ? [] : [log.enjoyment]
      )
    ),
    feltLikeMe: average(
      categoryLogs.flatMap((log) =>
        log.feltLikeMe === null ? [] : [log.feltLikeMe]
      )
    ),
    curiosityToRepeat: average(
      categoryLogs.flatMap((log) =>
        log.curiosityToRepeat === null ? [] : [log.curiosityToRepeat]
      )
    ),
    calmAfter: average(
      categoryLogs.flatMap((log) =>
        log.calmAfter === null ? [] : [log.calmAfter]
      )
    ),
    fit: average(categoryLogs.map(fitScore)),
  }));

  const rankedCategories = [...categoryRows]
    .sort((first, second) => second.fit - first.fit)
    .slice(0, 5);

  const trendRows = [...completedLogs]
    .sort(
      (first, second) =>
        new Date(first.completedAt ?? first.spunAt).getTime() -
        new Date(second.completedAt ?? second.spunAt).getTime()
    )
    .map((log, index) => ({
      name: `${index + 1}`,
      proudCapable: log.proudCapable ?? 0,
    }));

  const scatterRows = completedLogs.flatMap((log) => {
    const activity = activityById.get(log.activityId);
    if (
      !activity ||
      log.frictionExperienced === null ||
      log.enjoyment === null
    ) {
      return [];
    }

    return [
      {
        category: activity.category,
        friction: log.frictionExperienced,
        enjoyment: log.enjoyment,
      },
    ];
  });

  const socialRows = ["Solo", "Social", "Either"].map((mode) => {
    const modeLogs = completedLogs.filter((log) => {
      const activity = activityById.get(log.activityId);
      return activity?.socialMode === mode;
    });

    return {
      name: mode,
      enjoyment: average(
        modeLogs.flatMap((log) =>
          log.enjoyment === null ? [] : [log.enjoyment]
        )
      ),
      count: modeLogs.length,
    };
  });

  const settingRows = ["Indoor", "Outdoor", "Anywhere"].map((setting) => {
    const settingLogs = completedLogs.filter((log) => {
      const activity = activityById.get(log.activityId);
      if (!activity) return false;
      if (setting === "Indoor") return activity.setting === "Home";
      if (setting === "Outdoor") return activity.setting.startsWith("Outdoor");
      return activity.setting === "Anywhere";
    });

    return {
      name: setting,
      enjoyment: average(
        settingLogs.flatMap((log) =>
          log.enjoyment === null ? [] : [log.enjoyment]
        )
      ),
      count: settingLogs.length,
    };
  });

  const summary =
    completedLogs.length < 3
      ? `Log a few more activities to start seeing patterns. You are at ${completedLogs.length}/10.`
      : buildSummary(rankedCategories, socialRows);

  return (
    <section className="space-y-4 pb-24">
      <Card className="rounded-lg border-none bg-[#fff9f1] shadow-sm ring-[#eadfce]">
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-base leading-relaxed text-[#3d3328]">
              {summary}
            </p>
            <Badge className="shrink-0 rounded-full bg-[#2f6f6a] text-white">
              {completedLogs.length}/10
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle>Your top categories right now</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rankedCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              The ranking appears after your first completed log.
            </p>
          ) : (
            rankedCategories.map((row, index) => (
              <div
                className="grid grid-cols-[auto_1fr_auto] items-center gap-3"
                key={row.category}
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium">{row.category}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.count} logged
                  </p>
                </div>
                <Badge
                  className="rounded-full text-white"
                  style={{ backgroundColor: chartColor(row.category) }}
                >
                  {row.fit.toFixed(1)}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <MetricChart metric="enjoyment" rows={categoryRows} />
      <MetricChart metric="feltLikeMe" rows={categoryRows} />
      <MetricChart metric="curiosityToRepeat" rows={categoryRows} />
      <MetricChart metric="calmAfter" rows={categoryRows} />

      <Card className="rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle>Mastery/confidence trend</CardTitle>
        </CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={trendRows}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickLine={false} />
              <YAxis domain={[0, 10]} tickLine={false} width={28} />
              <Tooltip />
              <Line
                dataKey="proudCapable"
                dot={{ r: 3 }}
                stroke="#2f6f6a"
                strokeWidth={3}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle>Friction vs. reward</CardTitle>
        </CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer height="100%" width="100%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="friction"
                domain={[0, 10]}
                name="Friction"
                tickLine={false}
                type="number"
              />
              <YAxis
                dataKey="enjoyment"
                domain={[0, 10]}
                name="Enjoyment"
                tickLine={false}
                type="number"
                width={28}
              />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={scatterRows}>
                {scatterRows.map((row, index) => (
                  <Cell
                    fill={chartColor(row.category)}
                    key={`${row.category}-${index}`}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <ComparisonChart rows={socialRows} title="Solo vs. social enjoyment" />
      <ComparisonChart rows={settingRows} title="Indoor vs. outdoor enjoyment" />
    </section>
  );
}

function MetricChart({
  metric,
  rows,
}: {
  metric: MetricKey;
  rows: Array<{ category: string } & Record<MetricKey, number>>;
}) {
  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle>{metricLabels[metric]}</CardTitle>
      </CardHeader>
      <CardContent className="h-56">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="category" hide />
            <YAxis domain={[0, 10]} tickLine={false} width={28} />
            <Tooltip />
            <Bar dataKey={metric} radius={[6, 6, 0, 0]}>
              {rows.map((row) => (
                <Cell fill={chartColor(row.category)} key={row.category} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function ComparisonChart({
  rows,
  title,
}: {
  rows: Array<{ name: string; enjoyment: number; count: number }>;
  title: string;
}) {
  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-52">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tickLine={false} />
            <YAxis domain={[0, 10]} tickLine={false} width={28} />
            <Tooltip />
            <Bar dataKey="enjoyment" fill="#8a6f4d" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function buildSummary(
  rankedCategories: Array<{ category: string; fit: number }>,
  socialRows: Array<{ name: string; enjoyment: number; count: number }>
) {
  const topCategory = rankedCategories[0]?.category ?? "your strongest fits";
  const socialAttempts = socialRows.find((row) => row.name === "Social")?.count ?? 0;
  const soloAverage =
    socialRows.find((row) => row.name === "Solo")?.enjoyment ?? 0;
  const socialAverage =
    socialRows.find((row) => row.name === "Social")?.enjoyment ?? 0;

  if (socialAttempts < 3) {
    return `You respond strongly to ${topCategory}. Social activities are under-tested, so they are worth sampling this month.`;
  }

  if (soloAverage > socialAverage + 1) {
    return `You respond strongly to solo reflection and ${topCategory}. Keep sampling, but protect the quieter experiments.`;
  }

  if (socialAverage > soloAverage + 1) {
    return `Connection is showing up clearly, especially around ${topCategory}. Try one bigger version when you have a longer block.`;
  }

  return `${topCategory} is leading right now. Your evidence is balanced enough to keep exploring without narrowing too quickly.`;
}
