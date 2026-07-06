import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DataStore, ExportedData } from "../core/store";
import type {
  FoodItem,
  Loggable,
  LogEntry,
  Meal,
  Targets,
} from "../core/types";
import { DEFAULT_TARGETS } from "../core/types";
import { newId } from "../core/id";
import { todayKey } from "../core/date";

interface AppState {
  ready: boolean;
  targets: Targets;
  foods: FoodItem[];
  meals: Meal[];
  /** Times each food/meal id has been logged, for popularity ranking. */
  usage: Record<string, number>;
  /** Currently viewed day. */
  dateKey: string;
  /** Entries for the viewed day, oldest first. */
  entries: LogEntry[];

  setDateKey: (dateKey: string) => void;
  /** Entries grouped by day for an inclusive dateKey range (for History). */
  getEntriesInRange: (
    fromKey: string,
    toKey: string,
  ) => Promise<Record<string, LogEntry[]>>;
  logFood: (item: Loggable, servings: number) => Promise<LogEntry>;
  deleteEntry: (entryId: string) => Promise<void>;
  saveFood: (food: FoodItem) => Promise<void>;
  deleteFood: (foodId: string) => Promise<void>;
  saveMeal: (meal: Meal) => Promise<void>;
  deleteMeal: (mealId: string) => Promise<void>;
  saveTargets: (targets: Targets) => Promise<void>;
  exportAll: () => Promise<ExportedData>;
  importAll: (data: ExportedData) => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({
  store,
  children,
}: {
  store: DataStore;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [targets, setTargets] = useState<Targets>(DEFAULT_TARGETS);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [dateKey, setDateKey] = useState(todayKey());
  const [entries, setEntries] = useState<LogEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [t, f, m, u] = await Promise.all([
        store.getTargets(),
        store.getFoods(),
        store.getMeals(),
        store.getUsageCounts(),
      ]);
      if (cancelled) return;
      setTargets(t);
      setFoods(f);
      setMeals(m);
      setUsage(u);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [store]);

  useEffect(() => {
    let cancelled = false;
    store.getEntries(dateKey).then((list) => {
      if (!cancelled) setEntries(list);
    });
    return () => {
      cancelled = true;
    };
  }, [store, dateKey]);

  const getEntriesInRange = useCallback(
    (fromKey: string, toKey: string) => store.getEntriesInRange(fromKey, toKey),
    [store],
  );

  const logFood = useCallback(
    async (item: Loggable, servings: number) => {
      const entry: LogEntry = {
        id: newId(),
        dateKey,
        foodId: item.id,
        foodName: item.name,
        emoji: item.emoji,
        servings,
        perServing: {
          kcal: item.kcal,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
        },
        loggedAt: Date.now(),
      };
      await store.addEntry(entry);
      setEntries((prev) => [...prev, entry]);
      setUsage(await store.getUsageCounts());
      return entry;
    },
    [store, dateKey],
  );

  const deleteEntry = useCallback(
    async (entryId: string) => {
      await store.deleteEntry(entryId);
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      setUsage(await store.getUsageCounts());
    },
    [store],
  );

  const saveFood = useCallback(
    async (food: FoodItem) => {
      await store.saveFood(food);
      setFoods(await store.getFoods());
    },
    [store],
  );

  const deleteFood = useCallback(
    async (foodId: string) => {
      await store.deleteFood(foodId);
      setFoods(await store.getFoods());
    },
    [store],
  );

  const saveMeal = useCallback(
    async (meal: Meal) => {
      await store.saveMeal(meal);
      setMeals(await store.getMeals());
    },
    [store],
  );

  const deleteMeal = useCallback(
    async (mealId: string) => {
      await store.deleteMeal(mealId);
      setMeals(await store.getMeals());
    },
    [store],
  );

  const saveTargets = useCallback(
    async (t: Targets) => {
      await store.setTargets(t);
      setTargets(t);
    },
    [store],
  );

  const exportAll = useCallback(() => store.exportAll(), [store]);

  const importAll = useCallback(
    async (data: ExportedData) => {
      await store.importAll(data);
      const [t, f, m, u, e] = await Promise.all([
        store.getTargets(),
        store.getFoods(),
        store.getMeals(),
        store.getUsageCounts(),
        store.getEntries(dateKey),
      ]);
      setTargets(t);
      setFoods(f);
      setMeals(m);
      setUsage(u);
      setEntries(e);
    },
    [store, dateKey],
  );

  const value = useMemo<AppState>(
    () => ({
      ready,
      targets,
      foods,
      meals,
      usage,
      dateKey,
      entries,
      setDateKey,
      getEntriesInRange,
      logFood,
      deleteEntry,
      saveFood,
      deleteFood,
      saveMeal,
      deleteMeal,
      saveTargets,
      exportAll,
      importAll,
    }),
    [
      ready,
      targets,
      foods,
      meals,
      usage,
      dateKey,
      entries,
      getEntriesInRange,
      logFood,
      deleteEntry,
      saveFood,
      deleteFood,
      saveMeal,
      deleteMeal,
      saveTargets,
      exportAll,
      importAll,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}
