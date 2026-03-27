import { useState, useEffect, useCallback, useRef } from "react";
import type { Meal, MealDefinition } from "../types/meals";
import { readJson, writeJson } from "../lib/storage";

const MEALS_FILE = "meals.json";

export function useMealLibrary() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const mealsRef = useRef<Meal[]>([]);

  useEffect(() => {
    mealsRef.current = meals;
  }, [meals]);

  useEffect(() => {
    loadMeals();
  }, []);

  async function loadMeals() {
    const data = await readJson<Meal[]>(MEALS_FILE);
    const list = data || [];
    setMeals(list);
    mealsRef.current = list;
    setLoaded(true);
  }

  const saveMeals = useCallback(async (updated: Meal[]) => {
    mealsRef.current = updated;
    setMeals(updated);
    await writeJson(MEALS_FILE, updated);
  }, []);

  const addMeal = useCallback(
    async (def: MealDefinition): Promise<Meal> => {
      const meal: Meal = {
        ...def,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      await saveMeals([...mealsRef.current, meal]);
      return meal;
    },
    [saveMeals]
  );

  const updateMeal = useCallback(
    async (id: string, def: Partial<MealDefinition>) => {
      await saveMeals(mealsRef.current.map((m) => (m.id === id ? { ...m, ...def } : m)));
    },
    [saveMeals]
  );

  const deleteMeal = useCallback(
    async (id: string) => {
      await saveMeals(mealsRef.current.filter((m) => m.id !== id));
    },
    [saveMeals]
  );

  const importMeals = useCallback(
    async (
      defs: MealDefinition[],
      mode: "skip" | "overwrite"
    ): Promise<{ added: number; skipped: number; overwritten: number }> => {
      let added = 0;
      let skipped = 0;
      let overwritten = 0;
      const updated = [...mealsRef.current];

      for (const def of defs) {
        const existingIdx = updated.findIndex(
          (m) => m.name.toLowerCase() === def.name.toLowerCase()
        );
        if (existingIdx >= 0) {
          if (mode === "overwrite") {
            updated[existingIdx] = { ...updated[existingIdx], ...def };
            overwritten++;
          } else {
            skipped++;
          }
        } else {
          updated.push({
            ...def,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
          });
          added++;
        }
      }

      await saveMeals(updated);
      return { added, skipped, overwritten };
    },
    [saveMeals]
  );

  return { meals, loaded, addMeal, updateMeal, deleteMeal, importMeals };
}
