import { useState, useEffect, useCallback, useRef } from "react";
import type { TagDefinition } from "../types/meals";
import { readJson, writeJson } from "../lib/storage";
import { TAG_COLOR_PALETTE } from "../data/tag-colors";

const TAGS_FILE = "tags.json";

const DEFAULT_TAGS: TagDefinition[] = [
  { id: "low-effort", label: "Low Effort", colorIndex: 0 },
  { id: "has-leftovers", label: "Has Leftovers", colorIndex: 1 },
  { id: "low-cost", label: "Low Cost", colorIndex: 2 },
  { id: "filling", label: "Filling", colorIndex: 3 },
  { id: "kid-favorite", label: "Kid Favorite", colorIndex: 4 },
  { id: "dads-favorite", label: "Dad's Favorite", colorIndex: 5 },
  { id: "healthy", label: "Healthy", colorIndex: 6 },
  { id: "comfort-food", label: "Comfort Food", colorIndex: 7 },
  { id: "quick", label: "Quick", colorIndex: 8 },
  { id: "slow-cooker", label: "Slow Cooker", colorIndex: 9 },
  { id: "grill", label: "Grill", colorIndex: 10 },
  { id: "vegetarian", label: "Vegetarian", colorIndex: 11 },
];

function slugify(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function useTags() {
  const [tags, setTags] = useState<TagDefinition[]>([]);
  const [loaded, setLoaded] = useState(false);
  const tagsRef = useRef<TagDefinition[]>([]);

  useEffect(() => {
    tagsRef.current = tags;
  }, [tags]);

  useEffect(() => {
    loadTags();
  }, []);

  async function loadTags() {
    const data = await readJson<TagDefinition[]>(TAGS_FILE);
    const list = data || DEFAULT_TAGS;
    if (!data) await writeJson(TAGS_FILE, DEFAULT_TAGS);
    setTags(list);
    tagsRef.current = list;
    setLoaded(true);
  }

  const saveTags = useCallback(async (updated: TagDefinition[]) => {
    tagsRef.current = updated;
    setTags(updated);
    await writeJson(TAGS_FILE, updated);
  }, []);

  const addTag = useCallback(
    async (label: string): Promise<TagDefinition> => {
      const id = slugify(label);
      const tag: TagDefinition = {
        id,
        label: label.trim(),
        colorIndex: tagsRef.current.length % TAG_COLOR_PALETTE.length,
      };
      await saveTags([...tagsRef.current, tag]);
      return tag;
    },
    [saveTags]
  );

  const removeTag = useCallback(
    async (id: string) => {
      await saveTags(tagsRef.current.filter((t) => t.id !== id));
    },
    [saveTags]
  );

  const updateTag = useCallback(
    async (id: string, updates: Partial<Omit<TagDefinition, "id">>) => {
      await saveTags(
        tagsRef.current.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
    },
    [saveTags]
  );

  const renameTag = useCallback(
    async (oldId: string, newLabel: string): Promise<string> => {
      const newId = slugify(newLabel);
      await saveTags(
        tagsRef.current.map((t) =>
          t.id === oldId ? { ...t, id: newId, label: newLabel.trim() } : t
        )
      );
      return newId;
    },
    [saveTags]
  );

  return { tags, loaded, addTag, removeTag, updateTag, renameTag };
}
