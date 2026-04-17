import { useState } from "react";
import type { CategoryItem, StoreCategory } from "../../types/meals";
import { STORE_CATEGORIES } from "../../types/meals";
import type { ManualItem } from "../../types/planner";
import ManualItemChips from "../common/ManualItemChips";

interface CategoryPlannerProps {
  breakfastItems: CategoryItem[];
  lunchItems: CategoryItem[];
  snackItems: CategoryItem[];
  otherItems: CategoryItem[];
  breakfastSelections: string[];
  lunchSelections: string[];
  snackSelections: string[];
  otherSelections: string[];
  manualItems: ManualItem[];
  onBreakfastChange: (ids: string[]) => void;
  onLunchChange: (ids: string[]) => void;
  onSnackChange: (ids: string[]) => void;
  onOtherChange: (ids: string[]) => void;
  onManualItemsChange: (items: ManualItem[]) => void;
  onAddItem: (def: Omit<CategoryItem, "id">) => Promise<CategoryItem>;
  onUpdateItem: (id: string, updates: Partial<Omit<CategoryItem, "id">>) => void;
  onDeleteItem: (id: string) => void;
}

function CategorySection({
  title,
  itemType,
  items,
  selected,
  onChange,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}: {
  title: string;
  itemType: CategoryItem["itemType"];
  items: CategoryItem[];
  selected: string[];
  onChange: (ids: string[]) => void;
  onAddItem: (def: Omit<CategoryItem, "id">) => Promise<CategoryItem>;
  onUpdateItem: (id: string, updates: Partial<Omit<CategoryItem, "id">>) => void;
  onDeleteItem: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newCategory, setNewCategory] = useState<StoreCategory>("other");

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    await onAddItem({
      name: newName.trim(),
      category: newCategory,
      itemType,
      quantity: newQty ? parseFloat(newQty) : undefined,
      unit: newUnit.trim() || undefined,
    });
    setNewName("");
    setNewQty("");
    setNewUnit("");
    setNewCategory("other");
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <button
          onClick={() => setEditing(!editing)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      {editing ? (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex gap-2 items-center text-sm">
              <input
                type="text"
                value={item.name}
                onChange={(e) => onUpdateItem(item.id, { name: e.target.value })}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <input
                type="number"
                value={item.quantity ?? ""}
                onChange={(e) =>
                  onUpdateItem(item.id, {
                    quantity: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                placeholder="Qty"
                min={0}
                step="any"
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <input
                type="text"
                value={item.unit ?? ""}
                onChange={(e) =>
                  onUpdateItem(item.id, { unit: e.target.value || undefined })
                }
                placeholder="Unit"
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <select
                value={item.category}
                onChange={(e) =>
                  onUpdateItem(item.id, { category: e.target.value as StoreCategory })
                }
                className="w-28 px-1 py-1 border border-gray-300 rounded text-xs"
              >
                {STORE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat.replace(/-/g, " ")}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  onDeleteItem(item.id);
                  onChange(selected.filter((s) => s !== item.id));
                }}
                className="text-red-400 hover:text-red-600 text-lg"
              >
                &times;
              </button>
            </div>
          ))}
          <div className="flex gap-2 items-center pt-2 border-t border-gray-100">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New item..."
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <input
              type="number"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              placeholder="Qty"
              min={0}
              step="any"
              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <input
              type="text"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              placeholder="Unit"
              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as StoreCategory)}
              className="w-28 px-1 py-1 border border-gray-300 rounded text-xs"
            >
              {STORE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat.replace(/-/g, " ")}</option>
              ))}
            </select>
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => {
            const isSelected = selected.includes(item.id);
            const displayQty = item.quantity ?? 1;
            const displayUnit = item.unit || "unit";
            return (
              <div
                key={item.id}
                onClick={() => toggle(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer select-none transition ${
                  isSelected
                    ? "border-blue-400 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] shrink-0 ${
                    isSelected
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "border-gray-300"
                  }`}
                >
                  {isSelected && "✓"}
                </span>
                {item.name}
                {isSelected ? (
                  <span className="inline-flex items-center gap-0.5 text-xs opacity-70">
                    <input
                      type="number"
                      value={displayQty}
                      onChange={(e) =>
                        onUpdateItem(item.id, {
                          quantity: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      min={0}
                      step="any"
                      className="w-10 px-1 py-0 bg-white/80 border border-blue-300 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    {displayUnit}
                  </span>
                ) : (
                  <span className="text-xs opacity-60">{displayQty} {displayUnit}</span>
                )}
              </div>
            );
          })}
          {items.length === 0 && (
            <p className="text-xs text-gray-400">No items. Click Edit to add some.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function CategoryPlanner({
  breakfastItems,
  lunchItems,
  snackItems,
  otherItems,
  breakfastSelections,
  lunchSelections,
  snackSelections,
  otherSelections,
  manualItems,
  onBreakfastChange,
  onLunchChange,
  onSnackChange,
  onOtherChange,
  onManualItemsChange,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}: CategoryPlannerProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CategorySection
          title="Breakfast Items"
          itemType="breakfast"
          items={breakfastItems}
          selected={breakfastSelections}
          onChange={onBreakfastChange}
          onAddItem={onAddItem}
          onUpdateItem={onUpdateItem}
          onDeleteItem={onDeleteItem}
        />
        <CategorySection
          title="Lunch Items"
          itemType="lunch"
          items={lunchItems}
          selected={lunchSelections}
          onChange={onLunchChange}
          onAddItem={onAddItem}
          onUpdateItem={onUpdateItem}
          onDeleteItem={onDeleteItem}
        />
        <CategorySection
          title="Snacks"
          itemType="snack"
          items={snackItems}
          selected={snackSelections}
          onChange={onSnackChange}
          onAddItem={onAddItem}
          onUpdateItem={onUpdateItem}
          onDeleteItem={onDeleteItem}
        />
      </div>
      <CategorySection
        title="Other"
        itemType="other"
        items={otherItems}
        selected={otherSelections}
        onChange={onOtherChange}
        onAddItem={onAddItem}
        onUpdateItem={onUpdateItem}
        onDeleteItem={onDeleteItem}
      />
      {/* Additional manual items */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">
          Additional Items
        </h3>
        <p className="text-xs text-gray-500 mb-2">
          Type an item and press Enter. Each item is added to the shopping list under its assigned category.
        </p>
        <ManualItemChips
          items={manualItems}
          onChange={onManualItemsChange}
        />
      </div>
    </div>
  );
}
