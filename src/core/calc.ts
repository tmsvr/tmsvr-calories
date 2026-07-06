import type {
  FoodItem,
  Loggable,
  LogEntry,
  Macros,
  Meal,
  Targets,
} from "./types";

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
  /** How many days in the window actually had logs (the denominator). */
  loggedDays: number;
}

/**
 * Average kcal/protein per day across the given days, counting only days
 * that have at least one entry (an unlogged day is missing data, not a
 * zero-calorie day).
 */
export function trendAverages(byDay: Record<string, LogEntry[]>): TrendAverages {
  const dayTotals = Object.values(byDay)
    .filter((list) => list.length > 0)
    .map(sumEntries);
  if (dayTotals.length === 0) return { kcal: 0, protein: 0, loggedDays: 0 };
  return {
    kcal: dayTotals.reduce((a, t) => a + t.kcal, 0) / dayTotals.length,
    protein: dayTotals.reduce((a, t) => a + t.protein, 0) / dayTotals.length,
    loggedDays: dayTotals.length,
  };
}

/** A day "hits the calorie target" when within this band of the target. */
export const KCAL_BAND = { lo: 0.9, hi: 1.1 };

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
