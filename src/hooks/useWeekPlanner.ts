import { useState, useEffect, useCallback, useRef } from "react";
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
    otherSelections: [],
    otherNotes: "",
  };
}

export function useWeekPlanner(meals: Meal[]) {
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  const planRef = useRef<WeekPlan | null>(null);
  const dealsRef = useRef<Deal[]>([]);
  const recentlyUsedRef = useRef<string[]>([]);

  useEffect(() => {
    planRef.current = plan;
  }, [plan]);
  useEffect(() => {
    dealsRef.current = deals;
  }, [deals]);
  useEffect(() => {
    recentlyUsedRef.current = recentlyUsed;
  }, [recentlyUsed]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const monday = getMonday();
    let savedPlan = await readJson<WeekPlan>(PLAN_FILE);
    if (!savedPlan || savedPlan.weekOf !== monday) {
      savedPlan = createEmptyWeek(monday);
    }
    // Ensure new fields exist on old saved plans
    if (!savedPlan.otherSelections) savedPlan.otherSelections = [];
    if (!savedPlan.otherNotes) savedPlan.otherNotes = "";

    setPlan(savedPlan);
    planRef.current = savedPlan;

    const savedDeals = await readJson<Deal[]>(DEALS_FILE);
    if (savedDeals) {
      setDeals(savedDeals);
      dealsRef.current = savedDeals;
    }

    const history = await readJson<string[]>(HISTORY_FILE);
    if (history) {
      setRecentlyUsed(history);
      recentlyUsedRef.current = history;
    }

    setLoaded(true);
  }

  const savePlan = useCallback(async (updated: WeekPlan) => {
    planRef.current = updated;
    setPlan(updated);
    await writeJson(PLAN_FILE, updated);
  }, []);

  const saveDeals = useCallback(async (updated: Deal[]) => {
    dealsRef.current = updated;
    setDeals(updated);
    await writeJson(DEALS_FILE, updated);
  }, []);

  const setDayTags = useCallback(
    async (dayOfWeek: number, tags: string[]) => {
      const p = planRef.current;
      if (!p) return;
      const updated = {
        ...p,
        days: p.days.map((d) =>
          d.dayOfWeek === dayOfWeek ? { ...d, tags } : d
        ),
      };
      await savePlan(updated);
    },
    [savePlan]
  );

  const toggleLock = useCallback(
    async (dayOfWeek: number) => {
      const p = planRef.current;
      if (!p) return;
      const updated = {
        ...p,
        days: p.days.map((d) =>
          d.dayOfWeek === dayOfWeek ? { ...d, locked: !d.locked } : d
        ),
      };
      await savePlan(updated);
    },
    [savePlan]
  );

  const setDayMeal = useCallback(
    async (dayOfWeek: number, mealId: string | undefined) => {
      const p = planRef.current;
      if (!p) return;
      const updated = {
        ...p,
        days: p.days.map((d) =>
          d.dayOfWeek === dayOfWeek
            ? { ...d, assignedMealId: mealId, locked: !!mealId }
            : d
        ),
      };
      await savePlan(updated);
    },
    [savePlan]
  );

  const autoFillWeek = useCallback(async () => {
    const p = planRef.current;
    if (!p) return;
    const assignments = selectMealsForWeek(
      meals,
      p.days,
      dealsRef.current,
      recentlyUsedRef.current
    );
    const updated = {
      ...p,
      days: p.days.map((d) => {
        if (d.locked) return d;
        const mealId = assignments.get(d.dayOfWeek);
        return mealId ? { ...d, assignedMealId: mealId } : d;
      }),
    };
    await savePlan(updated);
  }, [meals, savePlan]);

  const regenerateSingleDay = useCallback(
    async (dayOfWeek: number) => {
      const p = planRef.current;
      if (!p) return;
      const day = p.days.find((d) => d.dayOfWeek === dayOfWeek);
      if (!day) return;
      const newMealId = regenerateDay(
        meals,
        day,
        p.days,
        dealsRef.current,
        recentlyUsedRef.current
      );
      if (newMealId) {
        const updated = {
          ...p,
          days: p.days.map((d) =>
            d.dayOfWeek === dayOfWeek
              ? { ...d, assignedMealId: newMealId, locked: false }
              : d
          ),
        };
        await savePlan(updated);
      }
    },
    [meals, savePlan]
  );

  const clearWeek = useCallback(async () => {
    const p = planRef.current;
    if (!p) return;
    const currentIds = p.days
      .map((d) => d.assignedMealId)
      .filter((id): id is string => !!id);
    const updatedHistory = [...currentIds, ...recentlyUsedRef.current].slice(0, 42);
    setRecentlyUsed(updatedHistory);
    recentlyUsedRef.current = updatedHistory;
    await writeJson(HISTORY_FILE, updatedHistory);

    const updated = {
      ...p,
      days: p.days.map((d) => ({
        ...d,
        assignedMealId: undefined,
        locked: false,
      })),
    };
    await savePlan(updated);
  }, [savePlan]);

  const setCategorySelections = useCallback(
    async (
      category: "breakfastSelections" | "lunchSelections" | "snackSelections" | "otherSelections",
      selections: string[]
    ) => {
      const p = planRef.current;
      if (!p) return;
      const updated = { ...p, [category]: selections };
      await savePlan(updated);
    },
    [savePlan]
  );

  const setOtherNotes = useCallback(
    async (notes: string) => {
      const p = planRef.current;
      if (!p) return;
      const updated = { ...p, otherNotes: notes };
      await savePlan(updated);
    },
    [savePlan]
  );

  const addDeal = useCallback(
    async (deal: Deal) => {
      const updated = [...dealsRef.current, deal];
      await saveDeals(updated);
    },
    [saveDeals]
  );

  const removeDeal = useCallback(
    async (index: number) => {
      const updated = dealsRef.current.filter((_, i) => i !== index);
      await saveDeals(updated);
    },
    [saveDeals]
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
    setOtherNotes,
    addDeal,
    removeDeal,
  };
}
