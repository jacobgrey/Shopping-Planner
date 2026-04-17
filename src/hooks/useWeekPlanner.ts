import { useState, useEffect, useCallback, useRef } from "react";
import type { WeekPlan, Deal, ManualItem, DayPlan } from "../types/planner";
import type { Meal, Side, MasterIngredient } from "../types/meals";
import { readJson, writeJson } from "../lib/storage";
import { selectMealsForWeek, regenerateDay } from "../lib/mealSelector";
import { selectSidesForDay, selectSidesForWeek } from "../lib/sidesSelector";

const PLAN_FILE = "current-week.json";
const DEALS_FILE = "deals.json";
const HISTORY_FILE = "meal-history.json";

/**
 * Get the start date of the current week.
 * firstDayOfWeek uses internal scheme: 0=Mon, 1=Tue, ..., 6=Sun.
 */
function getWeekStart(firstDayOfWeek: number = 0): string {
  const now = new Date();
  const jsDay = now.getDay(); // JS: 0=Sun, 1=Mon, ..., 6=Sat
  // Convert internal dayOfWeek (0=Mon..6=Sun) to JS day (0=Sun..6=Sat)
  const targetJsDay = firstDayOfWeek === 6 ? 0 : firstDayOfWeek + 1;
  let diff = targetJsDay - jsDay;
  if (diff > 0) diff -= 7; // go back to most recent occurrence
  const start = new Date(now);
  start.setDate(now.getDate() + diff);
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, "0");
  const d = String(start.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function createEmptyWeek(weekOf: string): WeekPlan {
  return {
    weekOf,
    days: Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      tags: [],
      locked: false,
      manualItems: [],
    })),
    breakfastSelections: [],
    lunchSelections: [],
    snackSelections: [],
    otherSelections: [],
    otherNotes: "",
    manualItems: [],
  };
}

export function useWeekPlanner(
  meals: Meal[],
  sides: Side[] = [],
  masterIngredients: MasterIngredient[] = [],
  firstDayOfWeek: number = 0,
) {
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
  }, [firstDayOfWeek]);

  async function loadData() {
    try {
      const weekStart = getWeekStart(firstDayOfWeek);
      let savedPlan = await readJson<WeekPlan>(PLAN_FILE);
      if (!savedPlan || typeof savedPlan !== "object" || savedPlan.weekOf !== weekStart) {
        savedPlan = createEmptyWeek(weekStart);
      }
      // Ensure required fields exist on old/malformed saved plans
      if (!Array.isArray(savedPlan.days)) savedPlan.days = createEmptyWeek(weekStart).days;
      if (!savedPlan.breakfastSelections) savedPlan.breakfastSelections = [];
      if (!savedPlan.lunchSelections) savedPlan.lunchSelections = [];
      if (!savedPlan.snackSelections) savedPlan.snackSelections = [];
      if (!savedPlan.otherSelections) savedPlan.otherSelections = [];
      if (!savedPlan.otherNotes) savedPlan.otherNotes = "";

      // Migrate otherNotes string → manualItems array
      if (!savedPlan.manualItems) {
        if (savedPlan.otherNotes) {
          savedPlan.manualItems = savedPlan.otherNotes
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
            .map((name) => ({
              id: crypto.randomUUID(),
              name,
              category: "other" as const,
            }));
          savedPlan.otherNotes = "";
        } else {
          savedPlan.manualItems = [];
        }
      }
      // Ensure each day has manualItems
      for (const day of savedPlan.days) {
        if (!day.manualItems) day.manualItems = [];
      }

      setPlan(savedPlan);
      planRef.current = savedPlan;

      const savedDeals = await readJson<Deal[]>(DEALS_FILE);
      if (Array.isArray(savedDeals)) {
        setDeals(savedDeals);
        dealsRef.current = savedDeals;
      }

      const history = await readJson<string[]>(HISTORY_FILE);
      if (Array.isArray(history)) {
        setRecentlyUsed(history);
        recentlyUsedRef.current = history;
      }
    } catch (e) {
      console.error("Failed to load planner data:", e);
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

  const rollSidesForDay = useCallback(
    (day: DayPlan, meal: Meal | undefined, count: number, usedThisWeek: Set<string>): string[] => {
      if (sides.length === 0) return [];
      return selectSidesForDay(
        day,
        meal,
        sides,
        dealsRef.current,
        count,
        masterIngredients,
        [],
        usedThisWeek,
      );
    },
    [sides, masterIngredients],
  );

  const usedSideIdsAcross = useCallback(
    (days: DayPlan[], excludeDay: number): Set<string> => {
      const used = new Set<string>();
      for (const d of days) {
        if (d.dayOfWeek === excludeDay) continue;
        if (d.assignedSideIds) for (const id of d.assignedSideIds) used.add(id);
      }
      return used;
    },
    [],
  );

  const setDayMeal = useCallback(
    async (dayOfWeek: number, mealId: string | undefined) => {
      const p = planRef.current;
      if (!p) return;
      const prevDay = p.days.find((d) => d.dayOfWeek === dayOfWeek);
      const slotCount = mealId ? prevDay?.sideSlotCount ?? 1 : undefined;
      let newSideIds: string[] | undefined;
      if (mealId && slotCount && slotCount > 0) {
        const meal = meals.find((m) => m.id === mealId);
        const day: DayPlan = prevDay
          ? { ...prevDay, assignedMealId: mealId }
          : { dayOfWeek, tags: [], locked: true };
        newSideIds = rollSidesForDay(
          day,
          meal,
          slotCount,
          usedSideIdsAcross(p.days, dayOfWeek),
        );
      }

      const updated = {
        ...p,
        days: p.days.map((d) =>
          d.dayOfWeek === dayOfWeek
            ? {
                ...d,
                assignedMealId: mealId,
                locked: !!mealId,
                assignedSideIds: mealId ? newSideIds ?? [] : [],
                sideSlotCount: mealId ? d.sideSlotCount ?? 1 : 1,
              }
            : d
        ),
      };
      await savePlan(updated);
    },
    [meals, rollSidesForDay, usedSideIdsAcross, savePlan]
  );

  const autoFillWeek = useCallback(async () => {
    const p = planRef.current;
    if (!p) return;
    const mealAssignments = selectMealsForWeek(
      meals,
      p.days,
      dealsRef.current,
      recentlyUsedRef.current,
      masterIngredients,
    );

    // Apply meal assignments first, then compute sides against the updated day array
    // so each day's side pool reflects its (possibly new) meal.
    const daysWithMeals = p.days.map((d) => {
      if (d.locked) return d;
      const mealId = mealAssignments.get(d.dayOfWeek);
      return mealId ? { ...d, assignedMealId: mealId } : d;
    });

    const sideAssignments = selectSidesForWeek(
      daysWithMeals,
      meals,
      sides,
      dealsRef.current,
      masterIngredients,
    );

    const updated = {
      ...p,
      days: daysWithMeals.map((d) => {
        if (d.locked) return d;
        const sideIds = sideAssignments.get(d.dayOfWeek);
        return sideIds ? { ...d, assignedSideIds: sideIds } : d;
      }),
    };
    await savePlan(updated);
  }, [meals, sides, masterIngredients, savePlan]);

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
        recentlyUsedRef.current,
        masterIngredients,
      );

      const slotCount = day.sideSlotCount ?? 1;
      const updatedDay: DayPlan = {
        ...day,
        assignedMealId: newMealId ?? day.assignedMealId,
        locked: false,
      };
      const meal = updatedDay.assignedMealId
        ? meals.find((m) => m.id === updatedDay.assignedMealId)
        : undefined;
      const newSideIds = rollSidesForDay(
        updatedDay,
        meal,
        slotCount,
        usedSideIdsAcross(p.days, dayOfWeek),
      );

      const updated = {
        ...p,
        days: p.days.map((d) =>
          d.dayOfWeek === dayOfWeek
            ? { ...updatedDay, assignedSideIds: newSideIds }
            : d
        ),
      };
      await savePlan(updated);
    },
    [meals, masterIngredients, rollSidesForDay, usedSideIdsAcross, savePlan]
  );

  const clearWeek = useCallback(async () => {
    const p = planRef.current;
    if (!p) return;
    // Reset recent cooldowns so next auto-fill starts fresh
    setRecentlyUsed([]);
    recentlyUsedRef.current = [];
    await writeJson(HISTORY_FILE, []);

    const updated = {
      ...p,
      days: p.days.map((d) => ({
        ...d,
        assignedMealId: undefined,
        assignedSideIds: [],
        sideSlotCount: 1,
        locked: false,
        manualItems: [],
      })),
    };
    await savePlan(updated);
  }, [savePlan]);

  const resetAll = useCallback(async () => {
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
        assignedSideIds: [],
        sideSlotCount: 1,
        locked: false,
        tags: [],
        manualItems: [],
      })),
      breakfastSelections: [],
      lunchSelections: [],
      snackSelections: [],
      otherSelections: [],
      otherNotes: "",
      manualItems: [],
    };
    await savePlan(updated);
    await saveDeals([]);
  }, [savePlan, saveDeals]);

  const setDaySides = useCallback(
    async (dayOfWeek: number, sideIds: string[]) => {
      const p = planRef.current;
      if (!p) return;
      const updated = {
        ...p,
        days: p.days.map((d) =>
          d.dayOfWeek === dayOfWeek
            ? {
                ...d,
                assignedSideIds: sideIds,
                sideSlotCount: Math.max(sideIds.length, d.sideSlotCount ?? 1),
              }
            : d,
        ),
      };
      await savePlan(updated);
    },
    [savePlan],
  );

  const setDaySideSlotCount = useCallback(
    async (dayOfWeek: number, count: number) => {
      const p = planRef.current;
      if (!p) return;
      const safeCount = Math.max(0, Math.floor(count));
      const updated = {
        ...p,
        days: p.days.map((d) => {
          if (d.dayOfWeek !== dayOfWeek) return d;
          const trimmed = (d.assignedSideIds ?? []).slice(0, safeCount);
          return { ...d, sideSlotCount: safeCount, assignedSideIds: trimmed };
        }),
      };
      await savePlan(updated);
    },
    [savePlan],
  );

  const addSideChipToDay = useCallback(
    async (dayOfWeek: number) => {
      const p = planRef.current;
      if (!p) return;
      const day = p.days.find((d) => d.dayOfWeek === dayOfWeek);
      if (!day) return;
      const meal = day.assignedMealId
        ? meals.find((m) => m.id === day.assignedMealId)
        : undefined;
      const existing = day.assignedSideIds ?? [];
      const [rolled] = selectSidesForDay(
        day,
        meal,
        sides,
        dealsRef.current,
        1,
        masterIngredients,
        existing,
        usedSideIdsAcross(p.days, dayOfWeek),
      );
      if (!rolled) return; // Nothing to add (library exhausted for this meal's pool).
      const newSides = [...existing, rolled];
      // Invariant: sideSlotCount reflects the number of visible chips. Without this,
      // a day that started with 0 chips would end up with slotCount=2 after one click,
      // causing the next regenerate to try to pick two sides instead of one.
      const newSlotCount = newSides.length;
      const updated = {
        ...p,
        days: p.days.map((d) =>
          d.dayOfWeek === dayOfWeek
            ? { ...d, assignedSideIds: newSides, sideSlotCount: newSlotCount }
            : d,
        ),
      };
      await savePlan(updated);
    },
    [sides, meals, masterIngredients, usedSideIdsAcross, savePlan],
  );

  const removeSideChipFromDay = useCallback(
    async (dayOfWeek: number, chipIndex: number) => {
      const p = planRef.current;
      if (!p) return;
      const day = p.days.find((d) => d.dayOfWeek === dayOfWeek);
      if (!day) return;
      const existing = day.assignedSideIds ?? [];
      const newSides = existing.filter((_, i) => i !== chipIndex);
      const newSlotCount = newSides.length;
      const updated = {
        ...p,
        days: p.days.map((d) =>
          d.dayOfWeek === dayOfWeek
            ? { ...d, assignedSideIds: newSides, sideSlotCount: newSlotCount }
            : d,
        ),
      };
      await savePlan(updated);
    },
    [savePlan],
  );

  const setDaySideAt = useCallback(
    async (dayOfWeek: number, chipIndex: number, sideId: string) => {
      const p = planRef.current;
      if (!p) return;
      const day = p.days.find((d) => d.dayOfWeek === dayOfWeek);
      if (!day) return;
      const existing = day.assignedSideIds ?? [];
      const newSides = [...existing];
      newSides[chipIndex] = sideId;
      const updated = {
        ...p,
        days: p.days.map((d) =>
          d.dayOfWeek === dayOfWeek ? { ...d, assignedSideIds: newSides } : d,
        ),
      };
      await savePlan(updated);
    },
    [savePlan],
  );

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

  const setDayManualItems = useCallback(
    async (dayOfWeek: number, items: ManualItem[]) => {
      const p = planRef.current;
      if (!p) return;
      const updated = {
        ...p,
        days: p.days.map((d) =>
          d.dayOfWeek === dayOfWeek ? { ...d, manualItems: items } : d
        ),
      };
      await savePlan(updated);
    },
    [savePlan]
  );

  const setManualItems = useCallback(
    async (items: ManualItem[]) => {
      const p = planRef.current;
      if (!p) return;
      const updated = { ...p, manualItems: items };
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

  const updateDeal = useCallback(
    async (index: number, deal: Deal) => {
      const updated = dealsRef.current.map((d, i) => (i === index ? deal : d));
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
    resetAll,
    setDaySides,
    setDaySideSlotCount,
    addSideChipToDay,
    removeSideChipFromDay,
    setDaySideAt,
    setCategorySelections,
    setOtherNotes,
    setDayManualItems,
    setManualItems,
    addDeal,
    removeDeal,
    updateDeal,
  };
}
