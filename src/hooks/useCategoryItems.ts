import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  const itemsRef = useRef<CategoryItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    const data = await readJson<CategoryItem[]>(CATEGORY_ITEMS_FILE);
    if (data) {
      setItems(data);
      itemsRef.current = data;
    } else {
      const defaults: CategoryItem[] = [
        ...DEFAULT_BREAKFAST_ITEMS,
        ...DEFAULT_LUNCH_ITEMS,
        ...DEFAULT_SNACK_ITEMS,
      ];
      setItems(defaults);
      itemsRef.current = defaults;
      await writeJson(CATEGORY_ITEMS_FILE, defaults);
    }
    setLoaded(true);
  }

  const saveItems = useCallback(async (updated: CategoryItem[]) => {
    itemsRef.current = updated;
    setItems(updated);
    await writeJson(CATEGORY_ITEMS_FILE, updated);
  }, []);

  const addItem = useCallback(
    async (def: Omit<CategoryItem, "id">): Promise<CategoryItem> => {
      const item: CategoryItem = { ...def, id: crypto.randomUUID() };
      await saveItems([...itemsRef.current, item]);
      return item;
    },
    [saveItems]
  );

  const updateItem = useCallback(
    async (id: string, updates: Partial<Omit<CategoryItem, "id">>) => {
      await saveItems(
        itemsRef.current.map((i) => (i.id === id ? { ...i, ...updates } : i))
      );
    },
    [saveItems]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      await saveItems(itemsRef.current.filter((i) => i.id !== id));
    },
    [saveItems]
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

  const resetQuantities = useCallback(async () => {
    const updated = itemsRef.current.map((i) => ({
      ...i,
      quantity: undefined,
      unit: undefined,
    }));
    await saveItems(updated);
  }, [saveItems]);

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
    resetQuantities,
  };
}
