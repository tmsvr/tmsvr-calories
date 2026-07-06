import { useEffect, useMemo, useState } from "react";
import { useAppState } from "../../state/appState";
import {
  dayProgress,
  daysInKcalBand,
  fmt,
  KCAL_BAND,
  trendAverages,
} from "../../core/calc";
import {
  addDays,
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
  const [recent, setRecent] = useState<Record<string, LogEntry[]>>({});

  const weeks = useMemo(() => monthGrid(monthKey), [monthKey]);
  const today = todayKey();

  // Last 30 days (ending today) for the rolling averages.
  useEffect(() => {
    let cancelled = false;
    getEntriesInRange(addDays(today, -29), today).then((result) => {
      if (!cancelled) setRecent(result);
    });
    return () => {
      cancelled = true;
    };
  }, [getEntriesInRange, today, entries]);

  const avg30 = useMemo(() => trendAverages(recent), [recent]);
  const avg7 = useMemo(() => {
    const cutoff = addDays(today, -6);
    const week = Object.fromEntries(
      Object.entries(recent).filter(([k]) => k >= cutoff),
    );
    return trendAverages(week);
  }, [recent, today]);
  const bandDays = useMemo(
    () => daysInKcalBand(days, targets),
    [days, targets],
  );

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

      <section className="card trends">
        <div className="trend-row">
          <span className="trend-label">7-day avg</span>
          <span className="trend-value">
            {avg7.loggedDays > 0
              ? `${fmt(avg7.kcal)} kcal · ${fmt(avg7.protein)}g protein`
              : "no logs yet"}
          </span>
          {avg7.loggedDays > 0 && (
            <span className="trend-note">{avg7.loggedDays}d logged</span>
          )}
        </div>
        <div className="trend-row">
          <span className="trend-label">30-day avg</span>
          <span className="trend-value">
            {avg30.loggedDays > 0
              ? `${fmt(avg30.kcal)} kcal · ${fmt(avg30.protein)}g protein`
              : "no logs yet"}
          </span>
          {avg30.loggedDays > 0 && (
            <span className="trend-note">{avg30.loggedDays}d logged</span>
          )}
        </div>
        <div className="trend-row">
          <span className="trend-label">On target</span>
          <span className="trend-value">
            {bandDays} day{bandDays === 1 ? "" : "s"} this month
          </span>
          <span className="trend-note">
            {Math.round(KCAL_BAND.lo * 100)}–{Math.round(KCAL_BAND.hi * 100)}%
            kcal
          </span>
        </div>
      </section>

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
