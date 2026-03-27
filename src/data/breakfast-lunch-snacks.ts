import type { StoreCategory } from "../types/meals";

export interface CategoryItem {
  id: string;
  name: string;
  category: StoreCategory;
}

export const BREAKFAST_ITEMS: CategoryItem[] = [
  { id: "b-cereal", name: "Cereal", category: "dry-goods" },
  { id: "b-oatmeal", name: "Oatmeal", category: "dry-goods" },
  { id: "b-eggs", name: "Eggs", category: "dairy" },
  { id: "b-bacon", name: "Bacon", category: "meat" },
  { id: "b-sausage", name: "Breakfast Sausage", category: "meat" },
  { id: "b-milk", name: "Milk", category: "dairy" },
  { id: "b-yogurt", name: "Yogurt", category: "dairy" },
  { id: "b-bread", name: "Bread (toast)", category: "bakery" },
  { id: "b-butter", name: "Butter", category: "dairy" },
  { id: "b-fruit", name: "Fresh Fruit", category: "produce" },
  { id: "b-juice", name: "Orange Juice", category: "beverages" },
  { id: "b-pancake", name: "Pancake Mix", category: "dry-goods" },
  { id: "b-syrup", name: "Syrup", category: "condiments" },
  { id: "b-granola", name: "Granola Bars", category: "snacks" },
];

export const LUNCH_ITEMS: CategoryItem[] = [
  { id: "l-deli-meat", name: "Deli Meat", category: "deli" },
  { id: "l-bread", name: "Sandwich Bread", category: "bakery" },
  { id: "l-cheese-slices", name: "Sliced Cheese", category: "deli" },
  { id: "l-mayo", name: "Mayonnaise", category: "condiments" },
  { id: "l-mustard", name: "Mustard", category: "condiments" },
  { id: "l-pb", name: "Peanut Butter", category: "condiments" },
  { id: "l-jelly", name: "Jelly", category: "condiments" },
  { id: "l-soup", name: "Canned Soup", category: "canned-goods" },
  { id: "l-mac", name: "Mac & Cheese", category: "dry-goods" },
  { id: "l-ramen", name: "Ramen Noodles", category: "dry-goods" },
  { id: "l-lunchmeat", name: "Hot Dogs", category: "meat" },
  { id: "l-tortillas", name: "Tortillas", category: "bakery" },
];

export const SNACK_ITEMS: CategoryItem[] = [
  { id: "s-chips", name: "Chips", category: "snacks" },
  { id: "s-crackers", name: "Crackers", category: "snacks" },
  { id: "s-popcorn", name: "Popcorn", category: "snacks" },
  { id: "s-pretzels", name: "Pretzels", category: "snacks" },
  { id: "s-fruit-snacks", name: "Fruit Snacks", category: "snacks" },
  { id: "s-cookies", name: "Cookies", category: "snacks" },
  { id: "s-ice-cream", name: "Ice Cream", category: "frozen" },
  { id: "s-applesauce", name: "Applesauce", category: "canned-goods" },
  { id: "s-string-cheese", name: "String Cheese", category: "dairy" },
  { id: "s-goldfish", name: "Goldfish", category: "snacks" },
  { id: "s-trail-mix", name: "Trail Mix", category: "snacks" },
  { id: "s-veggies", name: "Baby Carrots / Veggies", category: "produce" },
];

export const ALL_CATEGORY_ITEMS = [
  ...BREAKFAST_ITEMS,
  ...LUNCH_ITEMS,
  ...SNACK_ITEMS,
];
