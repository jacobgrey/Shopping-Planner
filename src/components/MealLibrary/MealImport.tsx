import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { parseMealImportJson } from "../../lib/importValidator";
import type { MealDefinition } from "../../types/meals";

interface MealImportProps {
  onImport: (
    meals: MealDefinition[],
    mode: "skip" | "overwrite"
  ) => Promise<{ added: number; skipped: number; overwritten: number }>;
  onClose: () => void;
}

export default function MealImport({ onImport, onClose }: MealImportProps) {
  const [result, setResult] = useState<ReturnType<
    typeof parseMealImportJson
  > | null>(null);
  const [importResult, setImportResult] = useState<{
    added: number;
    skipped: number;
    overwritten: number;
  } | null>(null);
  const [duplicateMode, setDuplicateMode] = useState<"skip" | "overwrite">(
    "skip"
  );

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
    const res = await onImport(result.meals, duplicateMode);
    setImportResult(res);
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
        Import meals from a JSON file. The file should follow the{" "}
        <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">
          MealImport v1.0
        </span>{" "}
        format.
      </p>

      <button
        onClick={handleSelectFile}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 mb-4"
      >
        Select JSON File...
      </button>

      {result && (
        <div className="mt-4">
          {/* Errors */}
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

          {/* Warnings */}
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

          {/* Valid meals preview */}
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

              {!importResult && (
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <span>Duplicates:</span>
                    <select
                      value={duplicateMode}
                      onChange={(e) =>
                        setDuplicateMode(
                          e.target.value as "skip" | "overwrite"
                        )
                      }
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="skip">Skip</option>
                      <option value="overwrite">Overwrite</option>
                    </select>
                  </label>
                  <button
                    onClick={handleImport}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                  >
                    Import
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Import result */}
          {importResult && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                Import complete: {importResult.added} added
                {importResult.overwritten > 0 &&
                  `, ${importResult.overwritten} overwritten`}
                {importResult.skipped > 0 &&
                  `, ${importResult.skipped} skipped`}
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
