import { useState, useRef, useEffect, useCallback } from "react";
import type { Side, SideDefinition, MasterIngredient, StoreCategory } from "../../types/meals";
import { STORE_CATEGORIES } from "../../types/meals";
import NoteText from "../common/NoteText";
import MealImagePanel from "../MealLibrary/MealImagePanel";
import ConfirmDialog from "../common/ConfirmDialog";
import Toast from "../common/Toast";
import { openExternal } from "../../lib/openExternal";
import { loadImageAsDataUrl } from "../../lib/mealImages";

type SectionId = "info" | "recipe-ingredients" | "nutrition";
const SECTION_ORDER: SectionId[] = ["info", "recipe-ingredients", "nutrition"];

interface SideDetailsProps {
  side: Side;
  masterIngredients: MasterIngredient[];
  imageSrc?: string;
  onUpdate: (id: string, def: Partial<SideDefinition>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onBack: () => void;
  onAddMasterIngredient: (def: Omit<MasterIngredient, "id">) => Promise<MasterIngredient>;
  onImageSaved: (id: string, filename: string) => void;
  onImageRemoved: (id: string) => void;
}

interface EditableIngredient {
  ingredientId: string;
  quantity?: number;
}

export default function SideDetails({
  side,
  masterIngredients,
  imageSrc,
  onUpdate,
  onDelete,
  onBack,
  onAddMasterIngredient,
  onImageSaved,
  onImageRemoved,
}: SideDetailsProps) {
  const isNew = !side.name;

  const [editingSections, setEditingSections] = useState<Set<SectionId>>(() =>
    isNew ? new Set(SECTION_ORDER) : new Set(),
  );

  const [name, setName] = useState(side.name);
  const [prepTimeHours, setPrepTimeHours] = useState(side.prepTimeHours?.toString() || "");
  const [startTimeHours, setStartTimeHours] = useState(side.startTimeHours?.toString() || "");
  const [recipeUrl, setRecipeUrl] = useState(side.recipeUrl || "");
  const [notes, setNotes] = useState(side.notes || "");
  const [nutrition, setNutrition] = useState(side.nutrition || "");
  const [ingredients, setIngredients] = useState<EditableIngredient[]>(
    side.ingredients?.length ? [...side.ingredients] : [],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [showNewIngForm, setShowNewIngForm] = useState(false);
  const [newIngName, setNewIngName] = useState("");
  const [newIngCategory, setNewIngCategory] = useState<StoreCategory>("other");
  const [newIngUnit, setNewIngUnit] = useState("");
  const [newIngPrice, setNewIngPrice] = useState("");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" | "info" } | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isNew) nameInputRef.current?.focus();
  }, [isNew]);

  const [fullImageSrc, setFullImageSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!side.imageFilename) {
      setFullImageSrc(null);
      return;
    }
    let cancelled = false;
    loadImageAsDataUrl(side.imageFilename).then((url) => {
      if (!cancelled) setFullImageSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [side.imageFilename]);
  const displayImageSrc = fullImageSrc ?? imageSrc;

  const toggleSection = useCallback((section: SectionId) => {
    setEditingSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }, []);

  function getMaster(id: string): MasterIngredient | undefined {
    return masterIngredients.find((m) => m.id === id);
  }

  function buildDef(): Partial<SideDefinition> {
    return {
      name: name.trim(),
      // Tags UX is deferred — keep the field as [] so the type stays stable.
      tags: [],
      ingredients: ingredients.filter((i) => i.ingredientId),
      prepTimeHours: prepTimeHours ? parseFloat(prepTimeHours) : undefined,
      startTimeHours: startTimeHours ? parseFloat(startTimeHours) : undefined,
      recipeUrl: recipeUrl.trim() || undefined,
      notes: notes.trim() || undefined,
      nutrition: nutrition.trim() || undefined,
    };
  }

  async function handleBack() {
    try {
      if (!name.trim()) {
        await onDelete(side.id);
      } else {
        await onUpdate(side.id, buildDef());
      }
    } catch (e) {
      console.error("Failed to save side:", e);
      setToast({ message: "Failed to save changes", type: "error" });
      return;
    }
    onBack();
  }

  async function handleDelete() {
    await onDelete(side.id);
    onBack();
  }

  function updateIngredient(index: number, updates: Partial<EditableIngredient>) {
    setIngredients((prev) => prev.map((ing, i) => (i === index ? { ...ing, ...updates } : ing)));
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
      (!searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  function EditToggle({ section }: { section: SectionId }) {
    const isEditing = editingSections.has(section);
    return (
      <button
        onClick={() => toggleSection(section)}
        className="text-xs text-gray-400 hover:text-gray-600 ml-2"
        title={isEditing ? "Done editing" : "Edit"}
      >
        {isEditing ? "done" : "edit"}
      </button>
    );
  }

  function renderInfoSection() {
    const editing = editingSections.has("info");
    return (
      <div className="space-y-3">
        {editing ? (
          <input
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Side name"
            className="w-full text-2xl font-bold text-gray-800 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <h1 className="text-2xl font-bold text-gray-800">
            {name || <span className="italic text-gray-400">Untitled Side</span>}
          </h1>
        )}

        {/* Tag picker deferred — no UI here yet. */}

        {editing ? (
          <div className="flex gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Prep Time (hours)</label>
              <input
                type="number"
                value={prepTimeHours}
                onChange={(e) => setPrepTimeHours(e.target.value)}
                min={0}
                step="0.25"
                placeholder="e.g. 0.25"
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Start Time (hours)</label>
              <input
                type="number"
                value={startTimeHours}
                onChange={(e) => setStartTimeHours(e.target.value)}
                min={0}
                step="0.25"
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">How far before dinner to start</p>
            </div>
          </div>
        ) : (prepTimeHours || startTimeHours) ? (
          <p className="text-sm text-gray-500">
            {prepTimeHours ? `${prepTimeHours}h prep` : ""}
            {prepTimeHours && startTimeHours ? " · " : ""}
            {startTimeHours ? `${startTimeHours}h start` : ""}
          </p>
        ) : null}

        {editing ? (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Recipe URL</label>
            <input
              type="url"
              value={recipeUrl}
              onChange={(e) => setRecipeUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ) : recipeUrl ? (
          <p className="text-sm">
            <a
              href={recipeUrl}
              onClick={(e) => {
                e.preventDefault();
                openExternal(recipeUrl);
              }}
              className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
            >
              {(() => {
                try {
                  return new URL(recipeUrl).hostname.replace(/^www\./, "");
                } catch {
                  return "Recipe link";
                }
              })()}
            </a>
          </p>
        ) : null}
      </div>
    );
  }

  function renderRecipeIngredientsSection() {
    const editing = editingSections.has("recipe-ingredients");
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Recipe</h3>
          {editing ? (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              placeholder="Add recipe instructions, notes..."
            />
          ) : notes ? (
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              <NoteText text={notes} />
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No recipe notes yet</p>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Ingredients
            {ingredients.length > 0 && (
              <span className="text-gray-400 font-normal ml-1">({ingredients.length})</span>
            )}
          </h3>
          {editing ? (
            <div className="space-y-2">
              {ingredients.map((ing, idx) => {
                const master = getMaster(ing.ingredientId);
                return (
                  <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded">
                    <span className="flex-1 text-sm font-medium text-gray-800">
                      {master?.name || "Unknown ingredient"}
                    </span>
                    <span className="text-xs text-gray-500">{master?.defaultUnit}</span>
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
                      onClick={() => removeIngredient(idx)}
                      className="text-red-400 hover:text-red-600 text-lg px-1"
                    >
                      &times;
                    </button>
                  </div>
                );
              })}

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

              {showNewIngForm && (
                <div className="mt-2 p-3 border border-blue-200 bg-blue-50 rounded-lg space-y-2">
                  <p className="text-xs font-medium text-blue-700">Add to Master Ingredient List</p>
                  <div className="flex gap-2 flex-wrap">
                    <input
                      type="text"
                      value={newIngName}
                      onChange={(e) => setNewIngName(e.target.value)}
                      placeholder="Name"
                      className="flex-1 min-w-[120px] px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <select
                      value={newIngCategory}
                      onChange={(e) => setNewIngCategory(e.target.value as StoreCategory)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      {STORE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.replace(/-/g, " ")}
                        </option>
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
          ) : ingredients.length > 0 ? (
            <ul className="space-y-1">
              {ingredients.map((ing, idx) => {
                const master = getMaster(ing.ingredientId);
                return (
                  <li key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                    <span className="text-gray-400">•</span>
                    <span>{master?.name || "Unknown"}</span>
                    {ing.quantity != null && (
                      <span className="text-gray-500">
                        {ing.quantity} {master?.defaultUnit}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 italic">No ingredients added</p>
          )}
        </div>
      </div>
    );
  }

  function renderNutritionSection() {
    const editing = editingSections.has("nutrition");
    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Nutrition Information</h3>
        {editing ? (
          <textarea
            value={nutrition}
            onChange={(e) => setNutrition(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            placeholder="Add nutrition info..."
          />
        ) : nutrition ? (
          <div className="text-sm text-gray-700 whitespace-pre-wrap">
            <NoteText text={nutrition} />
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No nutrition info yet</p>
        )}
      </div>
    );
  }

  const SECTION_RENDERERS: Record<SectionId, () => React.JSX.Element> = {
    "info": renderInfoSection,
    "recipe-ingredients": renderRecipeIngredientsSection,
    "nutrition": renderNutritionSection,
  };

  const SECTION_LABELS: Record<SectionId, string> = {
    "info": "Info",
    "recipe-ingredients": "Recipe & Ingredients",
    "nutrition": "Nutrition",
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="relative h-[250px] -mx-6 -mt-6 mb-6 bg-gray-200 overflow-hidden">
        {displayImageSrc ? (
          <>
            <img
              src={displayImageSrc}
              alt={name || "Side image"}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 z-[1]">
              <MealImagePanel
                mealId={side.id}
                mealName={name || side.name || "New Side"}
                recipeUrl={recipeUrl || undefined}
                imageFilename={side.imageFilename}
                imageSrc={displayImageSrc}
                onImageSaved={onImageSaved}
                onImageRemoved={onImageRemoved}
                onToast={(msg, type) => setToast({ message: msg, type })}
              />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
            <MealImagePanel
              mealId={side.id}
              mealName={name || side.name || "New Side"}
              recipeUrl={recipeUrl || undefined}
              imageFilename={side.imageFilename}
              imageSrc={undefined}
              onImageSaved={onImageSaved}
              onImageRemoved={onImageRemoved}
              onToast={(msg, type) => setToast({ message: msg, type })}
            />
          </div>
        )}

        <button
          onClick={handleBack}
          className="absolute top-4 left-4 z-10 w-10 h-10 flex items-center justify-center bg-white/80 hover:bg-white rounded-full shadow text-gray-700 hover:text-gray-900 transition"
          title="Back to library"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="space-y-6">
        {SECTION_ORDER.map((sectionId) => {
          const renderer = SECTION_RENDERERS[sectionId];
          return (
            <div
              key={sectionId}
              className="bg-white rounded-lg border border-gray-200 p-4"
              onDoubleClick={() => {
                const selection = window.getSelection();
                if (selection && selection.toString().length > 0) return;
                if (!editingSections.has(sectionId)) {
                  toggleSection(sectionId);
                }
              }}
            >
              <div className="flex items-center mb-3">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  {SECTION_LABELS[sectionId]}
                </span>
                <EditToggle section={sectionId} />
              </div>
              {renderer()}
            </div>
          );
        })}
      </div>

      <div className="mt-8 mb-4 pt-6 border-t border-gray-200">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition"
        >
          Delete Side
        </button>
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          message={`Are you sure you want to delete "${name || "this side"}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          confirmLabel="Delete"
          danger
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
