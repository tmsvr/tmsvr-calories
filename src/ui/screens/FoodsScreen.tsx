import { useState } from "react";
import { useAppState } from "../appState";
import type { FoodItem, Meal } from "../../core/types";
import { newId } from "../../core/id";
import { fmt, mealMacros } from "../../core/calc";
import { MealForm } from "../components/MealForm";

interface Draft {
  id: string | null; // null = new food
  name: string;
  emoji: string;
  servingLabel: string;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
}

const EMPTY_DRAFT: Draft = {
  id: null,
  name: "",
  emoji: "",
  servingLabel: "",
  kcal: "",
  protein: "",
  carbs: "",
  fat: "",
};

function toDraft(f: FoodItem): Draft {
  return {
    id: f.id,
    name: f.name,
    emoji: f.emoji ?? "",
    servingLabel: f.servingLabel ?? "",
    kcal: String(f.kcal),
    protein: String(f.protein),
    carbs: String(f.carbs),
    fat: String(f.fat),
  };
}

function num(s: string): number {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function FoodsScreen() {
  const { foods, saveFood, deleteFood, meals, saveMeal, deleteMeal } =
    useAppState();
  const [draft, setDraft] = useState<Draft | null>(null);
  // null = closed; "new" = creating; Meal = editing
  const [mealDraft, setMealDraft] = useState<Meal | "new" | null>(null);

  const set = (patch: Partial<Draft>) =>
    setDraft((d) => (d ? { ...d, ...patch } : d));

  const submit = async () => {
    if (!draft || !draft.name.trim()) return;
    const existing = draft.id ? foods.find((f) => f.id === draft.id) : null;
    await saveFood({
      id: draft.id ?? newId(),
      name: draft.name.trim(),
      emoji: draft.emoji.trim() || undefined,
      servingLabel: draft.servingLabel.trim() || undefined,
      kcal: num(draft.kcal),
      protein: num(draft.protein),
      carbs: num(draft.carbs),
      fat: num(draft.fat),
      sortOrder:
        existing?.sortOrder ??
        (foods.length ? Math.max(...foods.map((f) => f.sortOrder)) + 1 : 0),
    });
    setDraft(null);
  };

  const move = async (food: FoodItem, dir: -1 | 1) => {
    const idx = foods.findIndex((f) => f.id === food.id);
    const swapWith = foods[idx + dir];
    if (!swapWith) return;
    await saveFood({ ...food, sortOrder: swapWith.sortOrder });
    await saveFood({ ...swapWith, sortOrder: food.sortOrder });
  };

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Meals</h1>
        <button
          className="btn-primary"
          onClick={() => setMealDraft("new")}
          disabled={foods.length === 0}
        >
          + Add meal
        </button>
      </header>

      {meals.length === 0 && (
        <p className="empty-hint">
          Combine base foods into one-tap meals — e.g. a sandwich.
        </p>
      )}

      <ul className="food-list">
        {meals.map((m) => {
          const total = mealMacros(m, foods);
          return (
            <li key={m.id} className="food-row">
              <span className="log-emoji">{m.emoji || "🍱"}</span>
              <button className="food-row-main" onClick={() => setMealDraft(m)}>
                <span className="log-name">{m.name}</span>
                <span className="log-macros">
                  {m.components.length} ingredients · {fmt(total.kcal)} kcal ·
                  P {fmt(total.protein)} · C {fmt(total.carbs)} · F{" "}
                  {fmt(total.fat)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <header className="screen-header">
        <h1>Foods</h1>
        <button className="btn-primary" onClick={() => setDraft(EMPTY_DRAFT)}>
          + Add food
        </button>
      </header>

      {foods.length === 0 && (
        <p className="empty-hint">
          Your quick-add library is empty. Add the foods you eat most.
        </p>
      )}

      <ul className="food-list">
        {foods.map((f, i) => (
          <li key={f.id} className="food-row">
            <span className="log-emoji">{f.emoji || "🍽️"}</span>
            <button className="food-row-main" onClick={() => setDraft(toDraft(f))}>
              <span className="log-name">{f.name}</span>
              <span className="log-macros">
                {f.servingLabel ? `${f.servingLabel} · ` : ""}
                {fmt(f.kcal)} kcal · P {fmt(f.protein)} · C {fmt(f.carbs)} · F{" "}
                {fmt(f.fat)}
              </span>
            </button>
            <span className="food-row-actions">
              <button
                className="icon-btn"
                aria-label={`Move ${f.name} up`}
                disabled={i === 0}
                onClick={() => move(f, -1)}
              >
                ↑
              </button>
              <button
                className="icon-btn"
                aria-label={`Move ${f.name} down`}
                disabled={i === foods.length - 1}
                onClick={() => move(f, 1)}
              >
                ↓
              </button>
            </span>
          </li>
        ))}
      </ul>

      {mealDraft && (
        <MealForm
          meal={mealDraft === "new" ? null : mealDraft}
          foods={foods}
          nextSortOrder={
            meals.length ? Math.max(...meals.map((m) => m.sortOrder)) + 1 : 0
          }
          onSave={saveMeal}
          onDelete={deleteMeal}
          onClose={() => setMealDraft(null)}
        />
      )}

      {draft && (
        <div className="modal-backdrop" onClick={() => setDraft(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{draft.id ? "Edit food" : "New food"}</h2>
            <label className="field">
              <span>Name</span>
              <input
                autoFocus={!draft.id}
                value={draft.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Chicken breast"
              />
            </label>
            <div className="field-row">
              <label className="field">
                <span>Emoji</span>
                <input
                  value={draft.emoji}
                  onChange={(e) => set({ emoji: e.target.value })}
                  placeholder="🍗"
                />
              </label>
              <label className="field">
                <span>Serving</span>
                <input
                  value={draft.servingLabel}
                  onChange={(e) => set({ servingLabel: e.target.value })}
                  placeholder="100g"
                />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>kcal</span>
                <input
                  inputMode="decimal"
                  value={draft.kcal}
                  onChange={(e) => set({ kcal: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Protein g</span>
                <input
                  inputMode="decimal"
                  value={draft.protein}
                  onChange={(e) => set({ protein: e.target.value })}
                />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>Carbs g</span>
                <input
                  inputMode="decimal"
                  value={draft.carbs}
                  onChange={(e) => set({ carbs: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Fat g</span>
                <input
                  inputMode="decimal"
                  value={draft.fat}
                  onChange={(e) => set({ fat: e.target.value })}
                />
              </label>
            </div>
            <div className="modal-actions">
              {draft.id && (
                <button
                  className="btn-danger"
                  onClick={async () => {
                    const usedBy = meals.filter((m) =>
                      m.components.some((c) => c.foodId === draft.id),
                    );
                    const warning = usedBy.length
                      ? ` It is an ingredient of ${usedBy
                          .map((m) => m.name)
                          .join(", ")} — those meals will lose it.`
                      : "";
                    if (
                      confirm(
                        `Delete ${draft.name}? Logged history is kept.${warning}`,
                      )
                    ) {
                      await deleteFood(draft.id!);
                      setDraft(null);
                    }
                  }}
                >
                  Delete
                </button>
              )}
              <span className="spacer" />
              <button className="btn-ghost" onClick={() => setDraft(null)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                disabled={!draft.name.trim()}
                onClick={submit}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
