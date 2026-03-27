import { useState } from "react";
import type { Deal } from "../../types/planner";

interface DealsPanelProps {
  deals: Deal[];
  onAddDeal: (deal: Deal) => void;
  onRemoveDeal: (index: number) => void;
}

export default function DealsPanel({
  deals,
  onAddDeal,
  onRemoveDeal,
}: DealsPanelProps) {
  const [name, setName] = useState("");
  const [strength, setStrength] = useState<1 | 2 | 3>(2);

  function handleAdd() {
    if (!name.trim()) return;
    onAddDeal({
      ingredientName: name.trim(),
      biasStrength: strength,
    });
    setName("");
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
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Ingredient on sale..."
          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={strength}
          onChange={(e) => setStrength(Number(e.target.value) as 1 | 2 | 3)}
          className="px-2 py-1.5 border border-gray-300 rounded text-sm"
        >
          <option value={1}>Slight</option>
          <option value={2}>Medium</option>
          <option value={3}>Strong</option>
        </select>
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
          {deals.map((deal, i) => (
            <li
              key={i}
              className="flex items-center justify-between text-sm py-1 px-2 bg-green-50 rounded"
            >
              <span className="text-gray-700">
                {deal.ingredientName}
                <span className="text-xs text-green-600 ml-2">
                  bias: {deal.biasStrength === 1 ? "slight" : deal.biasStrength === 2 ? "medium" : "strong"}
                </span>
              </span>
              <button
                onClick={() => onRemoveDeal(i)}
                className="text-red-400 hover:text-red-600 text-xs"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
