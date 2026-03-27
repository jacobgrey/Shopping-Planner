import type { Meal, StoreCategory } from "../types/meals";
import type { WeekPlan } from "../types/planner";
import type { ShoppingItem } from "../types/shopping";
import { ALL_CATEGORY_ITEMS } from "../data/breakfast-lunch-snacks";

/**
 * Aggregate all ingredients from planned dinners + category selections
 * into a deduplicated shopping list.
 */
export function aggregateShoppingList(
  plan: WeekPlan,
  meals: Meal[]
): ShoppingItem[] {
  const itemMap = new Map<string, ShoppingItem>();

  // Helper to merge an ingredient into the map
  function addItem(
    name: string,
    category: StoreCategory,
    quantity: number | undefined,
    unit: string | undefined,
    price: number | undefined,
    fromMeal: string
  ) {
    const key = name.toLowerCase().trim();
    const existing = itemMap.get(key);
    if (existing) {
      if (!existing.fromMeals.includes(fromMeal)) {
        existing.fromMeals.push(fromMeal);
      }
      // Combine quantities if both have the same unit
      if (
        quantity !== undefined &&
        existing.totalQuantity !== undefined &&
        existing.unit === unit
      ) {
        existing.totalQuantity += quantity;
      } else if (quantity !== undefined && existing.totalQuantity === undefined) {
        existing.totalQuantity = quantity;
        existing.unit = unit;
      }
      // Sum prices
      if (price !== undefined) {
        existing.estimatedCost = (existing.estimatedCost || 0) + price;
      }
    } else {
      itemMap.set(key, {
        ingredientName: name.trim(),
        totalQuantity: quantity,
        unit,
        category,
        fromMeals: [fromMeal],
        estimatedCost: price,
        checked: false,
      });
    }
  }

  // Add dinner ingredients
  for (const day of plan.days) {
    if (!day.assignedMealId) continue;
    const meal = meals.find((m) => m.id === day.assignedMealId);
    if (!meal) continue;
    for (const ing of meal.ingredients) {
      addItem(
        ing.name,
        ing.category,
        ing.quantity,
        ing.unit,
        ing.priceEstimate,
        meal.name
      );
    }
  }

  // Add breakfast/lunch/snack category items
  const allSelections = [
    ...plan.breakfastSelections,
    ...plan.lunchSelections,
    ...plan.snackSelections,
  ];
  for (const itemId of allSelections) {
    const catItem = ALL_CATEGORY_ITEMS.find((ci) => ci.id === itemId);
    if (catItem) {
      addItem(
        catItem.name,
        catItem.category,
        undefined,
        undefined,
        undefined,
        itemId.startsWith("b-")
          ? "Breakfast"
          : itemId.startsWith("l-")
            ? "Lunch"
            : "Snacks"
      );
    }
  }

  return Array.from(itemMap.values());
}
