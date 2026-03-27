import type { StoreCategory } from "../types/meals";

export const STORE_CATEGORY_LABELS: Record<StoreCategory, string> = {
  produce: "Produce",
  meat: "Meat & Poultry",
  dairy: "Dairy & Eggs",
  frozen: "Frozen",
  bakery: "Bakery & Bread",
  "canned-goods": "Canned Goods",
  "dry-goods": "Dry Goods & Pasta",
  condiments: "Condiments & Sauces",
  spices: "Spices & Seasonings",
  snacks: "Snacks",
  beverages: "Beverages",
  deli: "Deli",
  other: "Other",
};

/** Ordered for typical store layout */
export const STORE_CATEGORY_ORDER: StoreCategory[] = [
  "produce",
  "bakery",
  "deli",
  "meat",
  "dairy",
  "frozen",
  "canned-goods",
  "dry-goods",
  "condiments",
  "spices",
  "snacks",
  "beverages",
  "other",
];
