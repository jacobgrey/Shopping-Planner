import { useState, useEffect, useCallback } from "react";
import type { Meal, MealDefinition } from "../types/meals";
import { readJson, writeJson } from "../lib/storage";

const MEALS_FILE = "meals.json";

function generateId(): string {
  return crypto.randomUUID();
}

export function useMealLibrary() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadMeals();
  }, []);

  async function loadMeals() {
    const data = await readJson<Meal[]>(MEALS_FILE);
    if (data) {
      setMeals(data);
    }
    setLoaded(true);
  }

  const saveMeals = useCallback(async (updated: Meal[]) => {
    setMeals(updated);
    await writeJson(MEALS_FILE, updated);
  }, []);

  const addMeal = useCallback(
    async (def: MealDefinition): Promise<Meal> => {
      const meal: Meal = {
        ...def,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      const updated = [...meals, meal];
      await saveMeals(updated);
      return meal;
    },
    [meals, saveMeals]
  );

  const updateMeal = useCallback(
    async (id: string, def: Partial<MealDefinition>) => {
      const updated = meals.map((m) =>
        m.id === id ? { ...m, ...def } : m
      );
      await saveMeals(updated);
    },
    [meals, saveMeals]
  );

  const deleteMeal = useCallback(
    async (id: string) => {
      const updated = meals.filter((m) => m.id !== id);
      await saveMeals(updated);
    },
    [meals, saveMeals]
  );

  const importMeals = useCallback(
    async (
      defs: MealDefinition[],
      mode: "skip" | "overwrite"
    ): Promise<{ added: number; skipped: number; overwritten: number }> => {
      let added = 0;
      let skipped = 0;
      let overwritten = 0;
      const updated = [...meals];

      for (const def of defs) {
        const existingIdx = updated.findIndex(
          (m) => m.name.toLowerCase() === def.name.toLowerCase()
        );
        if (existingIdx >= 0) {
          if (mode === "overwrite") {
            updated[existingIdx] = {
              ...updated[existingIdx],
              ...def,
            };
            overwritten++;
          } else {
            skipped++;
          }
        } else {
          updated.push({
            ...def,
            id: generateId(),
            createdAt: new Date().toISOString(),
          });
          added++;
        }
      }

      await saveMeals(updated);
      return { added, skipped, overwritten };
    },
    [meals, saveMeals]
  );

  /** Get all unique ingredient names across all meals (for autocomplete) */
  const allIngredientNames = useCallback((): string[] => {
    const names = new Set<string>();
    for (const meal of meals) {
      for (const ing of meal.ingredients) {
        names.add(ing.name.toLowerCase());
      }
    }
    return Array.from(names).sort();
  }, [meals]);

  return {
    meals,
    loaded,
    addMeal,
    updateMeal,
    deleteMeal,
    importMeals,
    allIngredientNames,
  };
}
