import type { StoreCategory } from "./meals";

export interface ShoppingItem {
  ingredientName: string;
  totalQuantity?: number;
  unit?: string;
  category: StoreCategory;
  fromMeals: string[];
  mealCount: number;
  estimatedCost?: number;
  checked: boolean;
}

export type ShoppingListSort = "by-meal" | "by-category";
