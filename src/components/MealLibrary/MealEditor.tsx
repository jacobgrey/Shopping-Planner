import { useState } from "react";
import type { Meal, MealDefinition, MasterIngredient, TagDefinition, StoreCategory } from "../../types/meals";
import { STORE_CATEGORIES } from "../../types/meals";
import TagBadge from "../common/TagBadge";
import MealImagePanel from "./MealImagePanel";
import Toast from "../common/Toast";

interface MealEditorProps {
  meal: Meal | null;
  masterIngredients: MasterIngredient[];
  availableTags: TagDefinition[];
  imageSrc?: string;
  onSave: (def: MealDefinition) => void;
  onCancel: () => void;
  onAddMasterIngredient: (def: Omit<MasterIngredient, "id">) => Promise<MasterIngredient>;
  onImageSaved?: (mealId: string, filename: string) => void;
  onImageRemoved?: (mealId: string) => void;
}

interface EditableIngredient {
  ingredientId: string;
  quantity?: number;
}

export default function MealEditor({
  meal,
  masterIngredients,
  availableTags,
  onSave,
  onCancel,
  onAddMasterIngredient,
  imageSrc,
  onImageSaved,
  onImageRemoved,
}: MealEditorProps) {
  const [name, setName] = useState(meal?.name || "");
  const [sides, setSides] = useState(meal?.sides?.join(", ") || "");
  const [tags, setTags] = useState<string[]>(meal?.tags || []);
  const [ingredients, setIngredients] = useState<EditableIngredient[]>(
    meal?.ingredients?.length ? meal.ingredients : []
  );
  const [prepTimeHours, setPrepTimeHours] = useState(meal?.prepTimeHours?.toString() || "");
  const [startTimeHours, setStartTimeHours] = useState(meal?.startTimeHours?.toString() || "");
  const [recipeUrl, setRecipeUrl] = useState(meal?.recipeUrl || "");
  const [imageFilename, setImageFilename] = useState(meal?.imageFilename || "");
  const [notes, setNotes] = useState(meal?.notes || "");
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" | "info" } | null>(null);

  // State for adding a new master ingredient inline
  const [showNewIngForm, setShowNewIngForm] = useState(false);
  const [newIngName, setNewIngName] = useState("");
  const [newIngCategory, setNewIngCategory] = useState<StoreCategory>("other");
  const [newIngUnit, setNewIngUnit] = useState("");
  const [newIngPrice, setNewIngPrice] = useState("");

  // State for adding ingredient to meal
  const [searchQuery, setSearchQuery] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const def: MealDefinition = {
      name: name.trim(),
      sides: sides.split(",").map((s) => s.trim()).filter(Boolean),
      ingredients: ingredients.filter((i) => i.ingredientId),
      tags,
      prepTimeHours: prepTimeHours ? parseFloat(prepTimeHours) : undefined,
      startTimeHours: startTimeHours ? parseFloat(startTimeHours) : undefined,
      recipeUrl: recipeUrl.trim() || undefined,
      imageFilename: imageFilename || undefined,
      notes: notes.trim() || undefined,
    };
    onSave(def);
  }

  function toggleTag(tagId: string) {
    setTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  }

  function updateIngredient(index: number, updates: Partial<EditableIngredient>) {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, ...updates } : ing))
    );
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  function addIngredientFromMaster(master: MasterIngredient) {
    setIngredients((prev) => [...prev, { ingredientId: master.id }]);
    setSearchQuery("");
  }

  async function handleCreateNewIngredient() {
    if (!newIngName.trim()) return;
    const master = await onAddMasterIngredient({
      name: newIngName.trim(),
      category: newIngCategory,
      defaultUnit: newIngUnit.trim() || "each",
      pricePerUnit: newIngPrice ? parseFloat(newIngPrice) : undefined,
    });
    setIngredients((prev) => [...prev, { ingredientId: master.id }]);
    setShowNewIngForm(false);
    setNewIngName("");
    setNewIngCategory("other");
    setNewIngUnit("");
    setNewIngPrice("");
  }

  const usedIngredientIds = new Set(ingredients.map((i) => i.ingredientId));
  const filteredMaster = masterIngredients.filter(
    (m) =>
      !usedIngredientIds.has(m.id) &&
      (!searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  function getMaster(id: string): MasterIngredient | undefined {
    return masterIngredients.find((m) => m.id === id);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">
          {meal ? "Edit Meal" : "Add Meal"}
        </h2>
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
      </div>

      {/* Name */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Meal Name</label>
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
        <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                tags.includes(tag.id)
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map((tag) => (
              <TagBadge key={tag} tag={tag} allTags={availableTags} onRemove={() => toggleTag(tag)} />
            ))}
          </div>
        )}
      </div>

      {/* Prep time & Start time */}
      <div className="mb-4 flex gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prep Time (hours) <span className="text-gray-400 font-normal">optional</span>
          </label>
          <input
            type="number"
            value={prepTimeHours}
            onChange={(e) => setPrepTimeHours(e.target.value)}
            min={0}
            step="0.25"
            placeholder="e.g. 0.5"
            className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Time (hours) <span className="text-gray-400 font-normal">optional</span>
          </label>
          <input
            type="number"
            value={startTimeHours}
            onChange={(e) => setStartTimeHours(e.target.value)}
            min={0}
            step="0.25"
            placeholder="e.g. 5"
            className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-[10px] text-gray-400 mt-0.5">How far before dinner to start</p>
        </div>
      </div>

      {/* Ingredients */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Ingredients</label>
        <div className="space-y-2">
          {ingredients.map((ing, idx) => {
            const master = getMaster(ing.ingredientId);
            return (
              <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded">
                <span className="flex-1 text-sm font-medium text-gray-800">
                  {master?.name || "Unknown ingredient"}
                </span>
                <span className="text-xs text-gray-500">{master?.defaultUnit}</span>
                <span className="text-xs text-gray-400">{master?.category.replace(/-/g, " ")}</span>
                {master?.pricePerUnit && (
                  <span className="text-xs text-green-600">${master.pricePerUnit.toFixed(2)}/{master.defaultUnit}</span>
                )}
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
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => removeIngredient(idx)}
                  className="text-red-400 hover:text-red-600 text-lg px-1"
                >
                  &times;
                </button>
              </div>
            );
          })}
        </div>

        {/* Add from master list */}
        <div className="mt-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ingredients to add..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <div className="mt-1 max-h-32 overflow-y-auto border border-gray-200 rounded bg-white">
              {filteredMaster.length > 0 ? (
                filteredMaster.slice(0, 10).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => addIngredientFromMaster(m)}
                    className="block w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50"
                  >
                    {m.name}
                    <span className="text-xs text-gray-400 ml-2">
                      {m.defaultUnit} · {m.category.replace(/-/g, " ")}
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-xs text-gray-400">
                  No matches.{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setNewIngName(searchQuery);
                      setShowNewIngForm(true);
                      setSearchQuery("");
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Create new ingredient
                  </button>
                </p>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowNewIngForm(!showNewIngForm)}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            + New ingredient
          </button>
        </div>

        {/* New ingredient inline form */}
        {showNewIngForm && (
          <div className="mt-2 p-3 border border-blue-200 bg-blue-50 rounded-lg space-y-2">
            <p className="text-xs font-medium text-blue-700">Add to Master Ingredient List</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newIngName}
                onChange={(e) => setNewIngName(e.target.value)}
                placeholder="Name"
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <select
                value={newIngCategory}
                onChange={(e) => setNewIngCategory(e.target.value as StoreCategory)}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                {STORE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat.replace(/-/g, " ")}</option>
                ))}
              </select>
              <input
                type="text"
                value={newIngUnit}
                onChange={(e) => setNewIngUnit(e.target.value)}
                placeholder="Unit"
                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <input
                type="number"
                value={newIngPrice}
                onChange={(e) => setNewIngPrice(e.target.value)}
                placeholder="$/unit"
                min={0}
                step="0.01"
                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreateNewIngredient}
                disabled={!newIngName.trim()}
                className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Add & Use
              </button>
              <button
                type="button"
                onClick={() => setShowNewIngForm(false)}
                className="px-3 py-1 text-xs text-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recipe URL */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Recipe URL <span className="text-gray-400 font-normal">optional</span>
        </label>
        <input
          type="url"
          value={recipeUrl}
          onChange={(e) => setRecipeUrl(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://..."
        />
      </div>

      {/* Meal Image */}
      {meal && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meal Image <span className="text-gray-400 font-normal">optional</span>
          </label>
          <MealImagePanel
            mealId={meal.id}
            mealName={name || meal.name}
            recipeUrl={recipeUrl || undefined}
            imageFilename={imageFilename || undefined}
            imageSrc={imageSrc}
            onImageSaved={(id, filename) => {
              setImageFilename(filename);
              onImageSaved?.(id, filename);
            }}
            onImageRemoved={(id) => {
              setImageFilename("");
              onImageRemoved?.(id);
            }}
            onToast={(msg, type) => setToast({ message: msg, type })}
          />
        </div>
      )}

      {/* Notes */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes <span className="text-gray-400 font-normal">optional</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Any special notes..."
        />
      </div>

      {/* Bottom actions (duplicate for convenience after scrolling) */}
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
      {toast && (
        <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />
      )}
    </form>
  );
}
