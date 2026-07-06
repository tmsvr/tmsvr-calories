import type { DataStore, ExportedData } from "../core/store";
import { SCHEMA_VERSION } from "../core/store";
import type { FoodItem, LogEntry, Meal, Targets } from "../core/types";
import { DEFAULT_TARGETS } from "../core/types";
import { allSeeds } from "../core/seed";
import { newId } from "../core/id";

/**
 * localStorage-backed DataStore.
 *
 * Layout (all values JSON):
 *   cal.meta            -> { schemaVersion }
 *   cal.targets         -> Targets
 *   cal.foods           -> FoodItem[]
 *   cal.meals           -> Meal[]
 *   cal.usage           -> Record<foodOrMealId, timesLogged>
 *   cal.entries.<dateKey> -> LogEntry[]   (one key per day, keeps reads small)
 */
const PREFIX = "cal.";
const META_KEY = `${PREFIX}meta`;
const TARGETS_KEY = `${PREFIX}targets`;
const FOODS_KEY = `${PREFIX}foods`;
const MEALS_KEY = `${PREFIX}meals`;
const USAGE_KEY = `${PREFIX}usage`;
const SEEDS_OFFERED_KEY = `${PREFIX}seedsOffered`;
const ENTRIES_PREFIX = `${PREFIX}entries.`;

function read<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export class LocalStorageStore implements DataStore {
  constructor() {
    this.initIfNeeded();
  }

  private initIfNeeded(): void {
    if (!read(META_KEY)) write(META_KEY, { schemaVersion: SCHEMA_VERSION });
    if (!read(TARGETS_KEY)) write(TARGETS_KEY, DEFAULT_TARGETS);
    this.syncSeeds();
  }

  /**
   * Offer each built-in seed food exactly once per install, tracked by a
   * name ledger (cal.seedsOffered). Runs on every launch and is idempotent:
   * partial runs self-heal on the next launch, and a seed the user deleted
   * or renamed is never re-added because its name stays in the ledger.
   */
  private syncSeeds(): void {
    const offered = new Set(read<string[]>(SEEDS_OFFERED_KEY) ?? []);
    const foods = read<FoodItem[]>(FOODS_KEY) ?? [];
    const present = new Set(foods.map((f) => f.name.trim().toLowerCase()));
    let sortOrder = foods.length
      ? Math.max(...foods.map((f) => f.sortOrder)) + 1
      : 0;
    let changed = false;
    for (const seed of allSeeds()) {
      const { aliases, ...food } = seed;
      const keys = [food.name, ...(aliases ?? [])].map((n) =>
        n.trim().toLowerCase(),
      );
      if (keys.some((k) => offered.has(k))) continue;
      if (!keys.some((k) => present.has(k))) {
        foods.push({ ...food, id: newId(), sortOrder: sortOrder++ });
      }
      for (const k of keys) offered.add(k);
      changed = true;
    }
    if (changed) {
      write(FOODS_KEY, foods);
      write(SEEDS_OFFERED_KEY, [...offered]);
    }
  }

  async getTargets(): Promise<Targets> {
    return read<Targets>(TARGETS_KEY) ?? DEFAULT_TARGETS;
  }

  async setTargets(targets: Targets): Promise<void> {
    write(TARGETS_KEY, { ...targets, updatedAt: Date.now() });
  }

  async getFoods(): Promise<FoodItem[]> {
    const foods = read<FoodItem[]>(FOODS_KEY) ?? [];
    return [...foods].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async saveFood(food: FoodItem): Promise<void> {
    const foods = read<FoodItem[]>(FOODS_KEY) ?? [];
    const stamped = { ...food, updatedAt: Date.now() };
    const idx = foods.findIndex((f) => f.id === food.id);
    if (idx >= 0) foods[idx] = stamped;
    else foods.push(stamped);
    write(FOODS_KEY, foods);
  }

  async deleteFood(foodId: string): Promise<void> {
    const foods = read<FoodItem[]>(FOODS_KEY) ?? [];
    write(
      FOODS_KEY,
      foods.filter((f) => f.id !== foodId),
    );
  }

  async getEntries(dateKey: string): Promise<LogEntry[]> {
    const entries = read<LogEntry[]>(ENTRIES_PREFIX + dateKey) ?? [];
    return [...entries].sort((a, b) => a.loggedAt - b.loggedAt);
  }

  async getMeals(): Promise<Meal[]> {
    const meals = read<Meal[]>(MEALS_KEY) ?? [];
    return [...meals].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async saveMeal(meal: Meal): Promise<void> {
    const meals = read<Meal[]>(MEALS_KEY) ?? [];
    const stamped = { ...meal, updatedAt: Date.now() };
    const idx = meals.findIndex((m) => m.id === meal.id);
    if (idx >= 0) meals[idx] = stamped;
    else meals.push(stamped);
    write(MEALS_KEY, meals);
  }

  async deleteMeal(mealId: string): Promise<void> {
    const meals = read<Meal[]>(MEALS_KEY) ?? [];
    write(
      MEALS_KEY,
      meals.filter((m) => m.id !== mealId),
    );
  }

  async getUsageCounts(): Promise<Record<string, number>> {
    return read<Record<string, number>>(USAGE_KEY) ?? {};
  }

  private bumpUsage(id: string, delta: number): void {
    const usage = read<Record<string, number>>(USAGE_KEY) ?? {};
    const next = (usage[id] ?? 0) + delta;
    if (next <= 0) delete usage[id];
    else usage[id] = next;
    write(USAGE_KEY, usage);
  }

  async getEntriesInRange(
    fromKey: string,
    toKey: string,
  ): Promise<Record<string, LogEntry[]>> {
    const result: Record<string, LogEntry[]> = {};
    for (const key of this.entryKeys()) {
      const dateKey = key.slice(ENTRIES_PREFIX.length);
      if (dateKey < fromKey || dateKey > toKey) continue;
      const entries = read<LogEntry[]>(key) ?? [];
      if (entries.length) result[dateKey] = entries;
    }
    return result;
  }

  async addEntry(entry: LogEntry): Promise<void> {
    const key = ENTRIES_PREFIX + entry.dateKey;
    const entries = read<LogEntry[]>(key) ?? [];
    entries.push(entry);
    write(key, entries);
    this.bumpUsage(entry.foodId, 1);
  }

  async deleteEntry(entryId: string): Promise<void> {
    // Entries are partitioned by day; scan day keys to find the owner.
    for (const key of this.entryKeys()) {
      const entries = read<LogEntry[]>(key) ?? [];
      const removed = entries.find((e) => e.id === entryId);
      if (!removed) continue;
      const filtered = entries.filter((e) => e.id !== entryId);
      if (filtered.length === 0) localStorage.removeItem(key);
      else write(key, filtered);
      this.bumpUsage(removed.foodId, -1);
      return;
    }
  }

  async exportAll(): Promise<ExportedData> {
    const entries: LogEntry[] = [];
    for (const key of this.entryKeys()) {
      entries.push(...(read<LogEntry[]>(key) ?? []));
    }
    return {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      targets: await this.getTargets(),
      foods: await this.getFoods(),
      entries,
      meals: await this.getMeals(),
      usage: await this.getUsageCounts(),
    };
  }

  async importAll(data: ExportedData): Promise<void> {
    if (data.schemaVersion !== SCHEMA_VERSION) {
      throw new Error(
        `Unsupported schema version ${data.schemaVersion} (expected ${SCHEMA_VERSION})`,
      );
    }
    // Wipe existing app keys, then write the imported set.
    for (const key of this.allKeys()) localStorage.removeItem(key);
    write(META_KEY, { schemaVersion: SCHEMA_VERSION });
    write(TARGETS_KEY, data.targets);
    write(FOODS_KEY, data.foods);
    write(MEALS_KEY, data.meals ?? []);
    write(USAGE_KEY, data.usage ?? {});
    // An import is an established dataset — don't push seeds into it.
    write(
      SEEDS_OFFERED_KEY,
      allSeeds().map((s) => s.name.trim().toLowerCase()),
    );
    const byDay = new Map<string, LogEntry[]>();
    for (const e of data.entries) {
      const list = byDay.get(e.dateKey) ?? [];
      list.push(e);
      byDay.set(e.dateKey, list);
    }
    for (const [dateKey, list] of byDay) write(ENTRIES_PREFIX + dateKey, list);
  }

  private allKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(PREFIX)) keys.push(key);
    }
    return keys;
  }

  private entryKeys(): string[] {
    return this.allKeys().filter((k) => k.startsWith(ENTRIES_PREFIX));
  }
}
