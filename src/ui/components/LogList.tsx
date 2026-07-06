import type { LogEntry } from "../../core/types";
import { entryTotal, fmt } from "../../core/calc";

export function LogList({
  entries,
  onDelete,
}: {
  entries: LogEntry[];
  onDelete: (entry: LogEntry) => void;
}) {
  if (entries.length === 0) {
    return <p className="empty-hint">Nothing logged yet. Tap a food above.</p>;
  }
  // Newest first for the visible list.
  const sorted = [...entries].sort((a, b) => b.loggedAt - a.loggedAt);
  return (
    <ul className="log-list">
      {sorted.map((e) => {
        const total = entryTotal(e);
        return (
          <li key={e.id} className="log-row">
            <span className="log-emoji">{e.emoji || "🍽️"}</span>
            <span className="log-main">
              <span className="log-name">
                {e.foodName}
                {e.servings !== 1 && (
                  <span className="log-servings"> ×{e.servings}</span>
                )}
              </span>
              <span className="log-macros">
                {fmt(total.kcal)} kcal · P {fmt(total.protein)} · C{" "}
                {fmt(total.carbs)} · F {fmt(total.fat)}
              </span>
            </span>
            <button
              className="log-delete"
              aria-label={`Delete ${e.foodName}`}
              onClick={() => onDelete(e)}
            >
              ✕
            </button>
          </li>
        );
      })}
    </ul>
  );
}
