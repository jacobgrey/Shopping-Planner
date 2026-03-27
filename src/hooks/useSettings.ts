import { useState, useEffect, useCallback } from "react";
import { getAppConfig, updateAppConfig } from "../lib/dataDirectory";

export function useSettings() {
  const [firstDayOfWeek, setFirstDayOfWeekState] = useState(0); // 0=Monday default
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getAppConfig().then((config) => {
      if (config?.firstDayOfWeek !== undefined) {
        setFirstDayOfWeekState(config.firstDayOfWeek);
      }
      setLoaded(true);
    });
  }, []);

  const setFirstDayOfWeek = useCallback(async (day: number) => {
    setFirstDayOfWeekState(day);
    await updateAppConfig({ firstDayOfWeek: day });
  }, []);

  return { firstDayOfWeek, setFirstDayOfWeek, loaded };
}
