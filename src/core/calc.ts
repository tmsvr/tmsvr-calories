import type {
  FoodItem,
  Loggable,
  LogEntry,
  Macros,
  Meal,
  Targets,
} from "./types";
import { addDays } from "./date";

export const EMPTY_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

/** Total macros consumed for a list of log entries. */
export function sumEntries(entries: LogEntry[]): Macros {
  return entries.reduce<Macros>(
    (acc, e) => ({
      kcal: acc.kcal + e.perServing.kcal * e.servings,
      protein: acc.protein + e.perServing.protein * e.servings,
      carbs: acc.carbs + e.perServing.carbs * e.servings,
      fat: acc.fat + e.perServing.fat * e.servings,
    }),
    EMPTY_MACROS,
  );
}

/** Macros for one entry (perServing × servings). */
export function entryTotal(e: LogEntry): Macros {
  return {
    kcal: e.perServing.kcal * e.servings,
    protein: e.perServing.protein * e.servings,
    carbs: e.perServing.carbs * e.servings,
    fat: e.perServing.fat * e.servings,
  };
}

/** Progress fraction toward a target. Unclamped (can exceed 1). 0 target => 0. */
export function progress(consumed: number, target: number): number {
  if (target <= 0) return 0;
  return consumed / target;
}

export interface DayProgress {
  consumed: Macros;
  targets: Targets;
  /** Fractions 0..n for each macro (can exceed 1 when over target). */
  fractions: Macros;
  remaining: Macros;
}

export function dayProgress(entries: LogEntry[], targets: Targets): DayProgress {
  const consumed = sumEntries(entries);
  return {
    consumed,
    targets,
    fractions: {
      kcal: progress(consumed.kcal, targets.kcal),
      protein: progress(consumed.protein, targets.protein),
      carbs: progress(consumed.carbs, targets.carbs),
      fat: progress(consumed.fat, targets.fat),
    },
    remaining: {
      kcal: targets.kcal - consumed.kcal,
      protein: targets.protein - consumed.protein,
      carbs: targets.carbs - consumed.carbs,
      fat: targets.fat - consumed.fat,
    },
  };
}

/** Round for display: whole numbers, no trailing noise from 0.5 servings etc. */
export function fmt(n: number): string {
  return String(Math.round(n));
}

/**
 * Macros of ONE serving of a meal, summed from its components using the
 * CURRENT food definitions. Components whose food no longer exists are
 * skipped (the meal editor surfaces those).
 */
export function mealMacros(meal: Meal, foods: FoodItem[]): Macros {
  const byId = new Map(foods.map((f) => [f.id, f]));
  return meal.components.reduce<Macros>((acc, c) => {
    const food = byId.get(c.foodId);
    if (!food) return acc;
    return {
      kcal: acc.kcal + food.kcal * c.servings,
      protein: acc.protein + food.protein * c.servings,
      carbs: acc.carbs + food.carbs * c.servings,
      fat: acc.fat + food.fat * c.servings,
    };
  }, EMPTY_MACROS);
}

/** Meals and foods as one tap-to-log list, meals first-class. */
export function toLoggables(foods: FoodItem[], meals: Meal[]): Loggable[] {
  const foodLoggables: Loggable[] = foods.map((f) => ({
    id: f.id,
    name: f.name,
    emoji: f.emoji,
    servingLabel: f.servingLabel,
    kcal: f.kcal,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
  }));
  const mealLoggables: Loggable[] = meals.map((m) => ({
    id: m.id,
    name: m.name,
    emoji: m.emoji,
    isMeal: true,
    ...mealMacros(m, foods),
  }));
  return [...mealLoggables, ...foodLoggables];
}

export interface TrendAverages {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** How many days in the window actually had logs (the denominator). */
  loggedDays: number;
}

/**
 * Average macros per day across the given days, counting only days
 * that have at least one entry (an unlogged day is missing data, not a
 * zero-calorie day).
 */
export function trendAverages(byDay: Record<string, LogEntry[]>): TrendAverages {
  const dayTotals = Object.values(byDay)
    .filter((list) => list.length > 0)
    .map(sumEntries);
  if (dayTotals.length === 0) {
    return { kcal: 0, protein: 0, carbs: 0, fat: 0, loggedDays: 0 };
  }
  return {
    kcal: dayTotals.reduce((a, t) => a + t.kcal, 0) / dayTotals.length,
    protein: dayTotals.reduce((a, t) => a + t.protein, 0) / dayTotals.length,
    carbs: dayTotals.reduce((a, t) => a + t.carbs, 0) / dayTotals.length,
    fat: dayTotals.reduce((a, t) => a + t.fat, 0) / dayTotals.length,
    loggedDays: dayTotals.length,
  };
}

/** A day "hits the calorie target" when within this band of the target. */
export const KCAL_BAND = { lo: 0.9, hi: 1.1 };

/**
 * Tolerance bands for a day to count as "all rings closed" (streaks and
 * the celebration). Deliberately looser than the visual 100% ring fill:
 * on a lean bulk, slightly under on calories or slightly over on carbs/fat
 * is still a hit day, and protein only has a floor.
 */
export const RING_BANDS = {
  kcal: { lo: 0.95, hi: 1.1 },
  protein: { lo: 1.0, hi: Infinity },
  carbs: { lo: 0.9, hi: 1.15 },
  fat: { lo: 0.9, hi: 1.15 },
} as const;

/** Whether a day's totals land inside RING_BANDS on all four rings. */
export function ringsClosed(consumed: Macros, targets: Targets): boolean {
  return (["kcal", "protein", "carbs", "fat"] as const).every((key) => {
    if (targets[key] <= 0) return false;
    const frac = consumed[key] / targets[key];
    return frac >= RING_BANDS[key].lo && frac <= RING_BANDS[key].hi;
  });
}

/**
 * Consecutive all-rings-closed days ending today — or ending yesterday if
 * today isn't closed yet (an in-progress day doesn't break the streak).
 */
export function streakLength(
  byDay: Record<string, LogEntry[]>,
  targets: Targets,
  today: string,
): number {
  const closed = (key: string) => {
    const list = byDay[key];
    return !!list && list.length > 0 && ringsClosed(sumEntries(list), targets);
  };
  let day = closed(today) ? today : addDays(today, -1);
  let n = 0;
  while (closed(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

/**
 * Longest run of consecutive all-rings-closed days within [fromKey, toKey]
 * (inclusive). Unlike `streakLength`, this scans a fixed window rather than
 * walking backward from today, so it can find a best streak anywhere in it.
 */
export function bestStreak(
  byDay: Record<string, LogEntry[]>,
  targets: Targets,
  fromKey: string,
  toKey: string,
): number {
  let best = 0;
  let current = 0;
  let day = fromKey;
  while (day <= toKey) {
    const list = byDay[day];
    if (list && list.length > 0 && ringsClosed(sumEntries(list), targets)) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
    day = addDays(day, 1);
  }
  return best;
}

export interface MacroAdherence {
  protein: number;
  carbs: number;
  fat: number;
  kcal: number;
  /** How many logged days the percentages are computed over. */
  loggedDays: number;
}

/**
 * For each macro, the percentage of logged days in `byDay` whose fraction
 * of target landed inside that macro's RING_BANDS band. Days with no
 * entries are excluded from the denominator.
 */
export function macroAdherence(
  byDay: Record<string, LogEntry[]>,
  targets: Targets,
): MacroAdherence {
  const dayTotals = Object.values(byDay).filter((list) => list.length > 0);
  const loggedDays = dayTotals.length;
  if (loggedDays === 0) {
    return { protein: 0, carbs: 0, fat: 0, kcal: 0, loggedDays: 0 };
  }
  const pct = (key: keyof Macros) => {
    if (targets[key] <= 0) return 0;
    const hits = dayTotals.filter((list) => {
      const total = sumEntries(list);
      const frac = total[key] / targets[key];
      return frac >= RING_BANDS[key].lo && frac <= RING_BANDS[key].hi;
    }).length;
    return (hits / loggedDays) * 100;
  };
  return {
    protein: pct("protein"),
    carbs: pct("carbs"),
    fat: pct("fat"),
    kcal: pct("kcal"),
    loggedDays,
  };
}

export interface TopFood {
  foodName: string;
  emoji?: string;
  count: number;
  totalKcal: number;
}

/**
 * The most-logged food names across all entries in `byDay`, ranked by log
 * count desc, ties broken by total kcal desc. Entries are grouped by
 * `foodName` (not foodId) so renamed/recreated foods still merge sensibly.
 */
export function topFoods(
  byDay: Record<string, LogEntry[]>,
  limit: number,
): TopFood[] {
  const byName = new Map<string, TopFood>();
  for (const list of Object.values(byDay)) {
    for (const e of list) {
      const existing = byName.get(e.foodName);
      const kcal = e.perServing.kcal * e.servings;
      if (existing) {
        existing.count += 1;
        existing.totalKcal += kcal;
      } else {
        byName.set(e.foodName, {
          foodName: e.foodName,
          emoji: e.emoji,
          count: 1,
          totalKcal: kcal,
        });
      }
    }
  }
  return Array.from(byName.values())
    .sort((a, b) => b.count - a.count || b.totalKcal - a.totalKcal)
    .slice(0, limit);
}

/** Count of days whose kcal total lands inside KCAL_BAND of the target. */
export function daysInKcalBand(
  byDay: Record<string, LogEntry[]>,
  targets: Targets,
): number {
  if (targets.kcal <= 0) return 0;
  return Object.values(byDay).filter((list) => {
    if (list.length === 0) return false;
    const frac = sumEntries(list).kcal / targets.kcal;
    return frac >= KCAL_BAND.lo && frac <= KCAL_BAND.hi;
  }).length;
}

/**
 * Split loggables into the `topN` most-used ("favorites") and the rest.
 * Popularity = usage count desc; ties keep the given list order.
 */
export function splitByPopularity(
  items: Loggable[],
  usage: Record<string, number>,
  topN: number,
): { top: Loggable[]; rest: Loggable[] } {
  const ranked = items
    .map((item, i) => ({ item, count: usage[item.id] ?? 0, i }))
    .sort((a, b) => b.count - a.count || a.i - b.i);
  return {
    top: ranked.slice(0, topN).map((r) => r.item),
    rest: ranked.slice(topN).map((r) => r.item),
  };
}
