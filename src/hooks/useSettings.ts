import { useState, useEffect, useCallback } from "react";
import { getAppConfig, updateAppConfig } from "../lib/dataDirectory";

export function useSettings() {
  const [firstDayOfWeek, setFirstDayOfWeekState] = useState(0); // 0=Monday default
  const [dinnerTime, setDinnerTimeState] = useState("18:00");
  const [mealCardSize, setMealCardSizeState] = useState<"small" | "medium" | "large">("medium");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getAppConfig().then((config) => {
      if (config?.firstDayOfWeek !== undefined) {
        setFirstDayOfWeekState(config.firstDayOfWeek);
      }
      if (config?.dinnerTime !== undefined) {
        setDinnerTimeState(config.dinnerTime);
      }
      if (config?.mealCardSize !== undefined) {
        setMealCardSizeState(config.mealCardSize);
      }
      setLoaded(true);
    });
  }, []);

  const setFirstDayOfWeek = useCallback(async (day: number) => {
    setFirstDayOfWeekState(day);
    await updateAppConfig({ firstDayOfWeek: day });
  }, []);

  const setDinnerTime = useCallback(async (time: string) => {
    setDinnerTimeState(time);
    await updateAppConfig({ dinnerTime: time });
  }, []);

  const setMealCardSize = useCallback(async (size: "small" | "medium" | "large") => {
    setMealCardSizeState(size);
    await updateAppConfig({ mealCardSize: size });
  }, []);

  return { firstDayOfWeek, setFirstDayOfWeek, dinnerTime, setDinnerTime, mealCardSize, setMealCardSize, loaded };
}
