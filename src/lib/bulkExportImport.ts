import { readJson, writeJson } from "./storage";
import type { Meal, TagDefinition, MasterIngredient, CategoryItem } from "../types/meals";
import type { WeekPlan, Deal } from "../types/planner";

export interface BulkData {
  version: "1.0";
  exportedAt: string;
  meals: Meal[];
  currentWeek: WeekPlan | null;
  deals: Deal[];
  mealHistory: string[];
  tags: TagDefinition[];
  ingredients: MasterIngredient[];
  categoryItems: CategoryItem[];
}

export async function exportAllData(): Promise<BulkData> {
  const meals = (await readJson<Meal[]>("meals.json")) || [];
  const currentWeek = await readJson<WeekPlan>("current-week.json");
  const deals = (await readJson<Deal[]>("deals.json")) || [];
  const mealHistory = (await readJson<string[]>("meal-history.json")) || [];
  const tags = (await readJson<TagDefinition[]>("tags.json")) || [];
  const ingredients = (await readJson<MasterIngredient[]>("ingredients.json")) || [];
  const categoryItems = (await readJson<CategoryItem[]>("category-items.json")) || [];

  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    meals,
    currentWeek,
    deals,
    mealHistory,
    tags,
    ingredients,
    categoryItems,
  };
}

export async function importAllData(
  data: BulkData,
  mode: "replace" | "merge"
): Promise<{ mealsCount: number }> {
  const safeMealHistory = data.mealHistory || [];
  const safeDeals = data.deals || [];

  if (mode === "replace") {
    await writeJson("meals.json", data.meals);
    if (data.currentWeek) await writeJson("current-week.json", data.currentWeek);
    await writeJson("deals.json", safeDeals);
    await writeJson("meal-history.json", safeMealHistory);
    if (data.tags) await writeJson("tags.json", data.tags);
    if (data.ingredients) await writeJson("ingredients.json", data.ingredients);
    if (data.categoryItems) await writeJson("category-items.json", data.categoryItems);
    return { mealsCount: data.meals.length };
  }

  // Merge mode
  const existingMeals = (await readJson<Meal[]>("meals.json")) || [];
  const existingNames = new Set(existingMeals.map((m) => m.name.toLowerCase()));
  const newMeals = data.meals.filter((m) => !existingNames.has(m.name.toLowerCase()));
  await writeJson("meals.json", [...existingMeals, ...newMeals]);

  // Merge ingredients
  if (data.ingredients) {
    const existing = (await readJson<MasterIngredient[]>("ingredients.json")) || [];
    const existingIngNames = new Set(existing.map((i) => i.name.toLowerCase()));
    const newIngs = data.ingredients.filter((i) => !existingIngNames.has(i.name.toLowerCase()));
    await writeJson("ingredients.json", [...existing, ...newIngs]);
  }

  // Merge tags
  if (data.tags) {
    const existing = (await readJson<TagDefinition[]>("tags.json")) || [];
    const existingIds = new Set(existing.map((t) => t.id));
    const newTags = data.tags.filter((t) => !existingIds.has(t.id));
    await writeJson("tags.json", [...existing, ...newTags]);
  }

  // Merge category items
  if (data.categoryItems) {
    const existing = (await readJson<CategoryItem[]>("category-items.json")) || [];
    const existingIds = new Set(existing.map((i) => i.id));
    const newItems = data.categoryItems.filter((i) => !existingIds.has(i.id));
    await writeJson("category-items.json", [...existing, ...newItems]);
  }

  const existingHistory = (await readJson<string[]>("meal-history.json")) || [];
  const mergedHistory = [...new Set([...safeMealHistory, ...existingHistory])].slice(0, 42);
  await writeJson("meal-history.json", mergedHistory);

  return { mealsCount: newMeals.length };
}

export function validateBulkData(data: unknown): data is BulkData {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return obj.version === "1.0" && Array.isArray(obj.meals);
}
