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

export type MealTag =
  | "low-effort"
  | "has-leftovers"
  | "low-cost"
  | "filling"
  | "kid-favorite"
  | "dads-favorite"
  | "healthy"
  | "comfort-food"
  | "quick"
  | "slow-cooker"
  | "grill"
  | "vegetarian";

export const MEAL_TAGS: MealTag[] = [
  "low-effort",
  "has-leftovers",
  "low-cost",
  "filling",
  "kid-favorite",
  "dads-favorite",
  "healthy",
  "comfort-food",
  "quick",
  "slow-cooker",
  "grill",
  "vegetarian",
];

export interface IngredientEntry {
  name: string;
  quantity?: number;
  unit?: string;
  category: StoreCategory;
  priceEstimate?: number;
}

/** The import format for meals from external sources (e.g., AI-processed handwritten sheets) */
export interface MealImport {
  version: "1.0";
  meals: MealDefinition[];
}

export interface MealDefinition {
  name: string;
  sides?: string[];
  ingredients: IngredientEntry[];
  tags: string[];
  prepTimeMinutes?: number;
  notes?: string;
}

/** Internal meal with ID and metadata */
export interface Meal extends MealDefinition {
  id: string;
  createdAt: string;
  lastUsed?: string;
}
