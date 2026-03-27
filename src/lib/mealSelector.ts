import type { Meal } from "../types/meals";
import type { DayPlan, Deal } from "../types/planner";

interface ScoredMeal {
  meal: Meal;
  score: number;
}

/**
 * Auto-select meals for unlocked days based on tag matching, deals, and recency.
 * Returns a map of dayOfWeek -> mealId.
 */
export function selectMealsForWeek(
  allMeals: Meal[],
  days: DayPlan[],
  deals: Deal[],
  recentlyUsedIds: string[]
): Map<number, string> {
  if (allMeals.length === 0) return new Map();

  const assignments = new Map<number, string>();

  // Collect already-locked meal IDs to avoid duplicates
  const usedThisWeek = new Set<string>();
  for (const day of days) {
    if (day.locked && day.assignedMealId) {
      usedThisWeek.add(day.assignedMealId);
    }
  }

  // Process unlocked days in order (Monday=0 to Sunday=6)
  const unlockedDays = days
    .filter((d) => !d.locked)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  for (const day of unlockedDays) {
    const scored = scoreMeals(allMeals, day, deals, recentlyUsedIds, usedThisWeek);
    if (scored.length > 0) {
      // Pick highest score, random tiebreak
      const maxScore = scored[0].score;
      const ties = scored.filter((s) => s.score === maxScore);
      const pick = ties[Math.floor(Math.random() * ties.length)];
      assignments.set(day.dayOfWeek, pick.meal.id);
      usedThisWeek.add(pick.meal.id);
    }
  }

  return assignments;
}

/**
 * Regenerate a single day, excluding the currently assigned meal.
 */
export function regenerateDay(
  allMeals: Meal[],
  day: DayPlan,
  days: DayPlan[],
  deals: Deal[],
  recentlyUsedIds: string[]
): string | null {
  if (allMeals.length === 0) return null;

  const usedThisWeek = new Set<string>();
  for (const d of days) {
    if (d.assignedMealId && d.dayOfWeek !== day.dayOfWeek) {
      usedThisWeek.add(d.assignedMealId);
    }
  }
  // Exclude current meal so user always gets something different
  if (day.assignedMealId) {
    usedThisWeek.add(day.assignedMealId);
  }

  const scored = scoreMeals(allMeals, day, deals, recentlyUsedIds, usedThisWeek);
  if (scored.length === 0) {
    // Fallback: allow any meal except the current one
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
  usedThisWeek: Set<string>
): ScoredMeal[] {
  const scored: ScoredMeal[] = [];

  for (const meal of allMeals) {
    let score = 0;

    // Tag match (0-100)
    if (day.tags.length > 0) {
      const matching = day.tags.filter((t) => meal.tags.includes(t)).length;
      score += (matching / day.tags.length) * 100;
      // Skip meals with zero tag overlap if tags are specified
      if (matching === 0) continue;
    } else {
      score += 100; // No preference = all meals equally valid
    }

    // Deal bonus (0-30, capped)
    let dealBonus = 0;
    for (const deal of deals) {
      const dealName = deal.ingredientName.toLowerCase();
      const hasIngredient = meal.ingredients.some(
        (ing) => ing.name.toLowerCase().includes(dealName) || dealName.includes(ing.name.toLowerCase())
      );
      if (hasIngredient) {
        dealBonus += 10 * deal.biasStrength;
      }
    }
    score += Math.min(dealBonus, 30);

    // Recency penalty
    const recentIdx = recentlyUsedIds.indexOf(meal.id);
    if (recentIdx >= 0) {
      if (recentIdx < 7) score -= 50;       // Used in last week
      else if (recentIdx < 14) score -= 25;  // Two weeks ago
      else if (recentIdx < 21) score -= 10;  // Three weeks ago
    }

    // Variety penalty: already assigned this week
    if (usedThisWeek.has(meal.id)) {
      score -= 40;
    }

    scored.push({ meal, score });
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);
  return scored;
}
