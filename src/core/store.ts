import type { FoodItem, LogEntry, Meal, Targets } from "./types";

/**
 * Storage abstraction. The UI talks ONLY to this interface.
 *
 * All methods are async even though the current backend (localStorage) is
 * synchronous — this lets a remote implementation (e.g. Supabase) drop in
 * without any UI changes.
 */
export interface DataStore {
  getTargets(): Promise<Targets>;
  setTargets(targets: Targets): Promise<void>;

  getFoods(): Promise<FoodItem[]>;
  /** Insert or update (matched by id). */
  saveFood(food: FoodItem): Promise<void>;
  deleteFood(foodId: string): Promise<void>;

  getMeals(): Promise<Meal[]>;
  /** Insert or update (matched by id). */
  saveMeal(meal: Meal): Promise<void>;
  deleteMeal(mealId: string): Promise<void>;

  /**
   * How many times each food/meal id has been logged (for popularity
   * ranking). Maintained by addEntry/deleteEntry.
   */
  getUsageCounts(): Promise<Record<string, number>>;

  /** Entries for one local calendar day, oldest first. */
  getEntries(dateKey: string): Promise<LogEntry[]>;
  /** Entries grouped by day for an inclusive dateKey range. */
  getEntriesInRange(
    fromKey: string,
    toKey: string,
  ): Promise<Record<string, LogEntry[]>>;
  addEntry(entry: LogEntry): Promise<void>;
  deleteEntry(entryId: string): Promise<void>;

  /** Full data dump for backup / device migration. */
  exportAll(): Promise<ExportedData>;
  /** Replace ALL data with an imported dump. */
  importAll(data: ExportedData): Promise<void>;
}

export interface ExportedData {
  schemaVersion: number;
  exportedAt: string; // ISO timestamp
  targets: Targets;
  foods: FoodItem[];
  entries: LogEntry[];
  /** Absent in pre-meals backups; treat as []. */
  meals?: Meal[];
  /** Absent in pre-meals backups; treat as {}. */
  usage?: Record<string, number>;
}

export const SCHEMA_VERSION = 1;
