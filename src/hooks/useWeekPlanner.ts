import { useState, useEffect, useCallback } from "react";
import type { WeekPlan, Deal } from "../types/planner";
import type { Meal } from "../types/meals";
import { readJson, writeJson } from "../lib/storage";
import { selectMealsForWeek, regenerateDay } from "../lib/mealSelector";

const PLAN_FILE = "current-week.json";
const DEALS_FILE = "deals.json";
const HISTORY_FILE = "meal-history.json";

function getMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

function createEmptyWeek(weekOf: string): WeekPlan {
  return {
    weekOf,
    days: Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      tags: [],
      locked: false,
    })),
    breakfastSelections: [],
    lunchSelections: [],
    snackSelections: [],
  };
}

export function useWeekPlanner(meals: Meal[]) {
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const monday = getMonday();
    let savedPlan = await readJson<WeekPlan>(PLAN_FILE);
    if (!savedPlan || savedPlan.weekOf !== monday) {
      // New week or no saved plan
      savedPlan = createEmptyWeek(monday);
    }
    setPlan(savedPlan);

    const savedDeals = await readJson<Deal[]>(DEALS_FILE);
    if (savedDeals) setDeals(savedDeals);

    const history = await readJson<string[]>(HISTORY_FILE);
    if (history) setRecentlyUsed(history);

    setLoaded(true);
  }

  const savePlan = useCallback(async (updated: WeekPlan) => {
    setPlan(updated);
    await writeJson(PLAN_FILE, updated);
  }, []);

  const saveDeals = useCallback(async (updated: Deal[]) => {
    setDeals(updated);
    await writeJson(DEALS_FILE, updated);
  }, []);

  const setDayTags = useCallback(
    async (dayOfWeek: number, tags: string[]) => {
      if (!plan) return;
      const updated = {
        ...plan,
        days: plan.days.map((d) =>
          d.dayOfWeek === dayOfWeek ? { ...d, tags } : d
        ),
      };
      await savePlan(updated);
    },
    [plan, savePlan]
  );

  const toggleLock = useCallback(
    async (dayOfWeek: number) => {
      if (!plan) return;
      const updated = {
        ...plan,
        days: plan.days.map((d) =>
          d.dayOfWeek === dayOfWeek ? { ...d, locked: !d.locked } : d
        ),
      };
      await savePlan(updated);
    },
    [plan, savePlan]
  );

  const setDayMeal = useCallback(
    async (dayOfWeek: number, mealId: string | undefined) => {
      if (!plan) return;
      const updated = {
        ...plan,
        days: plan.days.map((d) =>
          d.dayOfWeek === dayOfWeek
            ? { ...d, assignedMealId: mealId, locked: !!mealId }
            : d
        ),
      };
      await savePlan(updated);
    },
    [plan, savePlan]
  );

  const autoFillWeek = useCallback(async () => {
    if (!plan) return;
    const assignments = selectMealsForWeek(meals, plan.days, deals, recentlyUsed);
    const updated = {
      ...plan,
      days: plan.days.map((d) => {
        if (d.locked) return d;
        const mealId = assignments.get(d.dayOfWeek);
        return mealId ? { ...d, assignedMealId: mealId } : d;
      }),
    };
    await savePlan(updated);
  }, [plan, meals, deals, recentlyUsed, savePlan]);

  const regenerateSingleDay = useCallback(
    async (dayOfWeek: number) => {
      if (!plan) return;
      const day = plan.days.find((d) => d.dayOfWeek === dayOfWeek);
      if (!day) return;
      const newMealId = regenerateDay(meals, day, plan.days, deals, recentlyUsed);
      if (newMealId) {
        const updated = {
          ...plan,
          days: plan.days.map((d) =>
            d.dayOfWeek === dayOfWeek
              ? { ...d, assignedMealId: newMealId, locked: false }
              : d
          ),
        };
        await savePlan(updated);
      }
    },
    [plan, meals, deals, recentlyUsed, savePlan]
  );

  const clearWeek = useCallback(async () => {
    if (!plan) return;
    // Save current assignments to history before clearing
    const currentIds = plan.days
      .map((d) => d.assignedMealId)
      .filter((id): id is string => !!id);
    const updatedHistory = [...currentIds, ...recentlyUsed].slice(0, 42); // Keep ~6 weeks
    setRecentlyUsed(updatedHistory);
    await writeJson(HISTORY_FILE, updatedHistory);

    const updated = {
      ...plan,
      days: plan.days.map((d) => ({
        ...d,
        assignedMealId: undefined,
        locked: false,
      })),
    };
    await savePlan(updated);
  }, [plan, recentlyUsed, savePlan]);

  const setCategorySelections = useCallback(
    async (
      category: "breakfastSelections" | "lunchSelections" | "snackSelections",
      selections: string[]
    ) => {
      if (!plan) return;
      const updated = { ...plan, [category]: selections };
      await savePlan(updated);
    },
    [plan, savePlan]
  );

  const addDeal = useCallback(
    async (deal: Deal) => {
      const updated = [...deals, deal];
      await saveDeals(updated);
    },
    [deals, saveDeals]
  );

  const removeDeal = useCallback(
    async (index: number) => {
      const updated = deals.filter((_, i) => i !== index);
      await saveDeals(updated);
    },
    [deals, saveDeals]
  );

  return {
    plan,
    deals,
    loaded,
    setDayTags,
    toggleLock,
    setDayMeal,
    autoFillWeek,
    regenerateSingleDay,
    clearWeek,
    setCategorySelections,
    addDeal,
    removeDeal,
  };
}
