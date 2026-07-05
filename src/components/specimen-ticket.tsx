import type { CSSProperties, ReactNode } from "react";
import {
  Battery,
  BookOpen,
  Clock,
  Dice5,
  Footprints,
  Home,
  Leaf,
  Map as MapIcon,
  Moon,
  Paintbrush,
  Sparkles,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { categoryColors } from "@/lib/activity-utils";
import type { ActivityRecord } from "@/lib/types";

type SpecimenTicketProps = {
  activity: ActivityRecord;
  actions?: ReactNode;
  className?: string;
  deepenNote?: string | null;
  label?: string;
  variant?: "full" | "compact";
};

export function SpecimenTicket({
  activity,
  actions,
  className = "",
  deepenNote,
  label = "Specimen drawn",
  variant = "full",
}: SpecimenTicketProps) {
  const categoryColor = categoryColors[activity.category] ?? "var(--teal)";

  return (
    <article
      className={`specimen-ticket ticket-punch-in ${className}`}
      style={{ "--stamp-color": categoryColor } as CSSProperties}
    >
      <div className="relative z-10 flex min-h-12 items-center justify-between gap-4 px-4 pb-4 pt-3">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--ink-soft)]">
            {label}
          </p>
          <p className="font-mono text-xs font-semibold text-[var(--ink)]">
            No. {activity.id.toString().padStart(4, "0")}
          </p>
        </div>
        <div className="rounded-full border border-[var(--ticket-edge)] px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink)]">
          {activity.minTime}-{activity.maxTime} min
        </div>
      </div>

      <div
        className={`relative z-10 px-4 ${variant === "compact" ? "pb-4 pt-4" : "pb-5 pt-6"}`}
      >
        <StampBadge activity={activity} />
        <div className="pr-16">
          <Badge
            className="mb-3 rounded-none border border-[var(--stamp-color)] bg-transparent px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--stamp-color)]"
          >
            {activity.category}
          </Badge>
          <h2
            className={`font-heading text-[var(--ink)] ${
              variant === "compact"
                ? "text-xl leading-snug"
                : "text-2xl leading-[1.08] md:text-3xl"
            }`}
          >
            {activity.activity}
          </h2>
        </div>

        {deepenNote && (
          <p className="mt-4 border-l-2 border-[var(--gold)] bg-[color-mix(in_srgb,var(--gold),white_78%)] px-3 py-2 text-sm text-[var(--ink)]">
            {deepenNote}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <TicketMeta icon={<Clock />} label={`${activity.minTime}-${activity.maxTime} min`} />
          <TicketMeta icon={<Battery />} label={activity.energy} />
          <TicketMeta icon={<Home />} label={activity.setting.replace("-", " ")} />
          <TicketMeta icon={<Users />} label={activity.socialMode} />
          <TicketMeta icon={<Wallet />} label={activity.cost} />
          <TicketMeta icon={<Sparkles />} label={activity.moodTarget} />
        </div>

        {actions && <div className="mt-5 grid grid-cols-2 gap-2">{actions}</div>}
      </div>
    </article>
  );
}

function StampBadge({ activity }: { activity: ActivityRecord }) {
  return (
    <div
      aria-label={`${activity.category} stamp`}
      className="absolute right-4 top-5 grid size-16 rotate-[-10deg] place-items-center rounded-full border-2 border-[var(--stamp-color)] text-[var(--stamp-color)]"
    >
      <div className="absolute inset-1 rounded-full border border-current opacity-55" />
      <CategoryGlyph category={activity.category} className="size-6" />
      <span className="absolute bottom-3 font-mono text-[8px] font-semibold uppercase tracking-[0.16em]">
        {abbreviateCategory(activity.category)}
      </span>
    </div>
  );
}

function TicketMeta({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex min-h-10 items-center gap-2 border border-[color-mix(in_srgb,var(--ink-soft),transparent_62%)] bg-[rgba(255,255,255,0.28)] px-3 font-mono text-[11px] uppercase tracking-[0.04em] text-[var(--ink-soft)] [&_svg]:size-4">
      {icon}
      <span className="truncate">{label}</span>
    </div>
  );
}

export function CategoryGlyph({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  switch (category) {
    case "Physical / Movement":
      return <Footprints className={className} />;
    case "Creative Expression":
      return <Paintbrush className={className} />;
    case "Intellectual / Learning":
      return <BookOpen className={className} />;
    case "Outdoor / Urban Exploration":
      return <MapIcon className={className} />;
    case "Practical / Making":
      return <Wrench className={className} />;
    case "Reflective / Self-connection":
      return <Moon className={className} />;
    case "Social / Community / Relational":
      return <Users className={className} />;
    case "Restorative / Low-energy":
      return <Leaf className={className} />;
    case "Play / Novelty":
      return <Dice5 className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}

function abbreviateCategory(category: string) {
  return category
    .split("/")
    .map((part) => part.trim()[0])
    .join("")
    .slice(0, 3);
}
