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
    try {
      const data = await readJson<Meal[]>(MEALS_FILE);
      const raw = Array.isArray(data) ? data.filter((m) => m && typeof m.name === "string") : [];
      // Migrate legacy prepTimeMinutes → prepTimeHours
      let migrated = false;
      const list = raw.map((m: any) => {
        if (m.prepTimeMinutes !== undefined && m.prepTimeHours === undefined) {
          migrated = true;
          const { prepTimeMinutes, ...rest } = m;
          return { ...rest, prepTimeHours: Math.round((prepTimeMinutes / 60) * 100) / 100 };
        }
        return m;
      });
      if (migrated) {
        await writeJson(MEALS_FILE, list);
      }
      setMeals(list);
      mealsRef.current = list;
    } catch (e) {
      console.error("Failed to load meals:", e);
      setMeals([]);
      mealsRef.current = [];
    }
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
      mode: "merge" | "replace"
    ): Promise<{ added: number; skipped: number; replaced: number }> => {
      let added = 0;
      let skipped = 0;

      if (mode === "replace") {
        // Replace: clear all existing meals, add all from import
        const newMeals = defs.map((def) => ({
          ...def,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        }));
        await saveMeals(newMeals);
        return { added: newMeals.length, skipped: 0, replaced: mealsRef.current.length };
      }

      // Merge: add new meals, skip duplicates by name
      const updated = [...mealsRef.current];
      for (const def of defs) {
        const existingIdx = updated.findIndex(
          (m) => m.name.toLowerCase() === def.name.toLowerCase()
        );
        if (existingIdx >= 0) {
          skipped++;
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
      return { added, skipped, replaced: 0 };
    },
    [saveMeals]
  );

  return {
    meals,
    loaded,
    reload: loadMeals,
    addMeal,
    updateMeal,
    deleteMeal,
    importMeals,
    saveMeals,
  };
}
