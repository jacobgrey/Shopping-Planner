import type { Meal, MasterIngredient } from "../types/meals";
import type { DayPlan, Deal } from "../types/planner";
import {
  TAG_MATCH_MAX,
  VARIETY_PENALTY,
  dealBonusForIngredients,
  recencyPenalty,
} from "./selectorScoring";

interface ScoredMeal {
  meal: Meal;
  score: number;
}

/**
 * Auto-select meals for unlocked days based on tag matching, deals, and recency.
 */
export function selectMealsForWeek(
  allMeals: Meal[],
  days: DayPlan[],
  deals: Deal[],
  recentlyUsedIds: string[],
  masterIngredients?: MasterIngredient[]
): Map<number, string> {
  if (allMeals.length === 0) return new Map();

  const masterMap = new Map<string, MasterIngredient>();
  if (masterIngredients) {
    for (const mi of masterIngredients) masterMap.set(mi.id, mi);
  }

  const assignments = new Map<number, string>();
  const usedThisWeek = new Set<string>();
  for (const day of days) {
    if (day.locked && day.assignedMealId) usedThisWeek.add(day.assignedMealId);
  }

  const unlockedDays = days
    .filter((d) => !d.locked)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  for (const day of unlockedDays) {
    const scored = scoreMeals(allMeals, day, deals, recentlyUsedIds, usedThisWeek, masterMap);
    if (scored.length > 0) {
      const maxScore = scored[0].score;
      const ties = scored.filter((s) => s.score === maxScore);
      const pick = ties[Math.floor(Math.random() * ties.length)];
      assignments.set(day.dayOfWeek, pick.meal.id);
      usedThisWeek.add(pick.meal.id);
    }
  }

  return assignments;
}

export function regenerateDay(
  allMeals: Meal[],
  day: DayPlan,
  days: DayPlan[],
  deals: Deal[],
  recentlyUsedIds: string[],
  masterIngredients?: MasterIngredient[]
): string | null {
  if (allMeals.length === 0) return null;

  const masterMap = new Map<string, MasterIngredient>();
  if (masterIngredients) {
    for (const mi of masterIngredients) masterMap.set(mi.id, mi);
  }

  const usedThisWeek = new Set<string>();
  for (const d of days) {
    if (d.assignedMealId && d.dayOfWeek !== day.dayOfWeek) usedThisWeek.add(d.assignedMealId);
  }
  if (day.assignedMealId) usedThisWeek.add(day.assignedMealId);

  const scored = scoreMeals(allMeals, day, deals, recentlyUsedIds, usedThisWeek, masterMap);
  if (scored.length === 0) {
    const fallback = allMeals.filter((m) => m.id !== day.assignedMealId);
    if (fallback.length === 0) return null;
    return fallback[Math.floor(Math.random() * fallback.length)].id;
  }

  const maxScore = scored[0].score;
  const ties = scored.filter((s) => s.score === maxScore);
  return ties[Math.floor(Math.random() * ties.length)].meal.id;
}

function scoreMeals(
  allMeals: Meal[],
  day: DayPlan,
  deals: Deal[],
  recentlyUsedIds: string[],
  usedThisWeek: Set<string>,
  masterMap: Map<string, MasterIngredient>
): ScoredMeal[] {
  const scored: ScoredMeal[] = [];

  for (const meal of allMeals) {
    let score = 0;

    if (day.tags.length > 0) {
      const matching = day.tags.filter((t) => meal.tags.includes(t)).length;
      score += (matching / day.tags.length) * TAG_MATCH_MAX;
      if (matching === 0) continue;
    } else {
      score += TAG_MATCH_MAX;
    }

    score += dealBonusForIngredients(
      meal.ingredients.map((e) => e.ingredientId),
      deals,
      masterMap,
    );

    score -= recencyPenalty(recentlyUsedIds.indexOf(meal.id));

    if (usedThisWeek.has(meal.id)) score -= VARIETY_PENALTY;

    scored.push({ meal, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored;
}
