import type { Meal, Side, MasterIngredient, CategoryItem } from "../../types/meals";
import type { WeekPlan } from "../../types/planner";
import type { ShoppingItem } from "../../types/shopping";
import { useShoppingList } from "../../hooks/useShoppingList";
import { STORE_CATEGORY_LABELS } from "../../data/store-categories";
import { getAppConfig, updateAppConfig } from "../../lib/dataDirectory";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-dialog";
import { join } from "@tauri-apps/api/path";
import { exists, mkdir } from "@tauri-apps/plugin-fs";
import { useState } from "react";
import { CARD_BORDER } from "../../lib/theme";

interface ShoppingListProps {
  plan: WeekPlan | null;
  meals: Meal[];
  sides: Side[];
  masterIngredients: MasterIngredient[];
  categoryItems: CategoryItem[];
}

function formatShoppingListText(groups: { label: string; items: ShoppingItem[] }[]): string {
  const date = new Date().toISOString().slice(0, 10);
  const lines: string[] = [`Shopping List - ${date}`, ""];
  for (const group of groups) {
    const checkedItems = group.items.filter((i) => i.checked);
    if (checkedItems.length === 0) continue;
    lines.push(group.label.toUpperCase());
    for (const item of checkedItems) {
      let detail = `  ${item.ingredientName}`;
      if (item.totalQuantity != null) {
        detail += `  (${item.totalQuantity}${item.unit ? " " + item.unit : ""})`;
      }
      lines.push(detail);
    }
    lines.push("");
  }
  return lines.join("\n");
}

async function handleExport(
  groups: { label: string; items: ShoppingItem[] }[],
  setStatus: (s: string | null) => void
) {
  try {
    const config = await getAppConfig();
    let exportDir = config?.exportDirectory;

    if (!exportDir) {
      // Prompt user to pick a default export directory
      const chosen = await open({
        directory: true,
        title: "Choose a default folder for shopping list exports",
      });
      if (typeof chosen !== "string") return;
      exportDir = chosen;
      await updateAppConfig({ exportDirectory: exportDir });
    }

    if (!(await exists(exportDir))) {
      await mkdir(exportDir, { recursive: true });
    }

    const date = new Date().toISOString().slice(0, 10);
    const filename = `shopping-list-${date}.txt`;
    const filePath = await join(exportDir, filename);
    const content = formatShoppingListText(groups);
    await writeTextFile(filePath, content);
    setStatus(`Exported to ${filePath}`);
  } catch (e) {
    setStatus(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export default function ShoppingList({ plan, meals, sides, masterIngredients, categoryItems }: ShoppingListProps) {
  const { items, sortMode, setSortMode, toggleItem, checkAll, totalEstimatedCost } =
    useShoppingList(plan, meals, sides, masterIngredients, categoryItems);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  if (!plan) {
    return <p className="text-gray-500">Loading...</p>;
  }

  const checkedCount = items.filter((i) => i.checked).length;
  const uncheckedCount = items.length - checkedCount;

  let groups: { label: string; items: typeof items }[] = [];
  if (sortMode === "by-category") {
    const categoryMap = new Map<string, typeof items>();
    for (const item of items) {
      const label = STORE_CATEGORY_LABELS[item.category] || item.category;
      if (!categoryMap.has(label)) categoryMap.set(label, []);
      categoryMap.get(label)!.push(item);
    }
    groups = Array.from(categoryMap.entries()).map(([label, items]) => ({ label, items }));
  } else {
    const mealMap = new Map<string, typeof items>();
    for (const item of items) {
      const label = item.fromMeals.join(", ") || "Other";
      if (!mealMap.has(label)) mealMap.set(label, []);
      mealMap.get(label)!.push(item);
    }
    groups = Array.from(mealMap.entries()).map(([label, items]) => ({ label, items }));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Shopping List</h2>
          <p className="text-sm text-gray-500">
            {items.length} items · {checkedCount} checked
          </p>
        </div>
        <div className="flex items-center gap-3">
          {totalEstimatedCost !== null && (
            <div className="text-sm font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
              Est. ${totalEstimatedCost.toFixed(2)}
            </div>
          )}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <SortButton
              active={sortMode === "by-category"}
              onClick={() => setSortMode("by-category")}
              label="By Dept"
            />
            <SortButton
              active={sortMode === "by-meal"}
              onClick={() => setSortMode("by-meal")}
              label="By Meal"
            />
          </div>
          {uncheckedCount > 0 && (
            <button onClick={checkAll} className="text-sm text-gray-500 hover:text-gray-700">
              Check all
            </button>
          )}
          {items.length > 0 && (
            <button
              onClick={() => handleExport(groups, setExportStatus)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Export
            </button>
          )}
        </div>
      </div>

      {exportStatus && (
        <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700 flex items-center justify-between">
          {exportStatus}
          <button onClick={() => setExportStatus(null)} className="text-blue-500 hover:text-blue-700 ml-2">
            Dismiss
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">No items yet</p>
          <p className="text-sm">Assign meals in the Planner tab to generate your shopping list.</p>
        </div>
      ) : (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-4">
          {groups.map((group) => (
            <div key={group.label} className={`break-inside-avoid bg-white rounded-lg border ${CARD_BORDER} overflow-hidden mb-4`}>
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide px-4 py-2 bg-gray-100 border-b border-gray-200">
                {group.label}
              </h3>
              <div className="divide-y divide-gray-100">
                {group.items.map((item) => (
                  <label
                    key={item.ingredientName}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition ${
                      !item.checked ? "opacity-50" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleItem(item.ingredientName)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span
                      className={`flex-1 text-sm ${
                        !item.checked ? "line-through text-gray-400" : "text-gray-800"
                      }`}
                    >
                      {item.ingredientName}
                    </span>
                    {/* Quantity */}
                    <span className="text-xs text-gray-500">
                      {item.totalQuantity != null
                        ? `${item.totalQuantity} ${item.unit || ""}`
                        : ""}
                    </span>
                    {sortMode === "by-category" && item.fromMeals.length > 0 && (
                      <span className="text-xs text-gray-400 max-w-48 truncate">
                        {item.fromMeals.join(", ")}
                      </span>
                    )}
                    {item.estimatedCost != null && (
                      <span className="text-xs text-green-600">
                        ${item.estimatedCost.toFixed(2)}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SortButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium transition ${
        active ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}
