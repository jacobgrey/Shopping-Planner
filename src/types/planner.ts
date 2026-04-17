import type { StoreCategory } from "./meals";

export interface ManualItem {
  id: string;
  name: string;
  category: StoreCategory;
}

export interface DayPlan {
  dayOfWeek: number; // 0=Monday, 6=Sunday
  tags: string[];
  assignedMealId?: string;
  assignedSideIds?: string[]; // filled side slots for the day
  sideSlotCount?: number; // total chips (defaults to 1). Regenerate respects this count.
  locked: boolean;
  manualItems?: ManualItem[];
}

export interface WeekPlan {
  weekOf: string; // ISO date of week start
  days: DayPlan[];
  breakfastSelections: string[];
  lunchSelections: string[];
  snackSelections: string[];
  otherSelections: string[];
  otherNotes: string; // legacy, migrated to manualItems on load
  manualItems?: ManualItem[];
}

export interface Deal {
  ingredientName: string;
  store?: string;
  salePricePerUnit?: number;
  biasStrength: 1 | 2 | 3;
  expiresAt?: string;
}

export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

/**
 * Returns dayOfWeek indices in display order starting from the given day.
 * Internal dayOfWeek: 0=Mon, 1=Tue, ..., 6=Sun.
 */
export function getDisplayOrder(firstDayOfWeek: number): number[] {
  return Array.from({ length: 7 }, (_, i) => (firstDayOfWeek + i) % 7);
}
