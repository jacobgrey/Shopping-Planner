import { useState, useMemo, useCallback } from "react";
import type { Meal, MasterIngredient, CategoryItem } from "../types/meals";
import type { WeekPlan } from "../types/planner";
import type { ShoppingItem, ShoppingListSort } from "../types/shopping";
import { aggregateShoppingList } from "../lib/shoppingAggregator";
import { STORE_CATEGORY_ORDER } from "../data/store-categories";

export function useShoppingList(
  plan: WeekPlan | null,
  meals: Meal[],
  masterIngredients: MasterIngredient[],
  categoryItems: CategoryItem[]
) {
  const [uncheckedItems, setUncheckedItems] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<ShoppingListSort>("by-category");

  const items = useMemo<ShoppingItem[]>(() => {
    if (!plan) return [];
    const list = aggregateShoppingList(plan, meals, masterIngredients, categoryItems);
    return list.map((item) => ({
      ...item,
      checked: !uncheckedItems.has(item.ingredientName.toLowerCase()),
    }));
  }, [plan, meals, masterIngredients, categoryItems, uncheckedItems]);

  const sortedItems = useMemo(() => {
    const sorted = [...items];
    if (sortMode === "by-category") {
      sorted.sort((a, b) => {
        const aIdx = STORE_CATEGORY_ORDER.indexOf(a.category);
        const bIdx = STORE_CATEGORY_ORDER.indexOf(b.category);
        if (aIdx !== bIdx) return aIdx - bIdx;
        return a.ingredientName.localeCompare(b.ingredientName);
      });
    } else {
      sorted.sort((a, b) => {
        const aMeal = a.fromMeals[0] || "";
        const bMeal = b.fromMeals[0] || "";
        if (aMeal !== bMeal) return aMeal.localeCompare(bMeal);
        return a.ingredientName.localeCompare(b.ingredientName);
      });
    }
    return sorted;
  }, [items, sortMode]);

  const toggleItem = useCallback((ingredientName: string) => {
    const key = ingredientName.toLowerCase();
    setUncheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const checkAll = useCallback(() => setUncheckedItems(new Set()), []);

  const totalEstimatedCost = useMemo(() => {
    let total = 0;
    let hasAny = false;
    for (const item of items) {
      if (item.estimatedCost !== undefined) {
        total += item.estimatedCost;
        hasAny = true;
      }
    }
    return hasAny ? total : null;
  }, [items]);

  return { items: sortedItems, sortMode, setSortMode, toggleItem, checkAll, totalEstimatedCost };
}
