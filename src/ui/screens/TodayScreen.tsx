import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppState } from "../../state/appState";
import {
  dayProgress,
  fmt,
  ringsClosed,
  streakLength,
  suggestFoods,
  sumEntries,
  toLoggables,
} from "../../core/calc";
import { addDays, formatDateKey, todayKey } from "../../core/date";
import type { Loggable } from "../../core/types";
import { Rings, MacroStats } from "../components/Rings";
import { QuickAdd, ServingPicker } from "../components/QuickAdd";
import { LogList } from "../components/LogList";
import { Toast, type ToastData } from "../components/Toast";
import { Celebration } from "../components/Celebration";

/** How far back the streak can reach. */
const STREAK_LOOKBACK_DAYS = 366;

export function TodayScreen() {
  const {
    targets,
    foods,
    meals,
    usage,
    dateKey,
    setDateKey,
    entries,
    logFood,
    deleteEntry,
    getEntriesInRange,
  } = useAppState();
  const [multiplier, setMultiplier] = useState(1);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [streak, setStreak] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout>>();

  const progress = dayProgress(entries, targets);
  const loggables = useMemo(() => toLoggables(foods, meals), [foods, meals]);

  const suggestions = useMemo(() => {
    if (new Date().getHours() < 18) return [];
    if (dateKey !== todayKey()) return [];
    if (ringsClosed(sumEntries(entries), targets)) return [];
    return suggestFoods(loggables, progress);
  }, [entries, targets, loggables, dateKey, progress]);

  const MACRO_LABEL: Record<"protein" | "carbs" | "fat", string> = {
    protein: "Protein",
    carbs: "Carbs",
    fat: "Fat",
  };

  // Streak is derived from stored entries, so it survives reloads for free.
  // `entries` in deps: logging/deleting today can extend or break it.
  useEffect(() => {
    let cancelled = false;
    const today = todayKey();
    getEntriesInRange(addDays(today, -STREAK_LOOKBACK_DAYS), today).then(
      (byDay) => {
        if (!cancelled) setStreak(streakLength(byDay, targets, today));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [getEntriesInRange, targets, entries]);

  useEffect(() => () => clearTimeout(celebrationTimer.current), []);

  const handleLog = useCallback(
    async (item: Loggable) => {
      // Celebrate only when THIS log closes the last ring on the real today
      // — never when merely viewing an already-closed or past day.
      const wasClosed = ringsClosed(sumEntries(entries), targets);
      const entry = await logFood(item, multiplier);
      const nowClosed = ringsClosed(
        sumEntries([...entries, entry]),
        targets,
      );
      if (dateKey === todayKey() && !wasClosed && nowClosed) {
        setCelebrating(true);
        clearTimeout(celebrationTimer.current);
        celebrationTimer.current = setTimeout(
          () => setCelebrating(false),
          2200,
        );
      }
      setMultiplier(1); // one-shot multiplier, snap back to 1 serving
      setToast({
        id: entry.id,
        message: `Logged ${item.name}${
          multiplier !== 1 ? ` ×${multiplier}` : ""
        } · ${fmt(item.kcal * multiplier)} kcal`,
        onUndo: () => deleteEntry(entry.id),
      });
    },
    [logFood, deleteEntry, multiplier, entries, targets, dateKey],
  );

  return (
    <div className="screen">
      <header className="day-nav">
        <button
          className="day-arrow"
          aria-label="Previous day"
          onClick={() => setDateKey(addDays(dateKey, -1))}
        >
          ‹
        </button>
        <button
          className="day-label"
          onClick={() => setDateKey(todayKey())}
          title="Jump to today"
        >
          {formatDateKey(dateKey)}
        </button>
        <button
          className="day-arrow"
          aria-label="Next day"
          disabled={dateKey >= todayKey()}
          onClick={() => setDateKey(addDays(dateKey, 1))}
        >
          ›
        </button>
      </header>

      <Rings progress={progress} />
      <MacroStats progress={progress} />
      {streak > 0 && (
        <p className="streak">
          🔥 {streak}-day streak — all rings closed
        </p>
      )}

      {suggestions.length > 0 && !suggestionsDismissed && (
        <section className="card evening-boost">
          <div className="evening-boost-header">
            <h3 className="stats-title">Evening boost 🌙</h3>
            <button
              className="evening-boost-dismiss"
              aria-label="Dismiss"
              onClick={() => setSuggestionsDismissed(true)}
            >
              ×
            </button>
          </div>
          <p className="hint" style={{ margin: "0 0 8px" }}>
            {MACRO_LABEL[suggestions[0].reason]}
            {suggestions[0].reason === "carbs" ? " are" : " is"} behind — these
            would help:
          </p>
          <div className="suggestions">
            {suggestions.map(({ item, reason }) => (
              <button
                key={item.id}
                className="suggestion-chip"
                onClick={() => handleLog(item)}
              >
                <span className="suggestion-emoji">{item.emoji ?? "🍽️"}</span>
                <span className="suggestion-name">{item.name}</span>
                <span className="suggestion-detail">
                  +{fmt(item[reason])}g {reason} · {fmt(item.kcal)} kcal
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <ServingPicker value={multiplier} onChange={setMultiplier} />
        <QuickAdd
          items={loggables}
          usage={usage}
          multiplier={multiplier}
          onLog={handleLog}
        />
      </section>

      <section>
        <h2 className="section-title">Logged</h2>
        <LogList
          entries={entries}
          onDelete={(e) => {
            deleteEntry(e.id);
            setToast(null);
          }}
        />
      </section>

      {celebrating && <Celebration />}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
