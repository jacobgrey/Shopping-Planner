import { useState, useRef, useEffect } from "react";
import type { ManualItem } from "../../types/planner";
import { STORE_CATEGORIES, type StoreCategory } from "../../types/meals";
import { CHIP_BG, CHIP_BORDER } from "../../lib/theme";

const CATEGORY_COLORS: Record<StoreCategory, string> = {
  produce: "bg-green-400",
  meat: "bg-red-400",
  dairy: "bg-blue-300",
  frozen: "bg-cyan-300",
  bakery: "bg-yellow-400",
  "canned-goods": "bg-orange-400",
  "dry-goods": "bg-amber-300",
  condiments: "bg-purple-300",
  spices: "bg-rose-300",
  snacks: "bg-pink-300",
  beverages: "bg-teal-300",
  deli: "bg-red-300",
  other: "bg-gray-300",
};

interface ManualItemChipsProps {
  items: ManualItem[];
  onChange: (items: ManualItem[]) => void;
  compact?: boolean;
}

export default function ManualItemChips({ items, onChange, compact }: ManualItemChipsProps) {
  const [inputValue, setInputValue] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!openDropdown) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openDropdown]);

  function addItem() {
    const name = inputValue.trim();
    if (!name) return;
    const item: ManualItem = {
      id: crypto.randomUUID(),
      name,
      category: "other",
    };
    onChange([...items, item]);
    setInputValue("");
  }

  function removeItem(id: string) {
    onChange(items.filter((i) => i.id !== id));
  }

  function setCategory(id: string, category: StoreCategory) {
    onChange(items.map((i) => (i.id === id ? { ...i, category } : i)));
    setOpenDropdown(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  }

  function handleBlur() {
    addItem();
  }

  const chipText = compact ? "text-[10px]" : "text-xs";
  const chipPad = compact ? "px-1 py-0.5" : "px-1.5 py-0.5";
  const inputClass = compact
    ? "w-full px-1.5 py-0.5 text-[10px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
    : "w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400";
  const maxNameW = compact ? "max-w-[70px]" : "max-w-[150px]";

  return (
    <div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {items.map((item) => (
            <div
              key={item.id}
              className={`inline-flex items-center gap-0.5 ${chipPad} rounded-full ${CHIP_BG} border ${CHIP_BORDER} ${chipText} text-gray-700 relative`}
            >
              {/* Category dot */}
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === item.id ? null : item.id)}
                className={`w-2.5 h-2.5 rounded-full ${CATEGORY_COLORS[item.category]} shrink-0 hover:ring-2 hover:ring-blue-300`}
                title={item.category.replace(/-/g, " ")}
              />
              {/* Name */}
              <span className={`truncate ${maxNameW}`}>{item.name}</span>
              {/* Delete */}
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="text-gray-400 hover:text-red-500 leading-none ml-0.5"
              >
                &times;
              </button>
              {/* Category dropdown */}
              {openDropdown === item.id && (
                <div
                  ref={dropdownRef}
                  className="absolute left-0 top-full mt-0.5 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-0.5 min-w-[120px]"
                >
                  {STORE_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(item.id, cat)}
                      className={`flex items-center gap-1.5 w-full text-left px-2 py-1 text-[11px] hover:bg-blue-50 ${
                        cat === item.category ? "bg-blue-50 font-medium" : ""
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[cat]} shrink-0`} />
                      {cat.replace(/-/g, " ")}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={compact ? "Add item..." : "Type an item and press Enter"}
        className={inputClass}
      />
    </div>
  );
}
