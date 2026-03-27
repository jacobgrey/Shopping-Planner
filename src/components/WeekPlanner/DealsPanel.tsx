import { useState, useRef, useEffect } from "react";
import type { Deal } from "../../types/planner";
import type { MasterIngredient } from "../../types/meals";

const BIAS_LABELS = ["Slight", "Medium", "Strong"] as const;

function BiasSlider({
  value,
  onChange,
}: {
  value: 1 | 2 | 3;
  onChange: (v: 1 | 2 | 3) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[80px]">
      <input
        type="range"
        min={1}
        max={3}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) as 1 | 2 | 3)}
        className="w-full h-1.5 accent-green-600 cursor-pointer"
      />
      <span className="text-[10px] text-gray-500">{BIAS_LABELS[value - 1]}</span>
    </div>
  );
}

interface DealsPanelProps {
  deals: Deal[];
  onAddDeal: (deal: Deal) => void;
  onRemoveDeal: (index: number) => void;
  onUpdateDeal: (index: number, deal: Deal) => void;
  masterIngredients: MasterIngredient[];
}

function hasIngredientMatch(name: string, masterIngredients: MasterIngredient[]): boolean {
  const dealName = name.toLowerCase();
  return masterIngredients.some((mi) => {
    const ingName = mi.name.toLowerCase();
    return ingName.includes(dealName) || dealName.includes(ingName);
  });
}

export default function DealsPanel({
  deals,
  onAddDeal,
  onRemoveDeal,
  onUpdateDeal,
  masterIngredients,
}: DealsPanelProps) {
  const [name, setName] = useState("");
  const [strength, setStrength] = useState<1 | 2 | 3>(2);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const query = name.trim().toLowerCase();
  const suggestions =
    query.length > 0
      ? masterIngredients
          .filter((mi) => mi.name.toLowerCase().includes(query))
          .slice(0, 8)
      : [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleAdd() {
    if (!name.trim()) return;
    onAddDeal({
      ingredientName: name.trim(),
      biasStrength: strength,
    });
    setName("");
    setShowSuggestions(false);
    setHighlightIndex(-1);
  }

  function handleSelectSuggestion(ingredientName: string) {
    setName(ingredientName);
    setShowSuggestions(false);
    setHighlightIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      if (highlightIndex >= 0 && highlightIndex < suggestions.length) {
        handleSelectSuggestion(suggestions[highlightIndex].name);
      } else {
        handleAdd();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightIndex(-1);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">
        This Week's Deals
      </h3>
      <p className="text-xs text-gray-500 mb-3">
        Ingredients on sale will bias meal selection toward meals that use them.
      </p>

      {/* Add deal */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1" ref={wrapperRef}>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setShowSuggestions(true);
              setHighlightIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder="Ingredient on sale..."
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-10 w-full mt-0.5 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto">
              {suggestions.map((mi, i) => (
                <li
                  key={mi.id}
                  onMouseDown={() => handleSelectSuggestion(mi.name)}
                  className={`px-2 py-1.5 text-sm cursor-pointer ${
                    i === highlightIndex
                      ? "bg-blue-50 text-blue-800"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  {mi.name}
                  <span className="text-xs text-gray-400 ml-2">{mi.category.replace(/-/g, " ")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <BiasSlider value={strength} onChange={setStrength} />
        <button
          onClick={handleAdd}
          disabled={!name.trim()}
          className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {/* Deal list */}
      {deals.length === 0 ? (
        <p className="text-xs text-gray-400">No deals entered yet.</p>
      ) : (
        <ul className="space-y-1">
          {deals.map((deal, i) => {
            const matched = hasIngredientMatch(deal.ingredientName, masterIngredients);
            return (
              <li
                key={i}
                className="flex items-center gap-2 text-sm py-1 px-2 bg-green-50 rounded"
              >
                <span className="text-gray-700 flex-1">
                  {deal.ingredientName}
                  {!matched && (
                    <span className="text-xs text-amber-600 ml-2" title="This ingredient is not in your master ingredient list and won't affect meal selection">
                      ⚠ not in ingredient list
                    </span>
                  )}
                </span>
                <BiasSlider
                  value={deal.biasStrength}
                  onChange={(v) => onUpdateDeal(i, { ...deal, biasStrength: v })}
                />
                <button
                  onClick={() => onRemoveDeal(i)}
                  className="text-red-400 hover:text-red-600 text-xs"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
