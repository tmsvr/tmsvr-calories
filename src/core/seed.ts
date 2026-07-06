import type { FoodItem } from "./types";

export type SeedFood = Omit<FoodItem, "id" | "sortOrder"> & {
  /** Former names of this seed, so renames don't re-offer it to old installs. */
  aliases?: string[];
};

/**
 * Built-in starter foods. Stores offer each seed exactly ONCE per install
 * (tracked by a name ledger), so foods added to these lists reach existing
 * installs on their next launch, while seeds the user deleted or renamed
 * are never resurrected. Just append new items — no versioning needed.
 */

const V1_FOODS: SeedFood[] = [
  { name: "Chicken breast", emoji: "🍗", servingLabel: "100g", kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: "Whey scoop", emoji: "🥤", servingLabel: "1 scoop", kcal: 120, protein: 24, carbs: 3, fat: 1.5 },
  { name: "Boiled egg", aliases: ["Egg"], emoji: "🥚", servingLabel: "1 large", kcal: 72, protein: 6.3, carbs: 0.4, fat: 4.8 },
  { name: "Rice (cooked)", emoji: "🍚", servingLabel: "100g", kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { name: "Oats (dry)", emoji: "🌾", servingLabel: "50g", kcal: 190, protein: 6.5, carbs: 33, fat: 3.5 },
  { name: "Banana", emoji: "🍌", servingLabel: "1 medium", kcal: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  { name: "Olive oil", emoji: "🫒", servingLabel: "1 tbsp", kcal: 119, protein: 0, carbs: 0, fat: 13.5 },
  { name: "Greek yogurt", emoji: "🥛", servingLabel: "170g", kcal: 100, protein: 17, carbs: 6, fat: 0.7 },
];

const V2_FOODS: SeedFood[] = [
  { name: "Potato (boiled)", emoji: "🥔", servingLabel: "100g", kcal: 87, protein: 1.9, carbs: 20, fat: 0.1 },
  { name: "Ham", emoji: "🍖", servingLabel: "50g", kcal: 54, protein: 9, carbs: 1, fat: 1.5 },
  { name: "Baguette", emoji: "🥖", servingLabel: "50g", kcal: 136, protein: 4.5, carbs: 26, fat: 1 },
  { name: "Cheese", emoji: "🧀", servingLabel: "30g slice", kcal: 110, protein: 7.5, carbs: 0.5, fat: 8.5 },
  { name: "Cereal", emoji: "🥣", servingLabel: "40g", kcal: 150, protein: 3, carbs: 32, fat: 1.5 },
];

const V3_FOODS: SeedFood[] = [
  { name: "Apple", emoji: "🍎", servingLabel: "1 medium", kcal: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  { name: "Orange", emoji: "🍊", servingLabel: "1 medium", kcal: 62, protein: 1.2, carbs: 15, fat: 0.2 },
  { name: "Canned tuna (in water)", emoji: "🥫", servingLabel: "1 can (100g)", kcal: 116, protein: 26, carbs: 0, fat: 1 },
  { name: "Salmon", emoji: "🐟", servingLabel: "100g", kcal: 208, protein: 20, carbs: 0, fat: 13 },
  { name: "Beef (lean, cooked)", emoji: "🥩", servingLabel: "100g", kcal: 185, protein: 26, carbs: 0, fat: 9 },
  { name: "Pork chop", emoji: "🍖", servingLabel: "100g", kcal: 231, protein: 25, carbs: 0, fat: 14 },
  { name: "Pasta (cooked)", emoji: "🍝", servingLabel: "100g", kcal: 158, protein: 5.8, carbs: 31, fat: 0.9 },
  { name: "Bread (white)", emoji: "🍞", servingLabel: "1 slice", kcal: 66, protein: 2, carbs: 12, fat: 0.8 },
  { name: "Tortilla wrap", emoji: "🌯", servingLabel: "1 large", kcal: 180, protein: 5, carbs: 30, fat: 4.5 },
  { name: "Sweet potato (boiled)", emoji: "🍠", servingLabel: "100g", kcal: 86, protein: 1.6, carbs: 20, fat: 0.1 },
  { name: "Butter", emoji: "🧈", servingLabel: "10g", kcal: 72, protein: 0.1, carbs: 0, fat: 8.1 },
  { name: "Peanut butter", emoji: "🥜", servingLabel: "1 tbsp", kcal: 94, protein: 4, carbs: 3, fat: 8 },
  { name: "Almonds", emoji: "🌰", servingLabel: "30g", kcal: 174, protein: 6.4, carbs: 6.5, fat: 15 },
  { name: "Avocado", emoji: "🥑", servingLabel: "½ medium", kcal: 160, protein: 2, carbs: 9, fat: 15 },
  { name: "Milk (whole)", emoji: "🥛", servingLabel: "250ml", kcal: 152, protein: 8, carbs: 12, fat: 8 },
  { name: "Cottage cheese", emoji: "🫙", servingLabel: "100g", kcal: 98, protein: 11, carbs: 3.4, fat: 4.3 },
  { name: "Honey", emoji: "🍯", servingLabel: "1 tbsp", kcal: 64, protein: 0, carbs: 17, fat: 0 },
  { name: "Broccoli", emoji: "🥦", servingLabel: "100g", kcal: 34, protein: 2.8, carbs: 7, fat: 0.4 },
  { name: "Dark chocolate", emoji: "🍫", servingLabel: "20g", kcal: 120, protein: 1.5, carbs: 9, fat: 8.5 },
  { name: "Protein bar", emoji: "🍬", servingLabel: "1 bar", kcal: 200, protein: 20, carbs: 20, fat: 7 },
];

/** Every built-in seed food, in default display order. */
export function allSeeds(): SeedFood[] {
  return [...V1_FOODS, ...V2_FOODS, ...V3_FOODS];
}
