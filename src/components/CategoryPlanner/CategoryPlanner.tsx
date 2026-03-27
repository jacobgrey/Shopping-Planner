import {
  BREAKFAST_ITEMS,
  LUNCH_ITEMS,
  SNACK_ITEMS,
} from "../../data/breakfast-lunch-snacks";
import type { CategoryItem } from "../../data/breakfast-lunch-snacks";

interface CategoryPlannerProps {
  breakfastSelections: string[];
  lunchSelections: string[];
  snackSelections: string[];
  onBreakfastChange: (ids: string[]) => void;
  onLunchChange: (ids: string[]) => void;
  onSnackChange: (ids: string[]) => void;
}

function CategorySection({
  title,
  items,
  selected,
  onChange,
}: {
  title: string;
  items: CategoryItem[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-2">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <label
            key={item.id}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition ${
              selected.includes(item.id)
                ? "border-blue-400 bg-blue-50 text-blue-700"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={() => toggle(item.id)}
              className="sr-only"
            />
            <span
              className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] ${
                selected.includes(item.id)
                  ? "bg-blue-500 border-blue-500 text-white"
                  : "border-gray-300"
              }`}
            >
              {selected.includes(item.id) && "✓"}
            </span>
            {item.name}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function CategoryPlanner({
  breakfastSelections,
  lunchSelections,
  snackSelections,
  onBreakfastChange,
  onLunchChange,
  onSnackChange,
}: CategoryPlannerProps) {
  return (
    <div className="space-y-4">
      <CategorySection
        title="Breakfast Items"
        items={BREAKFAST_ITEMS}
        selected={breakfastSelections}
        onChange={onBreakfastChange}
      />
      <CategorySection
        title="Lunch Materials"
        items={LUNCH_ITEMS}
        selected={lunchSelections}
        onChange={onLunchChange}
      />
      <CategorySection
        title="Snacks"
        items={SNACK_ITEMS}
        selected={snackSelections}
        onChange={onSnackChange}
      />
    </div>
  );
}
