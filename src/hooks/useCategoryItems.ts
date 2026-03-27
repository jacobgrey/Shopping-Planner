import { useState, useEffect, useCallback, useMemo } from "react";
import type { CategoryItem } from "../types/meals";
import { readJson, writeJson } from "../lib/storage";
import {
  DEFAULT_BREAKFAST_ITEMS,
  DEFAULT_LUNCH_ITEMS,
  DEFAULT_SNACK_ITEMS,
} from "../data/breakfast-lunch-snacks";

const CATEGORY_ITEMS_FILE = "category-items.json";

export function useCategoryItems() {
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    const data = await readJson<CategoryItem[]>(CATEGORY_ITEMS_FILE);
    if (data) {
      setItems(data);
    } else {
      const defaults: CategoryItem[] = [
        ...DEFAULT_BREAKFAST_ITEMS,
        ...DEFAULT_LUNCH_ITEMS,
        ...DEFAULT_SNACK_ITEMS,
      ];
      setItems(defaults);
      await writeJson(CATEGORY_ITEMS_FILE, defaults);
    }
    setLoaded(true);
  }

  const saveItems = useCallback(async (updated: CategoryItem[]) => {
    setItems(updated);
    await writeJson(CATEGORY_ITEMS_FILE, updated);
  }, []);

  const addItem = useCallback(
    async (def: Omit<CategoryItem, "id">): Promise<CategoryItem> => {
      const item: CategoryItem = { ...def, id: crypto.randomUUID() };
      await saveItems([...items, item]);
      return item;
    },
    [items, saveItems]
  );

  const updateItem = useCallback(
    async (id: string, updates: Partial<Omit<CategoryItem, "id">>) => {
      await saveItems(
        items.map((i) => (i.id === id ? { ...i, ...updates } : i))
      );
    },
    [items, saveItems]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      await saveItems(items.filter((i) => i.id !== id));
    },
    [items, saveItems]
  );

  const breakfastItems = useMemo(
    () => items.filter((i) => i.itemType === "breakfast"),
    [items]
  );
  const lunchItems = useMemo(
    () => items.filter((i) => i.itemType === "lunch"),
    [items]
  );
  const snackItems = useMemo(
    () => items.filter((i) => i.itemType === "snack"),
    [items]
  );
  const otherItems = useMemo(
    () => items.filter((i) => i.itemType === "other"),
    [items]
  );

  return {
    items,
    loaded,
    breakfastItems,
    lunchItems,
    snackItems,
    otherItems,
    addItem,
    updateItem,
    deleteItem,
  };
}
