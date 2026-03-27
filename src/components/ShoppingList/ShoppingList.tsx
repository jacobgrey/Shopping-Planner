import type { Meal } from "../../types/meals";
import type { WeekPlan } from "../../types/planner";
import { useShoppingList } from "../../hooks/useShoppingList";
import { STORE_CATEGORY_LABELS } from "../../data/store-categories";

interface ShoppingListProps {
  plan: WeekPlan | null;
  meals: Meal[];
}

export default function ShoppingList({ plan, meals }: ShoppingListProps) {
  const { items, sortMode, setSortMode, toggleItem, uncheckAll, totalEstimatedCost } =
    useShoppingList(plan, meals);

  if (!plan) {
    return <p className="text-gray-500">Loading...</p>;
  }

  const checkedCount = items.filter((i) => i.checked).length;

  // Group items for display
  let groups: { label: string; items: typeof items }[] = [];
  if (sortMode === "by-category") {
    const categoryMap = new Map<string, typeof items>();
    for (const item of items) {
      const label =
        STORE_CATEGORY_LABELS[item.category] || item.category;
      if (!categoryMap.has(label)) categoryMap.set(label, []);
      categoryMap.get(label)!.push(item);
    }
    groups = Array.from(categoryMap.entries()).map(([label, items]) => ({
      label,
      items,
    }));
  } else {
    const mealMap = new Map<string, typeof items>();
    for (const item of items) {
      const label = item.fromMeals.join(", ") || "Other";
      if (!mealMap.has(label)) mealMap.set(label, []);
      mealMap.get(label)!.push(item);
    }
    groups = Array.from(mealMap.entries()).map(([label, items]) => ({
      label,
      items,
    }));
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
              label="By Store"
            />
            <SortButton
              active={sortMode === "by-meal"}
              onClick={() => setSortMode("by-meal")}
              label="By Meal"
            />
          </div>
          {checkedCount > 0 && (
            <button
              onClick={uncheckAll}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Uncheck all
            </button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">No items yet</p>
          <p className="text-sm">
            Assign meals in the Planner tab to generate your shopping list.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.label}>
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
                {group.label}
              </h3>
              <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                {group.items.map((item) => (
                  <label
                    key={item.ingredientName}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition ${
                      item.checked ? "opacity-50" : ""
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
                        item.checked
                          ? "line-through text-gray-400"
                          : "text-gray-800"
                      }`}
                    >
                      {item.ingredientName}
                      {item.totalQuantity !== undefined && (
                        <span className="text-gray-500 ml-1">
                          — {item.totalQuantity} {item.unit || ""}
                        </span>
                      )}
                    </span>
                    {sortMode === "by-category" && item.fromMeals.length > 0 && (
                      <span className="text-xs text-gray-400">
                        {item.fromMeals.join(", ")}
                      </span>
                    )}
                    {item.estimatedCost !== undefined && (
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

function SortButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "bg-blue-600 text-white"
          : "bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}
