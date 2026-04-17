import { useState, useEffect, useCallback } from "react";
import { getAppConfig, updateAppConfig } from "../lib/dataDirectory";

export function useSettings() {
  const [firstDayOfWeek, setFirstDayOfWeekState] = useState(0); // 0=Monday default
  const [dinnerTime, setDinnerTimeState] = useState("18:00");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getAppConfig().then((config) => {
      if (config?.firstDayOfWeek !== undefined) {
        setFirstDayOfWeekState(config.firstDayOfWeek);
      }
      if (config?.dinnerTime !== undefined) {
        setDinnerTimeState(config.dinnerTime);
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

  return { firstDayOfWeek, setFirstDayOfWeek, dinnerTime, setDinnerTime, loaded };
}
