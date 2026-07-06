import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppState } from "../appState";
import {
  dayProgress,
  fmt,
  ringsClosed,
  streakLength,
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
  const celebrationTimer = useRef<ReturnType<typeof setTimeout>>();

  const progress = dayProgress(entries, targets);
  const loggables = useMemo(() => toLoggables(foods, meals), [foods, meals]);

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
      {streak > 0 ? (
        <p className="streak">
          🔥 {streak}-day streak — all rings closed
        </p>
      ) : (
        dateKey === todayKey() && (
          <p className="streak streak-zero">
            Close all rings to start a streak 🔥
          </p>
        )
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
