import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { parseMealImportJson } from "../../lib/importValidator";
import type { MealDefinition, MasterIngredient, IngredientEntry } from "../../types/meals";

interface MealImportProps {
  onAddMasterIngredient: (def: Omit<MasterIngredient, "id">) => Promise<MasterIngredient>;
  findIngredientByName: (name: string) => MasterIngredient | undefined;
  existingTags: { id: string; label: string }[];
  onAddTag: (label: string) => Promise<{ id: string }>;
  onImport: (
    meals: MealDefinition[],
    mode: "skip" | "overwrite"
  ) => Promise<{ added: number; skipped: number; overwritten: number }>;
  onClose: () => void;
}

export default function MealImport({
  onAddMasterIngredient,
  findIngredientByName,
  existingTags,
  onAddTag,
  onImport,
  onClose,
}: MealImportProps) {
  const [result, setResult] = useState<ReturnType<typeof parseMealImportJson> | null>(null);
  const [importResult, setImportResult] = useState<{
    added: number;
    skipped: number;
    overwritten: number;
    ingredientsCreated: number;
    tagsCreated: number;
  } | null>(null);
  const [duplicateMode, setDuplicateMode] = useState<"skip" | "overwrite">("skip");
  const [importing, setImporting] = useState(false);

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
    }
  }

  async function handleImport() {
    if (!result || result.meals.length === 0) return;
    setImporting(true);

    // Convert ImportMealDefinition[] → MealDefinition[] by creating/finding master ingredients
    let ingredientsCreated = 0;
    let tagsCreated = 0;
    const convertedMeals: MealDefinition[] = [];

    // Track known tag IDs (existing + newly created during this import)
    const knownTagIds = new Set(existingTags.map((t) => t.id));

    for (const importMeal of result.meals) {
      const ingredients: IngredientEntry[] = [];
      for (const imp of importMeal.ingredients) {
        let master = findIngredientByName(imp.name);
        if (!master) {
          master = await onAddMasterIngredient({
            name: imp.name,
            category: imp.category,
            defaultUnit: imp.unit || "each",
            pricePerUnit: imp.priceEstimate != null && imp.quantity
              ? imp.priceEstimate / imp.quantity
              : imp.priceEstimate,
          });
          ingredientsCreated++;
        }
        ingredients.push({
          ingredientId: master.id,
          quantity: imp.quantity,
        });
      }

      // Create missing tags
      const resolvedTags: string[] = [];
      for (const tagSlug of importMeal.tags) {
        if (!knownTagIds.has(tagSlug)) {
          // Create tag using slug as label (convert dashes to spaces, title case)
          const label = tagSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          const created = await onAddTag(label);
          knownTagIds.add(created.id);
          tagsCreated++;
          resolvedTags.push(created.id);
        } else {
          resolvedTags.push(tagSlug);
        }
      }

      convertedMeals.push({
        name: importMeal.name,
        sides: importMeal.sides,
        ingredients,
        tags: resolvedTags,
        prepTimeMinutes: importMeal.prepTimeMinutes,
        notes: importMeal.notes,
      });
    }

    const res = await onImport(convertedMeals, duplicateMode);
    setImportResult({ ...res, ingredientsCreated, tagsCreated });
    setImporting(false);
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Import Meals</h2>
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">
          Back to Library
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Import meals from a JSON file. Ingredients will be automatically added to
        the master ingredient list.
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
              <p className="text-sm font-medium text-yellow-700 mb-1">Warnings:</p>
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
                <span className="font-medium">{result.meals.length}</span> meal(s) ready to import:
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside mb-4 max-h-48 overflow-y-auto">
                {result.meals.map((meal, i) => (
                  <li key={i}>
                    {meal.name}{" "}
                    <span className="text-gray-400">({meal.ingredients.length} ingredients)</span>
                  </li>
                ))}
              </ul>

              {!importResult && (
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <span>Duplicates:</span>
                    <select
                      value={duplicateMode}
                      onChange={(e) => setDuplicateMode(e.target.value as "skip" | "overwrite")}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="skip">Skip</option>
                      <option value="overwrite">Overwrite</option>
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

          {importResult && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                Import complete: {importResult.added} meals added
                {importResult.overwritten > 0 && `, ${importResult.overwritten} overwritten`}
                {importResult.skipped > 0 && `, ${importResult.skipped} skipped`}
                . {importResult.ingredientsCreated} new ingredients added to master list.
                {importResult.tagsCreated > 0 && ` ${importResult.tagsCreated} new tags created.`}
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
