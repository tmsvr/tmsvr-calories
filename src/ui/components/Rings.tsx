import type { DayProgress } from "../../core/calc";
import type { Macros } from "../../core/types";
import { fmt } from "../../core/calc";

/**
 * Nested progress rings. Outer→inner: calories, protein, carbs, fat.
 * RingsSvg is size-agnostic and reused by the History calendar's minis.
 */

interface RingSpec {
  key: "kcal" | "protein" | "carbs" | "fat";
  color: string;
  track: string;
}

const RINGS: RingSpec[] = [
  { key: "kcal", color: "var(--c-kcal)", track: "var(--c-kcal-track)" },
  { key: "protein", color: "var(--c-protein)", track: "var(--c-protein-track)" },
  { key: "carbs", color: "var(--c-carbs)", track: "var(--c-carbs-track)" },
  { key: "fat", color: "var(--c-fat)", track: "var(--c-fat-track)" },
];

function Ring({
  center,
  radius,
  stroke,
  fraction,
  color,
  track,
  glow,
}: {
  center: number;
  radius: number;
  stroke: number;
  fraction: number;
  color: string;
  track: string;
  glow: boolean;
}) {
  const circumference = 2 * Math.PI * radius;
  const shown = Math.min(fraction, 1);
  const closed = fraction >= 1;
  return (
    <g>
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={track}
        strokeWidth={stroke}
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - shown)}
        transform={`rotate(-90 ${center} ${center})`}
        style={{
          transition: "stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
          filter: glow && closed ? `drop-shadow(0 0 6px ${color})` : undefined,
        }}
      />
    </g>
  );
}

export function RingsSvg({
  fractions,
  size = 320,
  stroke = 16,
  gap = 5,
  glow = true,
  label,
}: {
  fractions: Macros;
  size?: number;
  stroke?: number;
  gap?: number;
  glow?: boolean;
  label?: string;
}) {
  const center = size / 2;
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label ?? "Macro progress rings"}
    >
      {RINGS.map((spec, i) => (
        <Ring
          key={spec.key}
          center={center}
          radius={center - stroke / 2 - i * (stroke + gap)}
          stroke={stroke}
          fraction={fractions[spec.key]}
          color={spec.color}
          track={spec.track}
          glow={glow}
        />
      ))}
    </svg>
  );
}

export function Rings({ progress }: { progress: DayProgress }) {
  const { consumed, targets, fractions } = progress;
  return (
    <div className="rings">
      <RingsSvg
        fractions={fractions}
        label={`Calories ${fmt(consumed.kcal)} of ${fmt(targets.kcal)}`}
      />
      <div className="rings-center">
        <div className="rings-kcal">{fmt(consumed.kcal)}</div>
        <div className="rings-kcal-label">/ {fmt(targets.kcal)} kcal</div>
      </div>
    </div>
  );
}

export function MacroStats({ progress }: { progress: DayProgress }) {
  const { consumed, targets } = progress;
  const stats = [
    { label: "Protein", key: "protein" as const, unit: "g", cls: "protein" },
    { label: "Carbs", key: "carbs" as const, unit: "g", cls: "carbs" },
    { label: "Fat", key: "fat" as const, unit: "g", cls: "fat" },
  ];
  return (
    <div className="macro-stats">
      {stats.map((s) => (
        <div key={s.key} className="macro-stat" title={s.label}>
          <span className={`dot dot-${s.cls}`} />
          <span className="macro-stat-value">
            {fmt(consumed[s.key])}
            <span className="macro-stat-target">
              /{fmt(targets[s.key])}
              {s.unit}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
