import { readJson, writeJson } from "./storage";
import type { Meal } from "../types/meals";
import type { WeekPlan, Deal } from "../types/planner";

export interface BulkData {
  version: "1.0";
  exportedAt: string;
  meals: Meal[];
  currentWeek: WeekPlan | null;
  deals: Deal[];
  mealHistory: string[];
}

export async function exportAllData(): Promise<BulkData> {
  const meals = (await readJson<Meal[]>("meals.json")) || [];
  const currentWeek = await readJson<WeekPlan>("current-week.json");
  const deals = (await readJson<Deal[]>("deals.json")) || [];
  const mealHistory = (await readJson<string[]>("meal-history.json")) || [];

  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    meals,
    currentWeek,
    deals,
    mealHistory,
  };
}

export async function importAllData(
  data: BulkData,
  mode: "replace" | "merge"
): Promise<{ mealsCount: number }> {
  if (mode === "replace") {
    await writeJson("meals.json", data.meals);
    if (data.currentWeek) {
      await writeJson("current-week.json", data.currentWeek);
    }
    await writeJson("deals.json", data.deals);
    await writeJson("meal-history.json", data.mealHistory);
    return { mealsCount: data.meals.length };
  }

  // Merge mode: add new meals, keep existing
  const existingMeals = (await readJson<Meal[]>("meals.json")) || [];
  const existingNames = new Set(
    existingMeals.map((m) => m.name.toLowerCase())
  );
  const newMeals = data.meals.filter(
    (m) => !existingNames.has(m.name.toLowerCase())
  );
  const merged = [...existingMeals, ...newMeals];
  await writeJson("meals.json", merged);

  // Merge history
  const existingHistory =
    (await readJson<string[]>("meal-history.json")) || [];
  const mergedHistory = [
    ...new Set([...data.mealHistory, ...existingHistory]),
  ].slice(0, 42);
  await writeJson("meal-history.json", mergedHistory);

  // Don't overwrite current week or deals in merge mode
  return { mealsCount: newMeals.length };
}

export function validateBulkData(data: unknown): data is BulkData {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.version === "1.0" &&
    Array.isArray(obj.meals)
  );
}
