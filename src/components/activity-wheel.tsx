import type { ActivityRecord } from "@/lib/types";
import { categoryColors, uniqueCategories } from "@/lib/activity-utils";
import { CategoryGlyph } from "@/components/specimen-ticket";
import { RotateCw } from "lucide-react";

type ActivityWheelProps = {
  activities: ActivityRecord[];
  disabled: boolean;
  isSpinning: boolean;
  poolCount: number;
  rotation: number;
  onSpin: () => void;
};

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleDegrees: number
) {
  const angleRadians = ((angleDegrees - 90) * Math.PI) / 180;

  return {
    x: Number((centerX + radius * Math.cos(angleRadians)).toFixed(3)),
    y: Number((centerY + radius * Math.sin(angleRadians)).toFixed(3)),
  };
}

function segmentPath(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    `M ${centerX} ${centerY}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

export function ActivityWheel({
  activities,
  disabled,
  isSpinning,
  poolCount,
  rotation,
  onSpin,
}: ActivityWheelProps) {
  const categories = uniqueCategories(activities);
  const visibleCategories = categories.length > 0 ? categories : ["No match"];
  const segmentAngle = 360 / visibleCategories.length;
  const hasLanded = rotation > 0 && !isSpinning;

  return (
    <section
      className={`relative mx-auto grid w-full max-w-[390px] place-items-center ${hasLanded ? "wheel-landed" : ""}`}
    >
      <div className="wheel-pointer absolute -top-1 left-1/2 z-20 h-0 w-0 -translate-x-1/2 border-x-[18px] border-t-[32px] border-x-transparent border-t-[var(--gold)] drop-shadow-[0_4px_0_rgba(32,43,56,0.22)]" />
      <div className="absolute top-[22px] left-1/2 z-30 size-4 -translate-x-1/2 rounded-full border-2 border-[var(--ink)] bg-[var(--gold)] shadow-sm" />
      <svg
        viewBox="0 0 240 240"
        className="aspect-square w-full max-w-[300px] drop-shadow-[0_24px_24px_rgba(32,43,56,0.22)] sm:max-w-[340px]"
        aria-label="Activity category wheel"
      >
        <circle cx="120" cy="126" r="108" fill="rgba(32,43,56,0.16)" />
        <circle cx="120" cy="120" r="115" fill="var(--ticket)" />
        <g
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: "120px 120px",
            transition: isSpinning
              ? "transform 2600ms cubic-bezier(.14,.84,.2,1.05)"
              : "none",
          }}
        >
          {visibleCategories.map((category, index) => {
            const startAngle = index * segmentAngle;
            const endAngle = startAngle + segmentAngle;
            const middleAngle = startAngle + segmentAngle / 2;
            const fill = categoryColors[category] ?? "var(--ticket-edge)";
            const iconPoint = polarToCartesian(120, 120, 74, middleAngle);

            return (
              <g key={category}>
                <path
                  d={segmentPath(120, 120, 108, startAngle, endAngle)}
                  fill={fill}
                  stroke="var(--cream-line)"
                  strokeWidth="1.4"
                />
                <foreignObject
                  height="28"
                  width="28"
                  x={iconPoint.x - 14}
                  y={iconPoint.y - 14}
                >
                  <div className="grid size-7 place-items-center rounded-full bg-[rgba(251,247,234,0.78)] text-[var(--ink)] shadow-sm">
                    <CategoryGlyph category={category} className="size-4" />
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </g>
        <circle cx="120" cy="120" r="54" fill="rgba(251,247,234,0.94)" />
        <circle
          cx="120"
          cy="120"
          r="47"
          fill="transparent"
          stroke="rgba(32,43,56,0.18)"
          strokeWidth="1.2"
        />
      </svg>
      <button
        className="absolute grid size-24 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--gold)] text-[var(--ink)] shadow-[0_10px_0_rgba(32,43,56,0.18)] transition active:translate-y-0.5 active:shadow-[0_6px_0_rgba(32,43,56,0.18)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color-mix(in_srgb,var(--gold),white_35%)] disabled:pointer-events-none disabled:opacity-60"
        disabled={disabled || isSpinning}
        onClick={onSpin}
        type="button"
      >
        <span className="flex flex-col items-center gap-0.5">
          <RotateCw className={`size-4 ${isSpinning ? "animate-spin" : ""}`} />
          <span className="font-heading text-xl leading-none">
            {isSpinning ? "Spinning" : "Spin"}
          </span>
          <span className="font-mono text-[11px] opacity-75">{poolCount}</span>
        </span>
      </button>
    </section>
  );
}
