import type { CategoryItem } from "../types/meals";

export const DEFAULT_BREAKFAST_ITEMS: CategoryItem[] = [
  { id: "b-cereal", name: "Cereal", category: "dry-goods", itemType: "breakfast" },
  { id: "b-oatmeal", name: "Oatmeal", category: "dry-goods", itemType: "breakfast" },
  { id: "b-eggs", name: "Eggs", category: "dairy", itemType: "breakfast" },
  { id: "b-bacon", name: "Bacon", category: "meat", itemType: "breakfast" },
  { id: "b-sausage", name: "Breakfast Sausage", category: "meat", itemType: "breakfast" },
  { id: "b-milk", name: "Milk", category: "dairy", itemType: "breakfast" },
  { id: "b-yogurt", name: "Yogurt", category: "dairy", itemType: "breakfast" },
  { id: "b-bread", name: "Bread (toast)", category: "bakery", itemType: "breakfast" },
  { id: "b-butter", name: "Butter", category: "dairy", itemType: "breakfast" },
  { id: "b-fruit", name: "Fresh Fruit", category: "produce", itemType: "breakfast" },
  { id: "b-juice", name: "Orange Juice", category: "beverages", itemType: "breakfast" },
  { id: "b-pancake", name: "Pancake Mix", category: "dry-goods", itemType: "breakfast" },
  { id: "b-syrup", name: "Syrup", category: "condiments", itemType: "breakfast" },
  { id: "b-granola", name: "Granola Bars", category: "snacks", itemType: "breakfast" },
];

export const DEFAULT_LUNCH_ITEMS: CategoryItem[] = [
  { id: "l-deli-meat", name: "Deli Meat", category: "deli", itemType: "lunch" },
  { id: "l-bread", name: "Sandwich Bread", category: "bakery", itemType: "lunch" },
  { id: "l-cheese-slices", name: "Sliced Cheese", category: "deli", itemType: "lunch" },
  { id: "l-mayo", name: "Mayonnaise", category: "condiments", itemType: "lunch" },
  { id: "l-mustard", name: "Mustard", category: "condiments", itemType: "lunch" },
  { id: "l-pb", name: "Peanut Butter", category: "condiments", itemType: "lunch" },
  { id: "l-jelly", name: "Jelly", category: "condiments", itemType: "lunch" },
  { id: "l-soup", name: "Canned Soup", category: "canned-goods", itemType: "lunch" },
  { id: "l-mac", name: "Mac & Cheese", category: "dry-goods", itemType: "lunch" },
  { id: "l-ramen", name: "Ramen Noodles", category: "dry-goods", itemType: "lunch" },
  { id: "l-lunchmeat", name: "Hot Dogs", category: "meat", itemType: "lunch" },
  { id: "l-tortillas", name: "Tortillas", category: "bakery", itemType: "lunch" },
];

export const DEFAULT_SNACK_ITEMS: CategoryItem[] = [
  { id: "s-chips", name: "Chips", category: "snacks", itemType: "snack" },
  { id: "s-crackers", name: "Crackers", category: "snacks", itemType: "snack" },
  { id: "s-popcorn", name: "Popcorn", category: "snacks", itemType: "snack" },
  { id: "s-pretzels", name: "Pretzels", category: "snacks", itemType: "snack" },
  { id: "s-fruit-snacks", name: "Fruit Snacks", category: "snacks", itemType: "snack" },
  { id: "s-cookies", name: "Cookies", category: "snacks", itemType: "snack" },
  { id: "s-ice-cream", name: "Ice Cream", category: "frozen", itemType: "snack" },
  { id: "s-applesauce", name: "Applesauce", category: "canned-goods", itemType: "snack" },
  { id: "s-string-cheese", name: "String Cheese", category: "dairy", itemType: "snack" },
  { id: "s-goldfish", name: "Goldfish", category: "snacks", itemType: "snack" },
  { id: "s-trail-mix", name: "Trail Mix", category: "snacks", itemType: "snack" },
  { id: "s-veggies", name: "Baby Carrots / Veggies", category: "produce", itemType: "snack" },
];
