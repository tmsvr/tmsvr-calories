import { useMemo } from "react";

const COLORS = [
  "var(--c-kcal)",
  "var(--c-protein)",
  "var(--c-carbs)",
  "var(--c-fat)",
];

/**
 * Confetti burst shown when the last ring closes. Pure CSS animation;
 * the parent mounts it for ~2s and then removes it.
 */
export function Celebration() {
  const particles = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => {
        const angle = (i / 28) * 2 * Math.PI + Math.random() * 0.4;
        const dist = 90 + Math.random() * 130;
        return {
          color: COLORS[i % COLORS.length],
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist - 40,
          rot: Math.random() * 540 - 270,
          delay: Math.random() * 0.15,
          size: 6 + Math.random() * 6,
        };
      }),
    [],
  );

  return (
    <div className="celebration" aria-hidden="true">
      <div className="celebration-burst">
        {particles.map((p, i) => (
          <span
            key={i}
            className="confetti"
            style={{
              background: p.color,
              width: p.size,
              height: p.size * 0.6,
              animationDelay: `${p.delay}s`,
              ["--dx" as string]: `${p.dx}px`,
              ["--dy" as string]: `${p.dy}px`,
              ["--rot" as string]: `${p.rot}deg`,
            }}
          />
        ))}
      </div>
      <div className="celebration-text">Rings closed! 🎉</div>
    </div>
  );
}
