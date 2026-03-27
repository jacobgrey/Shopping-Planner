import { useState } from "react";
import type { Meal, MealDefinition, IngredientEntry, StoreCategory } from "../../types/meals";
import { MEAL_TAGS, STORE_CATEGORIES } from "../../types/meals";
import TagBadge from "../common/TagBadge";

interface MealEditorProps {
  meal: Meal | null;
  allIngredientNames: string[];
  onSave: (def: MealDefinition) => void;
  onCancel: () => void;
}

const emptyIngredient: IngredientEntry = {
  name: "",
  category: "other",
};

export default function MealEditor({
  meal,
  onSave,
  onCancel,
}: MealEditorProps) {
  const [name, setName] = useState(meal?.name || "");
  const [sides, setSides] = useState(meal?.sides?.join(", ") || "");
  const [tags, setTags] = useState<string[]>(meal?.tags || []);
  const [ingredients, setIngredients] = useState<IngredientEntry[]>(
    meal?.ingredients?.length ? meal.ingredients : [{ ...emptyIngredient }]
  );
  const [prepTime, setPrepTime] = useState(meal?.prepTimeMinutes?.toString() || "");
  const [notes, setNotes] = useState(meal?.notes || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const def: MealDefinition = {
      name: name.trim(),
      sides: sides
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      ingredients: ingredients.filter((i) => i.name.trim()),
      tags,
      prepTimeMinutes: prepTime ? parseInt(prepTime, 10) : undefined,
      notes: notes.trim() || undefined,
    };
    onSave(def);
  }

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function updateIngredient(index: number, updates: Partial<IngredientEntry>) {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, ...updates } : ing))
    );
  }

  function addIngredient() {
    setIngredients((prev) => [...prev, { ...emptyIngredient }]);
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">
          {meal ? "Edit Meal" : "Add Meal"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>

      {/* Name */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Meal Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Chicken Stir Fry"
        />
      </div>

      {/* Sides */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Sides <span className="text-gray-400 font-normal">(comma-separated)</span>
        </label>
        <input
          type="text"
          value={sides}
          onChange={(e) => setSides(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., White Rice, Steamed Broccoli"
        />
      </div>

      {/* Tags */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </label>
        <div className="flex flex-wrap gap-2">
          {MEAL_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                tags.includes(tag)
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tag.replace(/-/g, " ")}
            </button>
          ))}
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map((tag) => (
              <TagBadge
                key={tag}
                tag={tag}
                onRemove={() => toggleTag(tag)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Prep time */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Prep Time (minutes){" "}
          <span className="text-gray-400 font-normal">optional</span>
        </label>
        <input
          type="number"
          value={prepTime}
          onChange={(e) => setPrepTime(e.target.value)}
          min={0}
          className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Ingredients */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ingredients
        </label>
        <div className="space-y-2">
          {ingredients.map((ing, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                type="text"
                value={ing.name}
                onChange={(e) =>
                  updateIngredient(idx, { name: e.target.value })
                }
                placeholder="Ingredient name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                value={ing.quantity ?? ""}
                onChange={(e) =>
                  updateIngredient(idx, {
                    quantity: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                placeholder="Qty"
                min={0}
                step="any"
                className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={ing.unit ?? ""}
                onChange={(e) =>
                  updateIngredient(idx, { unit: e.target.value || undefined })
                }
                placeholder="Unit"
                className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={ing.category}
                onChange={(e) =>
                  updateIngredient(idx, {
                    category: e.target.value as StoreCategory,
                  })
                }
                className="w-32 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STORE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.replace(/-/g, " ")}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={ing.priceEstimate ?? ""}
                onChange={(e) =>
                  updateIngredient(idx, {
                    priceEstimate: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
                placeholder="$"
                min={0}
                step="0.01"
                className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => removeIngredient(idx)}
                className="text-red-400 hover:text-red-600 text-lg px-1"
                aria-label="Remove ingredient"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addIngredient}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800"
        >
          + Add ingredient
        </button>
      </div>

      {/* Notes */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes{" "}
          <span className="text-gray-400 font-normal">optional</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Any special notes..."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!name.trim()}
          className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {meal ? "Save Changes" : "Add Meal"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
