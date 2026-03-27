import { useState } from "react";
import { setDataDirectory, promptForDataDirectory, ensureDataDirectory } from "../../lib/dataDirectory";
import { getStorageDirectory, setStorageDirectory } from "../../lib/storage";
import { exportAllData, importAllData, validateBulkData } from "../../lib/bulkExportImport";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { useTags } from "../../hooks/useTags";
import { useIngredients } from "../../hooks/useIngredients";
import type { StoreCategory } from "../../types/meals";
import { STORE_CATEGORIES } from "../../types/meals";
import { TAG_COLOR_PALETTE } from "../../data/tag-colors";
import { DAY_NAMES } from "../../types/planner";

// Maps internal dayOfWeek (0=Mon..6=Sun) to display label
const DAY_NAME_OPTIONS: [number, string][] = DAY_NAMES.map((name, i) => [i, name]);

interface SettingsProps {
  firstDayOfWeek: number;
  setFirstDayOfWeek: (day: number) => void;
}

export default function Settings({ firstDayOfWeek, setFirstDayOfWeek }: SettingsProps) {
  const [currentDir] = useState(getStorageDirectory() || "");
  const [status, setStatus] = useState<string | null>(null);
  const { tags, addTag, removeTag } = useTags();
  const { ingredients, addIngredient, updateIngredient, deleteIngredient } = useIngredients();
  const [newTagLabel, setNewTagLabel] = useState("");
  const [showIngredients, setShowIngredients] = useState(false);

  async function handleChangeDirectory() {
    const chosen = await promptForDataDirectory();
    if (chosen) {
      await ensureDataDirectory(chosen);
      await setDataDirectory(chosen);
      setStorageDirectory(chosen);
      setStatus("Data directory changed. Restart recommended to reload data.");
    }
  }

  async function handleExport() {
    const savePath = await save({
      title: "Export all data",
      defaultPath: "meal-planner-backup.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!savePath) return;
    try {
      const data = await exportAllData();
      await writeTextFile(savePath, JSON.stringify(data, null, 2));
      setStatus(`Data exported to ${savePath}`);
    } catch (e) {
      setStatus(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleImport(mode: "replace" | "merge") {
    const selected = await open({
      title: "Import data backup",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (typeof selected !== "string") return;
    try {
      const content = await readTextFile(selected);
      const data = JSON.parse(content);
      if (!validateBulkData(data)) {
        setStatus("Invalid backup file format.");
        return;
      }
      const result = await importAllData(data, mode);
      setStatus(
        mode === "replace"
          ? `Replaced all data. ${result.mealsCount} meals loaded. Restart recommended.`
          : `Merged ${result.mealsCount} new meals. Restart recommended.`
      );
    } catch (e) {
      setStatus(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleAddTag() {
    if (!newTagLabel.trim()) return;
    await addTag(newTagLabel);
    setNewTagLabel("");
  }

  return (
    <div className="max-w-3xl space-y-8">
      <h2 className="text-xl font-bold text-gray-800">Settings</h2>

      {/* Data directory */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Data Directory</h3>
        <div className="flex items-center gap-3">
          <code className="flex-1 text-xs bg-gray-100 px-3 py-2 rounded border border-gray-200 text-gray-700 overflow-hidden text-ellipsis">
            {currentDir}
          </code>
          <button
            onClick={handleChangeDirectory}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Change...
          </button>
        </div>
      </section>

      {/* First Day of Week */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">First Day of Week</h3>
        <p className="text-xs text-gray-500 mb-2">Choose the day your weekly plan starts (e.g. the day you shop).</p>
        <select
          value={firstDayOfWeek}
          onChange={(e) => setFirstDayOfWeek(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {DAY_NAME_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </section>

      {/* Export/Import */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Data Export & Import</h3>
        <div className="flex gap-2">
          <button onClick={handleExport} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            Export All Data
          </button>
          <button onClick={() => handleImport("merge")} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Import (Merge)
          </button>
          <button onClick={() => handleImport("replace")} className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50">
            Import (Replace All)
          </button>
        </div>
      </section>

      {/* Tag Management */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Manage Tags</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                TAG_COLOR_PALETTE[tag.colorIndex % TAG_COLOR_PALETTE.length]
              }`}
            >
              {tag.label}
              <button
                onClick={() => removeTag(tag.id)}
                className="ml-0.5 hover:opacity-70"
                title="Remove tag"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTagLabel}
            onChange={(e) => setNewTagLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
            placeholder="New tag name..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddTag}
            disabled={!newTagLabel.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Add Tag
          </button>
        </div>
      </section>

      {/* Master Ingredient List */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">
            Master Ingredient List ({ingredients.length})
          </h3>
          <button
            onClick={() => setShowIngredients(!showIngredients)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {showIngredients ? "Hide" : "Show"}
          </button>
        </div>
        {showIngredients && (
          <div>
            <div className="overflow-auto max-h-96 border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Name</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Category</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Unit</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">$/Unit</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ingredients.map((ing) => (
                    <tr key={ing.id} className="hover:bg-gray-50">
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={ing.name}
                          onChange={(e) => updateIngredient(ing.id, { name: e.target.value })}
                          className="w-full px-1 py-0.5 border border-transparent hover:border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <select
                          value={ing.category}
                          onChange={(e) => updateIngredient(ing.id, { category: e.target.value as StoreCategory })}
                          className="px-1 py-0.5 border border-transparent hover:border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                        >
                          {STORE_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat.replace(/-/g, " ")}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={ing.defaultUnit}
                          onChange={(e) => updateIngredient(ing.id, { defaultUnit: e.target.value })}
                          className="w-16 px-1 py-0.5 border border-transparent hover:border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          value={ing.pricePerUnit ?? ""}
                          onChange={(e) =>
                            updateIngredient(ing.id, {
                              pricePerUnit: e.target.value ? parseFloat(e.target.value) : undefined,
                            })
                          }
                          step="0.01"
                          min={0}
                          className="w-20 px-1 py-0.5 border border-transparent hover:border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <button
                          onClick={() => deleteIngredient(ing.id)}
                          className="text-red-400 hover:text-red-600"
                        >
                          &times;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AddIngredientRow onAdd={addIngredient} />
          </div>
        )}
      </section>

      {/* Status */}
      {status && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          {status}
          <button onClick={() => setStatus(null)} className="ml-2 text-blue-500 hover:text-blue-700">
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

function AddIngredientRow({
  onAdd,
}: {
  onAdd: (def: { name: string; category: StoreCategory; defaultUnit: string; pricePerUnit?: number }) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<StoreCategory>("other");
  const [unit, setUnit] = useState("");
  const [price, setPrice] = useState("");

  function handleAdd() {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      category,
      defaultUnit: unit.trim() || "each",
      pricePerUnit: price ? parseFloat(price) : undefined,
    });
    setName("");
    setCategory("other");
    setUnit("");
    setPrice("");
  }

  return (
    <div className="flex gap-2 mt-2 items-center">
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="New ingredient..." className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm" />
      <select value={category} onChange={(e) => setCategory(e.target.value as StoreCategory)} className="px-2 py-1.5 border border-gray-300 rounded text-xs">
        {STORE_CATEGORIES.map((cat) => (
          <option key={cat} value={cat}>{cat.replace(/-/g, " ")}</option>
        ))}
      </select>
      <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit" className="w-16 px-2 py-1.5 border border-gray-300 rounded text-sm" />
      <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$/unit" step="0.01" min={0} className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm" />
      <button onClick={handleAdd} disabled={!name.trim()} className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50">
        Add
      </button>
    </div>
  );
}
