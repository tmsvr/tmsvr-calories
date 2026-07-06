import { useEffect, useMemo, useState } from "react";
import { useAppState } from "../appState";
import { dayProgress } from "../../core/calc";
import {
  addMonths,
  monthGrid,
  monthLabel,
  monthOf,
  todayKey,
} from "../../core/date";
import type { LogEntry } from "../../core/types";
import { RingsSvg } from "../components/Rings";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function HistoryScreen({ onOpenDay }: { onOpenDay: (dateKey: string) => void }) {
  const { targets, getEntriesInRange, entries, dateKey } = useAppState();
  const [monthKey, setMonthKey] = useState(monthOf(todayKey()));
  const [days, setDays] = useState<Record<string, LogEntry[]>>({});

  const weeks = useMemo(() => monthGrid(monthKey), [monthKey]);
  const today = todayKey();

  // `entries`/`dateKey` in deps: re-fetch after logging/deleting so the
  // calendar is fresh when the user tabs back.
  useEffect(() => {
    let cancelled = false;
    const from = `${monthKey}-01`;
    const to = `${monthKey}-31`;
    getEntriesInRange(from, to).then((result) => {
      if (!cancelled) setDays(result);
    });
    return () => {
      cancelled = true;
    };
  }, [getEntriesInRange, monthKey, entries, dateKey]);

  return (
    <div className="screen">
      <header className="day-nav">
        <button
          className="day-arrow"
          aria-label="Previous month"
          onClick={() => setMonthKey(addMonths(monthKey, -1))}
        >
          ‹
        </button>
        <button
          className="day-label"
          onClick={() => setMonthKey(monthOf(today))}
          title="Jump to current month"
        >
          {monthLabel(monthKey)}
        </button>
        <button
          className="day-arrow"
          aria-label="Next month"
          disabled={monthKey >= monthOf(today)}
          onClick={() => setMonthKey(addMonths(monthKey, 1))}
        >
          ›
        </button>
      </header>

      <div className="calendar">
        <div className="calendar-week calendar-head">
          {WEEKDAYS.map((d, i) => (
            <span key={i} className="calendar-weekday">
              {d}
            </span>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="calendar-week">
            {week.map((day, di) => {
              if (!day) return <span key={di} className="calendar-cell" />;
              const dayEntries = days[day];
              const future = day > today;
              return (
                <button
                  key={di}
                  className={`calendar-cell calendar-day ${
                    day === today ? "is-today" : ""
                  }`}
                  disabled={future}
                  onClick={() => onOpenDay(day)}
                >
                  <span className="calendar-daynum">{Number(day.slice(8))}</span>
                  {dayEntries ? (
                    <RingsSvg
                      fractions={dayProgress(dayEntries, targets).fractions}
                      size={44}
                      stroke={4}
                      gap={1.5}
                      glow={false}
                    />
                  ) : (
                    <span className={`calendar-empty ${future ? "future" : ""}`} />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <p className="hint" style={{ textAlign: "center" }}>
        Tap a day to view or edit its log.
      </p>
    </div>
  );
}
