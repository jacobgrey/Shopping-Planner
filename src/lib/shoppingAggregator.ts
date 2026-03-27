import type { Meal, MasterIngredient, StoreCategory, CategoryItem } from "../types/meals";
import type { WeekPlan } from "../types/planner";
import type { ShoppingItem } from "../types/shopping";

export function aggregateShoppingList(
  plan: WeekPlan,
  meals: Meal[],
  masterIngredients: MasterIngredient[],
  categoryItems: CategoryItem[]
): ShoppingItem[] {
  const itemMap = new Map<string, ShoppingItem>();
  const masterMap = new Map<string, MasterIngredient>();
  for (const mi of masterIngredients) {
    masterMap.set(mi.id, mi);
  }

  function addItem(
    name: string,
    category: StoreCategory,
    quantity: number | undefined,
    unit: string | undefined,
    pricePerUnit: number | undefined,
    fromMeal: string,
    isMeal: boolean
  ) {
    const key = name.toLowerCase().trim();
    const existing = itemMap.get(key);
    if (existing) {
      if (!existing.fromMeals.includes(fromMeal)) {
        existing.fromMeals.push(fromMeal);
      }
      if (isMeal) existing.mealCount++;
      if (quantity !== undefined && existing.totalQuantity !== undefined && existing.unit === unit) {
        existing.totalQuantity += quantity;
      } else if (quantity !== undefined && existing.totalQuantity === undefined) {
        existing.totalQuantity = quantity;
        existing.unit = unit;
      }
      // Recompute cost from total quantity and pricePerUnit
      if (pricePerUnit !== undefined && existing.totalQuantity !== undefined) {
        existing.estimatedCost = existing.totalQuantity * pricePerUnit;
      }
    } else {
      itemMap.set(key, {
        ingredientName: name.trim(),
        totalQuantity: quantity,
        unit,
        category,
        fromMeals: [fromMeal],
        mealCount: isMeal ? 1 : 0,
        estimatedCost:
          pricePerUnit !== undefined && quantity !== undefined
            ? quantity * pricePerUnit
            : undefined,
        checked: false,
      });
    }
  }

  // Add dinner ingredients
  for (const day of plan.days) {
    if (!day.assignedMealId) continue;
    const meal = meals.find((m) => m.id === day.assignedMealId);
    if (!meal) continue;
    for (const entry of meal.ingredients) {
      const master = masterMap.get(entry.ingredientId);
      if (!master) continue;
      addItem(
        master.name,
        master.category,
        entry.quantity,
        master.defaultUnit,
        master.pricePerUnit,
        meal.name,
        true
      );
    }
  }

  // Add category items (breakfast/lunch/snack/other)
  const allSelections = [
    ...plan.breakfastSelections,
    ...plan.lunchSelections,
    ...plan.snackSelections,
    ...plan.otherSelections,
  ];
  for (const itemId of allSelections) {
    const catItem = categoryItems.find((ci) => ci.id === itemId);
    if (catItem) {
      const source =
        catItem.itemType === "breakfast"
          ? "Breakfast"
          : catItem.itemType === "lunch"
            ? "Lunch"
            : catItem.itemType === "snack"
              ? "Snacks"
              : "Other";
      addItem(
        catItem.name,
        catItem.category,
        catItem.quantity ?? 1,
        catItem.unit || "unit",
        undefined,
        source,
        false
      );
    }
  }

  // Add free-text "other" notes as simple entries
  if (plan.otherNotes) {
    const lines = plan.otherNotes
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    for (const line of lines) {
      const key = line.toLowerCase();
      if (!itemMap.has(key)) {
        itemMap.set(key, {
          ingredientName: line,
          category: "other",
          fromMeals: ["Other"],
          mealCount: 0,
          checked: false,
        });
      }
    }
  }

  return Array.from(itemMap.values());
}
