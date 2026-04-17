import { useState, useEffect, useRef } from "react";
import type { Meal } from "../types/meals";
import { loadMealThumbnail } from "../lib/mealImages";

/**
 * Loads meal images into a Map<mealId, dataUrl> for display.
 * Only loads images for meals that have an imageFilename set.
 * Tracks filename changes to reload when image is updated.
 */
export function useMealImages(meals: Meal[]) {
  const [images, setImages] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  // Track which mealId+filename combos we've already loaded
  const loadedRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      const toLoad = meals.filter((m) => {
        if (!m.imageFilename) return false;
        // Reload if filename changed (e.g., user uploaded a new image)
        return loadedRef.current.get(m.id) !== m.imageFilename;
      });

      // Clean up entries for deleted meals
      const mealIds = new Set(meals.map((m) => m.id));
      let cleaned = false;
      for (const id of loadedRef.current.keys()) {
        if (!mealIds.has(id)) {
          loadedRef.current.delete(id);
          cleaned = true;
        }
      }
      if (cleaned) {
        setImages((prev) => {
          const next = new Map(prev);
          for (const id of next.keys()) {
            if (!mealIds.has(id)) next.delete(id);
          }
          return next;
        });
      }

      if (toLoad.length === 0) return;
      setLoading(true);

      const newEntries: [string, string][] = [];
      for (const meal of toLoad) {
        if (cancelled) break;
        try {
          const dataUrl = await loadMealThumbnail(meal.imageFilename!);
          if (dataUrl) {
            newEntries.push([meal.id, dataUrl]);
          }
        } catch {
          // Graceful: skip failed loads
        }
        loadedRef.current.set(meal.id, meal.imageFilename!);
      }

      if (!cancelled && newEntries.length > 0) {
        setImages((prev) => {
          const next = new Map(prev);
          for (const [id, url] of newEntries) {
            next.set(id, url);
          }
          return next;
        });
      }
      if (!cancelled) setLoading(false);
    }

    loadAll();
    return () => { cancelled = true; };
  }, [meals]);

  /** Force reload a specific meal's image (after upload/fetch). */
  function reloadImage(mealId: string, filename: string) {
    loadedRef.current.delete(mealId);
    loadMealThumbnail(filename)
      .then((dataUrl) => {
        if (dataUrl) {
          setImages((prev) => {
            const next = new Map(prev);
            next.set(mealId, dataUrl);
            return next;
          });
        }
      })
      .catch(() => {
        // Graceful: image load failed silently
      });
  }

  /** Remove a meal's image from the display cache. */
  function removeImage(mealId: string) {
    loadedRef.current.delete(mealId);
    setImages((prev) => {
      const next = new Map(prev);
      next.delete(mealId);
      return next;
    });
  }

  return { images, loading, reloadImage, removeImage };
}
