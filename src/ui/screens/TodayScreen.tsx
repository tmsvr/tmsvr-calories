import { useCallback, useMemo, useState } from "react";
import { useAppState } from "../appState";
import { dayProgress, fmt, toLoggables } from "../../core/calc";
import { addDays, formatDateKey, todayKey } from "../../core/date";
import type { Loggable } from "../../core/types";
import { Rings, MacroStats } from "../components/Rings";
import { QuickAdd, ServingPicker } from "../components/QuickAdd";
import { LogList } from "../components/LogList";
import { Toast, type ToastData } from "../components/Toast";

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
  } = useAppState();
  const [multiplier, setMultiplier] = useState(1);
  const [toast, setToast] = useState<ToastData | null>(null);

  const progress = dayProgress(entries, targets);
  const loggables = useMemo(() => toLoggables(foods, meals), [foods, meals]);

  const handleLog = useCallback(
    async (item: Loggable) => {
      const entry = await logFood(item, multiplier);
      setMultiplier(1); // one-shot multiplier, snap back to 1 serving
      setToast({
        id: entry.id,
        message: `Logged ${item.name}${
          multiplier !== 1 ? ` ×${multiplier}` : ""
        } · ${fmt(item.kcal * multiplier)} kcal`,
        onUndo: () => deleteEntry(entry.id),
      });
    },
    [logFood, deleteEntry, multiplier],
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

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
