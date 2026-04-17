import { useState, useEffect, useCallback, useRef } from "react";
import type { Side, SideDefinition } from "../types/meals";
import { readJson, writeJson } from "../lib/storage";

const SIDES_FILE = "sides.json";

export function useSidesLibrary() {
  const [sides, setSides] = useState<Side[]>([]);
  const [loaded, setLoaded] = useState(false);
  const sidesRef = useRef<Side[]>([]);

  useEffect(() => {
    sidesRef.current = sides;
  }, [sides]);

  useEffect(() => {
    loadSides();
  }, []);

  async function loadSides() {
    try {
      const data = await readJson<Side[]>(SIDES_FILE);
      const list = Array.isArray(data) ? data.filter((s) => s && typeof s.name === "string") : [];
      setSides(list);
      sidesRef.current = list;
    } catch (e) {
      console.error("Failed to load sides:", e);
      setSides([]);
      sidesRef.current = [];
    }
    setLoaded(true);
  }

  const saveSides = useCallback(async (updated: Side[]) => {
    sidesRef.current = updated;
    setSides(updated);
    await writeJson(SIDES_FILE, updated);
  }, []);

  const addSide = useCallback(
    async (def: SideDefinition): Promise<Side> => {
      const side: Side = {
        ...def,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      await saveSides([...sidesRef.current, side]);
      return side;
    },
    [saveSides]
  );

  const updateSide = useCallback(
    async (id: string, def: Partial<SideDefinition>) => {
      await saveSides(sidesRef.current.map((s) => (s.id === id ? { ...s, ...def } : s)));
    },
    [saveSides]
  );

  const deleteSide = useCallback(
    async (id: string) => {
      await saveSides(sidesRef.current.filter((s) => s.id !== id));
    },
    [saveSides]
  );

  const importSides = useCallback(
    async (
      defs: SideDefinition[],
      mode: "merge" | "replace"
    ): Promise<{ added: number; skipped: number; replaced: number }> => {
      let added = 0;
      let skipped = 0;

      if (mode === "replace") {
        const newSides = defs.map((def) => ({
          ...def,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        }));
        await saveSides(newSides);
        return { added: newSides.length, skipped: 0, replaced: sidesRef.current.length };
      }

      const updated = [...sidesRef.current];
      for (const def of defs) {
        const existingIdx = updated.findIndex(
          (s) => s.name.toLowerCase() === def.name.toLowerCase()
        );
        if (existingIdx >= 0) {
          skipped++;
        } else {
          updated.push({
            ...def,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
          });
          added++;
        }
      }

      await saveSides(updated);
      return { added, skipped, replaced: 0 };
    },
    [saveSides]
  );

  return {
    sides,
    loaded,
    reload: loadSides,
    addSide,
    updateSide,
    deleteSide,
    importSides,
    saveSides,
  };
}
