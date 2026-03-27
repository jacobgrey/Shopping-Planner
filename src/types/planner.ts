export interface DayPlan {
  dayOfWeek: number; // 0=Monday, 6=Sunday
  tags: string[];
  assignedMealId?: string;
  locked: boolean;
}

export interface WeekPlan {
  weekOf: string; // ISO date of Monday
  days: DayPlan[];
  breakfastSelections: string[];
  lunchSelections: string[];
  snackSelections: string[];
  otherSelections: string[];
  otherNotes: string;
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
