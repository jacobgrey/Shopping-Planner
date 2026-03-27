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
    try {
      const data = await readJson<TagDefinition[]>(TAGS_FILE);
      const list = Array.isArray(data) ? data.filter((t) => t && typeof t.id === "string") : null;
      if (list && list.length > 0) {
        setTags(list);
        tagsRef.current = list;
      } else {
        await writeJson(TAGS_FILE, DEFAULT_TAGS);
        setTags(DEFAULT_TAGS);
        tagsRef.current = DEFAULT_TAGS;
      }
    } catch (e) {
      console.error("Failed to load tags:", e);
      setTags(DEFAULT_TAGS);
      tagsRef.current = DEFAULT_TAGS;
    }
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

  /** Batch-add multiple tags at once (single file write). Returns all created tags. */
  const addTagsBatch = useCallback(
    async (entries: { slug: string; label: string }[]): Promise<TagDefinition[]> => {
      const existing = new Set(tagsRef.current.map((t) => t.id));
      const newTags: TagDefinition[] = [];
      for (const { slug, label } of entries) {
        // Use the slug directly as ID (already normalized by caller/validator)
        if (existing.has(slug)) continue;
        existing.add(slug);
        newTags.push({
          id: slug,
          label: label.trim(),
          colorIndex: (tagsRef.current.length + newTags.length) % TAG_COLOR_PALETTE.length,
        });
      }
      if (newTags.length > 0) {
        await saveTags([...tagsRef.current, ...newTags]);
      }
      return newTags;
    },
    [saveTags]
  );

  return { tags, loaded, reload: loadTags, saveTags, addTag, addTagsBatch, removeTag, updateTag, renameTag };
}
