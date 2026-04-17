import type { Meal, MasterIngredient, Side } from "../types/meals";
import type { DayPlan, Deal } from "../types/planner";
import {
  VARIETY_PENALTY,
  dealBonusForIngredients,
} from "./selectorScoring";

interface ScoredSide {
  side: Side;
  score: number;
}

/**
 * Pick `count` top-scored sides for one day.
 * Candidate pool: meal.preferredSideIds if any, else full library.
 * Excludes any side IDs in `exclude`.
 *
 * Scoring: deal bonus + within-week variety penalty + random tiebreak.
 * Tag match is deferred until sides expose tags.
 * Recency penalty is intentionally OFF for sides — preferred pools are often
 * just 2-3 items, and a recency penalty drives them into a deterministic
 * cycle. Randomness (tiebreak) is the variety mechanism here.
 */
export function selectSidesForDay(
  _day: DayPlan,
  meal: Meal | undefined,
  allSides: Side[],
  deals: Deal[],
  count: number,
  masterIngredients?: MasterIngredient[],
  exclude: string[] = [],
  usedThisWeek?: Set<string>
): string[] {
  if (count <= 0 || allSides.length === 0) return [];

  const masterMap = new Map<string, MasterIngredient>();
  if (masterIngredients) {
    for (const mi of masterIngredients) masterMap.set(mi.id, mi);
  }

  const excludeSet = new Set(exclude);
  const usedSet = usedThisWeek ?? new Set<string>();

  // Candidate pool
  let pool: Side[];
  if (meal?.preferredSideIds && meal.preferredSideIds.length > 0) {
    const preferredSet = new Set(meal.preferredSideIds);
    pool = allSides.filter((s) => preferredSet.has(s.id));
    // Fall back to full library if all preferred are excluded
    if (pool.every((s) => excludeSet.has(s.id))) {
      pool = allSides;
    }
  } else {
    pool = allSides;
  }

  const scored: ScoredSide[] = [];
  for (const side of pool) {
    if (excludeSet.has(side.id)) continue;
    let score = 0;

    score += dealBonusForIngredients(
      side.ingredients.map((e) => e.ingredientId),
      deals,
      masterMap,
    );

    if (usedSet.has(side.id)) score -= VARIETY_PENALTY;

    scored.push({ side, score });
  }

  if (scored.length === 0) return [];

  // Pick `count` distinct, top-scoring sides. Random tiebreak among same-score groups.
  const picks: string[] = [];
  const chosen = new Set<string>();

  while (picks.length < count && scored.length > chosen.size) {
    const remaining = scored.filter((s) => !chosen.has(s.side.id));
    if (remaining.length === 0) break;
    remaining.sort((a, b) => b.score - a.score);
    const top = remaining[0].score;
    const ties = remaining.filter((s) => s.score === top);
    const pick = ties[Math.floor(Math.random() * ties.length)];
    picks.push(pick.side.id);
    chosen.add(pick.side.id);
  }

  return picks;
}

/**
 * Auto-select sides for every day, respecting day.sideSlotCount (default 1).
 * Locked days are skipped to preserve the user's manual choices.
 */
export function selectSidesForWeek(
  days: DayPlan[],
  allMeals: Meal[],
  allSides: Side[],
  deals: Deal[],
  masterIngredients?: MasterIngredient[]
): Map<number, string[]> {
  const assignments = new Map<number, string[]>();
  if (allSides.length === 0) return assignments;

  const usedThisWeek = new Set<string>();
  for (const d of days) {
    if (d.locked && d.assignedSideIds) {
      for (const id of d.assignedSideIds) usedThisWeek.add(id);
    }
  }

  const unlocked = days
    .filter((d) => !d.locked)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  for (const day of unlocked) {
    const meal = day.assignedMealId
      ? allMeals.find((m) => m.id === day.assignedMealId)
      : undefined;
    const count = day.sideSlotCount ?? 1;
    const picks = selectSidesForDay(
      day,
      meal,
      allSides,
      deals,
      count,
      masterIngredients,
      [],
      usedThisWeek,
    );
    assignments.set(day.dayOfWeek, picks);
    for (const id of picks) usedThisWeek.add(id);
  }

  return assignments;
}
