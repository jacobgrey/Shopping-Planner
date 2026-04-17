export type StoreCategory =
  | "produce"
  | "meat"
  | "dairy"
  | "frozen"
  | "bakery"
  | "canned-goods"
  | "dry-goods"
  | "condiments"
  | "spices"
  | "snacks"
  | "beverages"
  | "deli"
  | "other";

export const STORE_CATEGORIES: StoreCategory[] = [
  "produce",
  "meat",
  "dairy",
  "frozen",
  "bakery",
  "canned-goods",
  "dry-goods",
  "condiments",
  "spices",
  "snacks",
  "beverages",
  "deli",
  "other",
];

// --- Tags (user-manageable) ---

export interface TagDefinition {
  id: string;
  label: string;
  colorIndex: number;
}

// --- Master Ingredient List ---

export interface MasterIngredient {
  id: string;
  name: string;
  category: StoreCategory;
  defaultUnit: string;
  pricePerUnit?: number;
}

// --- Meal Ingredients (reference master list) ---

export interface IngredientEntry {
  ingredientId: string;
  quantity?: number;
}

// --- Import format (external AI-processed data) ---

export interface ImportIngredientEntry {
  name: string;
  quantity?: number;
  unit?: string;
  category: StoreCategory;
  priceEstimate?: number;
}

export interface MealImport {
  version: "1.0";
  meals: ImportMealDefinition[];
}

export interface ImportMealDefinition {
  name: string;
  sides?: string[];
  ingredients: ImportIngredientEntry[];
  tags: string[];
  prepTimeHours?: number;
  startTimeHours?: number;
  prepTimeMinutes?: number; // legacy, auto-converted on import
  recipeUrl?: string;
  notes?: string;
}

// --- Internal meal ---

export interface MealDefinition {
  name: string;
  sides?: string[];
  ingredients: IngredientEntry[];
  tags: string[];
  prepTimeHours?: number;
  startTimeHours?: number;
  recipeUrl?: string;
  notes?: string;
}

export interface Meal extends MealDefinition {
  id: string;
  createdAt: string;
  lastUsed?: string;
}

// --- Category Items (breakfast/lunch/snack/other) ---

export interface CategoryItem {
  id: string;
  name: string;
  category: StoreCategory;
  itemType: "breakfast" | "lunch" | "snack" | "other";
  quantity?: number;
  unit?: string;
}
