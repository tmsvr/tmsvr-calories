/**
 * Core domain types. This module (and everything in src/core/) must stay
 * free of React/DOM imports so it can be reused in a React Native app.
 */

/** Macros per single serving. All values are per 1 serving. */
export interface Macros {
  kcal: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
}

/** A user-defined food in the personal quick-add library. */
export interface FoodItem extends Macros {
  id: string;
  name: string;
  /** Optional emoji shown on the quick-add chip. */
  emoji?: string;
  /** Human-readable serving description, e.g. "100g", "1 scoop", "1 egg". */
  servingLabel?: string;
  /** Sort position in the quick-add grid (lower = earlier). */
  sortOrder: number;
}

/** One ingredient of a meal: a base food and how many servings of it. */
export interface MealComponent {
  foodId: string;
  servings: number;
}

/**
 * A composite of base foods (e.g. a sandwich). Logging a meal produces a
 * single LogEntry whose macros are the component sum at log time — editing
 * the meal or its foods later never rewrites history.
 */
export interface Meal {
  id: string;
  name: string;
  emoji?: string;
  components: MealComponent[];
  sortOrder: number;
}

/**
 * Anything that can be logged with one tap: a FoodItem, or a Meal with its
 * macros already computed. `isMeal` only affects display.
 */
export interface Loggable extends Macros {
  id: string;
  name: string;
  emoji?: string;
  servingLabel?: string;
  isMeal?: boolean;
}

/**
 * One logged serving event. Macros are snapshotted from the food/meal at
 * log time so later edits never rewrite history.
 */
export interface LogEntry {
  id: string;
  /** Local calendar day, "YYYY-MM-DD". */
  dateKey: string;
  /** Id of the food OR meal it came from (may no longer exist). */
  foodId: string;
  foodName: string;
  emoji?: string;
  servings: number;
  /** Macros for ONE serving at the time of logging. */
  perServing: Macros;
  /** Epoch millis when logged. */
  loggedAt: number;
}

/** Daily targets, manually set by the user. */
export interface Targets extends Macros {}

export const DEFAULT_TARGETS: Targets = {
  kcal: 3150,
  protein: 170,
  carbs: 415,
  fat: 90,
};
