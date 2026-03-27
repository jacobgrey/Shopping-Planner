import { useState, useEffect, useCallback, useRef } from "react";
import type { MasterIngredient } from "../types/meals";
import { readJson, writeJson } from "../lib/storage";

const INGREDIENTS_FILE = "ingredients.json";

export function useIngredients() {
  const [ingredients, setIngredients] = useState<MasterIngredient[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ingredientsRef = useRef<MasterIngredient[]>([]);

  useEffect(() => {
    ingredientsRef.current = ingredients;
  }, [ingredients]);

  useEffect(() => {
    loadIngredients();
  }, []);

  async function loadIngredients() {
    try {
      const data = await readJson<MasterIngredient[]>(INGREDIENTS_FILE);
      const list = Array.isArray(data) ? data.filter((i) => i && typeof i.name === "string" && i.id) : [];
      setIngredients(list);
      ingredientsRef.current = list;
    } catch (e) {
      console.error("Failed to load ingredients:", e);
      setIngredients([]);
      ingredientsRef.current = [];
    }
    setLoaded(true);
  }

  const saveIngredients = useCallback(async (updated: MasterIngredient[]) => {
    ingredientsRef.current = updated;
    setIngredients(updated);
    await writeJson(INGREDIENTS_FILE, updated);
  }, []);

  const addIngredient = useCallback(
    async (def: Omit<MasterIngredient, "id">): Promise<MasterIngredient> => {
      const ing: MasterIngredient = { ...def, id: crypto.randomUUID() };
      const updated = [...ingredientsRef.current, ing];
      await saveIngredients(updated);
      return ing;
    },
    [saveIngredients]
  );

  const updateIngredient = useCallback(
    async (id: string, updates: Partial<Omit<MasterIngredient, "id">>) => {
      await saveIngredients(
        ingredientsRef.current.map((i) => (i.id === id ? { ...i, ...updates } : i))
      );
    },
    [saveIngredients]
  );

  const deleteIngredient = useCallback(
    async (id: string) => {
      await saveIngredients(ingredientsRef.current.filter((i) => i.id !== id));
    },
    [saveIngredients]
  );

  const getById = useCallback(
    (id: string): MasterIngredient | undefined => {
      return ingredientsRef.current.find((i) => i.id === id);
    },
    []
  );

  const findByName = useCallback(
    (name: string): MasterIngredient | undefined => {
      const lower = name.toLowerCase().trim();
      return ingredientsRef.current.find((i) => i.name.toLowerCase().trim() === lower);
    },
    []
  );

  /** Return the current ingredients from the ref (always fresh, no stale closure risk). */
  const getIngredients = useCallback((): MasterIngredient[] => {
    return ingredientsRef.current;
  }, []);

  /** Batch-add multiple ingredients at once (single file write). Returns all created ingredients. */
  const addIngredientsBatch = useCallback(
    async (defs: Omit<MasterIngredient, "id">[]): Promise<MasterIngredient[]> => {
      const existingNames = new Set(
        ingredientsRef.current.map((i) => i.name.toLowerCase().trim())
      );
      const newIngs: MasterIngredient[] = [];
      for (const def of defs) {
        const key = def.name.toLowerCase().trim();
        if (existingNames.has(key)) continue;
        existingNames.add(key);
        newIngs.push({ ...def, id: crypto.randomUUID() });
      }
      if (newIngs.length > 0) {
        await saveIngredients([...ingredientsRef.current, ...newIngs]);
      }
      return newIngs;
    },
    [saveIngredients]
  );

  return {
    ingredients,
    loaded,
    reload: loadIngredients,
    getIngredients,
    addIngredient,
    addIngredientsBatch,
    updateIngredient,
    deleteIngredient,
    getById,
    findByName,
    saveIngredients,
  };
}
