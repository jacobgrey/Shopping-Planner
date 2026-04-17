import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { parseMealImportJson } from "../../lib/importValidator";
import type {
  MealDefinition,
  MasterIngredient,
  TagDefinition,
  IngredientEntry,
  Side,
  SideDefinition,
} from "../../types/meals";

interface MealImportProps {
  ingredientLib: {
    addIngredientsBatch: (defs: Omit<MasterIngredient, "id">[]) => Promise<MasterIngredient[]>;
    findByName: (name: string) => MasterIngredient | undefined;
  };
  tagLib: {
    addTagsBatch: (entries: { slug: string; label: string }[]) => Promise<TagDefinition[]>;
  };
  sidesLib: {
    sides: Side[];
    addSide: (def: SideDefinition) => Promise<Side>;
  };
  onImport: (
    meals: MealDefinition[],
    mode: "merge" | "replace"
  ) => Promise<{ added: number; skipped: number; replaced: number }>;
  onClose: () => void;
}

export default function MealImport({
  ingredientLib,
  tagLib,
  sidesLib,
  onImport,
  onClose,
}: MealImportProps) {
  const [result, setResult] = useState<ReturnType<typeof parseMealImportJson> | null>(null);
  const [importResult, setImportResult] = useState<{
    added: number;
    skipped: number;
    replaced: number;
    ingredientsCreated: number;
    tagsCreated: number;
  } | null>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  async function handleSelectFile() {
    const selected = await open({
      title: "Select meal import file",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (typeof selected === "string") {
      const content = await readTextFile(selected);
      const validation = parseMealImportJson(content);
      setResult(validation);
      setImportResult(null);
      setImportError(null);
    }
  }

  async function handleImport() {
    if (!result || result.meals.length === 0) return;
    setImporting(true);
    setImportError(null);

    try {
      // Step 1: Collect all unique ingredient definitions from the import file
      // (addIngredientsBatch deduplicates against existing master list internally via ref)
      const seenIngNames = new Set<string>();
      const ingDefs: Omit<MasterIngredient, "id">[] = [];

      const seenTagSlugs = new Set<string>();
      const tagEntries: { slug: string; label: string }[] = [];

      for (const meal of result.meals) {
        for (const imp of meal.ingredients) {
          const key = imp.name.toLowerCase().trim();
          if (!seenIngNames.has(key)) {
            seenIngNames.add(key);
            ingDefs.push({
              name: imp.name,
              category: imp.category,
              defaultUnit: imp.unit || "each",
              pricePerUnit:
                imp.priceEstimate != null && imp.quantity
                  ? imp.priceEstimate / imp.quantity
                  : imp.priceEstimate,
            });
          }
        }
        for (const tagSlug of meal.tags) {
          if (!seenTagSlugs.has(tagSlug)) {
            seenTagSlugs.add(tagSlug);
            const label = tagSlug
              .replace(/-/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase());
            tagEntries.push({ slug: tagSlug, label });
          }
        }
      }

      // Step 2: Create missing ingredients via ref-based batch (single file write)
      const createdIngs = await ingredientLib.addIngredientsBatch(ingDefs);

      // Step 3: Create missing tags via ref-based batch (single file write)
      const createdTags = await tagLib.addTagsBatch(tagEntries);

      // Step 3.5: Resolve/create Side entries for each legacy side-name string,
      // keeping track of their IDs so we can populate preferredSideIds below.
      const sideIdByName = new Map<string, string>();
      for (const existing of sidesLib.sides) {
        sideIdByName.set(existing.name.trim().toLowerCase(), existing.id);
      }
      for (const importMeal of result.meals) {
        if (!importMeal.sides) continue;
        for (const rawName of importMeal.sides) {
          const trimmed = rawName.trim();
          if (!trimmed) continue;
          const key = trimmed.toLowerCase();
          if (sideIdByName.has(key)) continue;
          const side = await sidesLib.addSide({
            name: trimmed,
            ingredients: [],
            tags: [],
          });
          sideIdByName.set(key, side.id);
        }
      }

      // Step 4: Convert import meals to internal format
      // findByName reads from ingredientsRef.current (updated in step 2), so lookups are fresh
      const convertedMeals: MealDefinition[] = [];
      for (const importMeal of result.meals) {
        const ingredients: IngredientEntry[] = [];
        for (const imp of importMeal.ingredients) {
          const master = ingredientLib.findByName(imp.name);
          if (master) {
            ingredients.push({
              ingredientId: master.id,
              quantity: imp.quantity,
            });
          }
        }
        const preferredSideIds: string[] = [];
        for (const rawName of importMeal.sides ?? []) {
          const key = rawName.trim().toLowerCase();
          const id = sideIdByName.get(key);
          if (id) preferredSideIds.push(id);
        }
        convertedMeals.push({
          name: importMeal.name,
          preferredSideIds: preferredSideIds.length > 0 ? preferredSideIds : undefined,
          ingredients,
          tags: importMeal.tags,
          prepTimeHours: importMeal.prepTimeHours,
          startTimeHours: importMeal.startTimeHours,
          recipeUrl: importMeal.recipeUrl,
          notes: importMeal.notes,
        });
      }

      // Step 5: Save meals
      const res = await onImport(convertedMeals, importMode);
      setImportResult({
        ...res,
        ingredientsCreated: createdIngs.length,
        tagsCreated: Array.isArray(createdTags) ? createdTags.length : 0,
      });
    } catch (e) {
      setImportError(
        `Import failed: ${e instanceof Error ? e.message : String(e)}`
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Import Meals</h2>
        <button
          onClick={onClose}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Back to Library
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Import meals from a JSON file. Ingredients and tags will be
        automatically added to the master lists.
      </p>

      <button
        onClick={handleSelectFile}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 mb-4"
      >
        Select JSON File...
      </button>

      {result && (
        <div className="mt-4">
          {result.errors.length > 0 && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-700 mb-1">Errors:</p>
              <ul className="text-sm text-red-600 list-disc list-inside">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {result.warnings.length > 0 && (
            <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-medium text-yellow-700 mb-1">
                Warnings:
              </p>
              <ul className="text-sm text-yellow-600 list-disc list-inside">
                {result.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          {result.meals.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-2">
                <span className="font-medium">{result.meals.length}</span>{" "}
                meal(s) ready to import:
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside mb-4 max-h-48 overflow-y-auto">
                {result.meals.map((meal, i) => (
                  <li key={i}>
                    {meal.name}{" "}
                    <span className="text-gray-400">
                      ({meal.ingredients.length} ingredients)
                    </span>
                  </li>
                ))}
              </ul>

              {!importResult && !importError && (
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <span>Mode:</span>
                    <select
                      value={importMode}
                      onChange={(e) =>
                        setImportMode(
                          e.target.value as "merge" | "replace"
                        )
                      }
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="merge">
                        Merge (add new, skip existing)
                      </option>
                      <option value="replace">
                        Replace (clear all meals first)
                      </option>
                    </select>
                  </label>
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {importing ? "Importing..." : "Import"}
                  </button>
                </div>
              )}
            </div>
          )}

          {importError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
              <p className="text-sm text-red-700">{importError}</p>
            </div>
          )}

          {importResult && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                Import complete: {importResult.added} meals added
                {importResult.replaced > 0 &&
                  ` (replaced ${importResult.replaced} existing)`}
                {importResult.skipped > 0 &&
                  `, ${importResult.skipped} skipped`}
                . {importResult.ingredientsCreated} new ingredients added.
                {importResult.tagsCreated > 0 &&
                  ` ${importResult.tagsCreated} new tags created.`}
              </p>
              <button
                onClick={onClose}
                className="mt-2 text-sm text-green-700 underline hover:text-green-800"
              >
                Back to Library
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
