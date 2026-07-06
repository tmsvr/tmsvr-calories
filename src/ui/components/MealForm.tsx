import { useMemo, useState } from "react";
import type { FoodItem, Meal, MealComponent } from "../../core/types";
import { fmt, mealMacros } from "../../core/calc";
import { newId } from "../../core/id";

interface DraftComponent {
  foodId: string;
  servings: string; // free text while editing
}

function num(s: string): number {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function MealForm({
  meal,
  foods,
  nextSortOrder,
  onSave,
  onDelete,
  onClose,
}: {
  meal: Meal | null; // null = new meal
  foods: FoodItem[];
  nextSortOrder: number;
  onSave: (meal: Meal) => Promise<void>;
  onDelete: (mealId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(meal?.name ?? "");
  const [emoji, setEmoji] = useState(meal?.emoji ?? "");
  const [components, setComponents] = useState<DraftComponent[]>(
    meal?.components.map((c) => ({
      foodId: c.foodId,
      servings: String(c.servings),
    })) ?? [],
  );

  const foodById = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);

  const validComponents: MealComponent[] = components
    .filter((c) => foodById.has(c.foodId) && num(c.servings) > 0)
    .map((c) => ({ foodId: c.foodId, servings: num(c.servings) }));

  const total = mealMacros(
    { id: "", name: "", components: validComponents, sortOrder: 0 },
    foods,
  );

  const missingCount = meal
    ? meal.components.filter((c) => !foodById.has(c.foodId)).length
    : 0;

  const addComponent = () => {
    if (foods.length === 0) return;
    setComponents((prev) => [...prev, { foodId: foods[0].id, servings: "1" }]);
  };

  const patch = (i: number, p: Partial<DraftComponent>) =>
    setComponents((prev) =>
      prev.map((c, ci) => (ci === i ? { ...c, ...p } : c)),
    );

  const submit = async () => {
    if (!name.trim() || validComponents.length === 0) return;
    await onSave({
      id: meal?.id ?? newId(),
      name: name.trim(),
      emoji: emoji.trim() || undefined,
      components: validComponents,
      sortOrder: meal?.sortOrder ?? nextSortOrder,
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{meal ? "Edit meal" : "New meal"}</h2>

        <div className="field-row">
          <label className="field" style={{ flex: 3 }}>
            <span>Name</span>
            <input
              autoFocus={!meal}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ham sandwich"
            />
          </label>
          <label className="field" style={{ flex: 1 }}>
            <span>Emoji</span>
            <input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              placeholder="🥪"
            />
          </label>
        </div>

        <h3 className="section-title">Ingredients</h3>
        {missingCount > 0 && (
          <p className="hint">
            {missingCount} ingredient{missingCount > 1 ? "s" : ""} referenced a
            deleted food and {missingCount > 1 ? "were" : "was"} removed.
          </p>
        )}
        {components.length === 0 && (
          <p className="empty-hint">No ingredients yet.</p>
        )}
        {components.map((c, i) => {
          const food = foodById.get(c.foodId);
          return (
            <div key={i} className="ingredient-row">
              <select
                className="ingredient-select"
                value={c.foodId}
                onChange={(e) => patch(i, { foodId: e.target.value })}
              >
                {foods.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.emoji ? `${f.emoji} ` : ""}
                    {f.name}
                    {f.servingLabel ? ` (${f.servingLabel})` : ""}
                  </option>
                ))}
              </select>
              <input
                className="ingredient-servings"
                inputMode="decimal"
                value={c.servings}
                onChange={(e) => patch(i, { servings: e.target.value })}
                aria-label={`Servings of ${food?.name ?? "ingredient"}`}
              />
              <button
                className="icon-btn"
                aria-label="Remove ingredient"
                onClick={() =>
                  setComponents((prev) => prev.filter((_, ci) => ci !== i))
                }
              >
                ✕
              </button>
            </div>
          );
        })}
        <button className="btn-ghost" onClick={addComponent}>
          + Add ingredient
        </button>

        <p className="meal-total">
          1 serving = <strong>{fmt(total.kcal)} kcal</strong> · P{" "}
          {fmt(total.protein)} · C {fmt(total.carbs)} · F {fmt(total.fat)}
        </p>

        <div className="modal-actions">
          {meal && (
            <button
              className="btn-danger"
              onClick={async () => {
                if (confirm(`Delete ${meal.name}? Logged history is kept.`)) {
                  await onDelete(meal.id);
                  onClose();
                }
              }}
            >
              Delete
            </button>
          )}
          <span className="spacer" />
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={!name.trim() || validComponents.length === 0}
            onClick={submit}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
