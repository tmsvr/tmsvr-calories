import { useMemo, useState } from "react";
import type { Loggable } from "../../core/types";
import { fmt, splitByPopularity } from "../../core/calc";

const MULTIPLIERS = [0.5, 1, 1.5, 2, 3];
const TOP_N = 8;

export function ServingPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (m: number) => void;
}) {
  return (
    <div className="serving-picker" role="radiogroup" aria-label="Servings">
      <span className="serving-picker-label">Servings</span>
      {MULTIPLIERS.map((m) => (
        <button
          key={m}
          role="radio"
          aria-checked={value === m}
          className={`serving-btn ${value === m ? "active" : ""}`}
          onClick={() => onChange(m)}
        >
          {m === 0.5 ? "½" : m === 1.5 ? "1½" : m}
        </button>
      ))}
    </div>
  );
}

function Chip({
  item,
  multiplier,
  onLog,
}: {
  item: Loggable;
  multiplier: number;
  onLog: (item: Loggable) => void;
}) {
  return (
    <button className="food-chip" onClick={() => onLog(item)}>
      <span className="food-chip-emoji">
        {item.emoji || (item.isMeal ? "🍱" : "🍽️")}
      </span>
      <span className="food-chip-name">
        {item.name}
        {item.isMeal && <span className="meal-badge">meal</span>}
      </span>
      <span className="food-chip-kcal">
        {fmt(item.kcal * multiplier)} kcal
        {item.servingLabel ? ` · ${item.servingLabel}` : ""}
      </span>
    </button>
  );
}

/**
 * Quick-add area: the TOP_N most-logged items as a grid, then a search box
 * covering everything, with a "show all" toggle for browsing the rest.
 */
export function QuickAdd({
  items,
  usage,
  multiplier,
  onLog,
}: {
  items: Loggable[];
  usage: Record<string, number>;
  multiplier: number;
  onLog: (item: Loggable) => void;
}) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const { top, rest } = useMemo(
    () => splitByPopularity(items, usage, TOP_N),
    [items, usage],
  );

  const searching = query.trim().length > 0;
  const matches = useMemo(() => {
    if (!searching) return [];
    const q = query.trim().toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, query, searching]);

  const log = (item: Loggable) => {
    onLog(item);
    setQuery("");
  };

  if (items.length === 0) {
    return (
      <p className="empty-hint">
        No foods yet — add your staples in the Foods tab.
      </p>
    );
  }

  return (
    <div className="quick-add">
      <div className="quick-search-row">
        <input
          className="quick-search"
          type="search"
          placeholder="Search all foods & meals…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={(e) => {
            const target = e.currentTarget;
            target.scrollIntoView({ block: "start", behavior: "smooth" });
            setTimeout(() => {
              target.scrollIntoView({ block: "start", behavior: "smooth" });
            }, 250);
          }}
        />
        {!searching && rest.length > 0 && (
          <button
            className="btn-ghost quick-showall"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Less ▴" : "All ▾"}
          </button>
        )}
      </div>

      {!searching && (
        <div className="quick-grid">
          {top.map((item) => (
            <Chip key={item.id} item={item} multiplier={multiplier} onLog={log} />
          ))}
        </div>
      )}

      {searching &&
        (matches.length > 0 ? (
          <div className="quick-grid">
            {matches.map((item) => (
              <Chip key={item.id} item={item} multiplier={multiplier} onLog={log} />
            ))}
          </div>
        ) : (
          <p className="empty-hint">No match for “{query.trim()}”.</p>
        ))}

      {!searching && showAll && rest.length > 0 && (
        <div className="quick-grid">
          {rest.map((item) => (
            <Chip key={item.id} item={item} multiplier={multiplier} onLog={log} />
          ))}
        </div>
      )}
    </div>
  );
}
