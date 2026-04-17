import type { MasterIngredient } from "../types/meals";
import type { Deal } from "../types/planner";

export const TAG_MATCH_MAX = 100;
export const DEAL_BONUS_MAX = 60;
export const DEAL_BONUS_PER_STRENGTH = 20;

export const RECENCY_PENALTY_RECENT = 50; // index < 7
export const RECENCY_PENALTY_MID = 25; // index < 14
export const RECENCY_PENALTY_FAR = 10; // index < 21

export const VARIETY_PENALTY = 40;

export function recencyPenalty(recentIdx: number): number {
  if (recentIdx < 0) return 0;
  if (recentIdx < 7) return RECENCY_PENALTY_RECENT;
  if (recentIdx < 14) return RECENCY_PENALTY_MID;
  if (recentIdx < 21) return RECENCY_PENALTY_FAR;
  return 0;
}

/**
 * Bonus from active deals based on whether the candidate's ingredients
 * overlap deal ingredient names. Capped at DEAL_BONUS_MAX.
 */
export function dealBonusForIngredients(
  ingredientIds: string[],
  deals: Deal[],
  masterMap: Map<string, MasterIngredient>
): number {
  let bonus = 0;
  for (const deal of deals) {
    const dealName = deal.ingredientName.toLowerCase();
    const has = ingredientIds.some((id) => {
      const master = masterMap.get(id);
      if (!master) return false;
      const ingName = master.name.toLowerCase();
      return ingName.includes(dealName) || dealName.includes(ingName);
    });
    if (has) bonus += DEAL_BONUS_PER_STRENGTH * deal.biasStrength;
  }
  return Math.min(bonus, DEAL_BONUS_MAX);
}
