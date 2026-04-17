import { useState, useRef, useEffect, useCallback } from "react";
import type { Meal, MealDefinition, MasterIngredient, TagDefinition, StoreCategory } from "../../types/meals";
import { STORE_CATEGORIES } from "../../types/meals";
import TagBadge from "../common/TagBadge";
import NoteText from "../common/NoteText";
import MealImagePanel from "./MealImagePanel";
import ConfirmDialog from "../common/ConfirmDialog";
import Toast from "../common/Toast";
import { openExternal } from "../../lib/openExternal";

type SectionId = "info" | "recipe-ingredients" | "nutrition";

const DEFAULT_SECTION_ORDER: SectionId[] = ["info", "recipe-ingredients", "nutrition"];

interface MealDetailsProps {
  meal: Meal;
  masterIngredients: MasterIngredient[];
  availableTags: TagDefinition[];
  imageSrc?: string;
  detailSectionOrder: string[];
  onUpdate: (id: string, def: Partial<MealDefinition>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onBack: () => void;
  onAddMasterIngredient: (def: Omit<MasterIngredient, "id">) => Promise<MasterIngredient>;
  onImageSaved: (mealId: string, filename: string) => void;
  onImageRemoved: (mealId: string) => void;
  onSectionOrderChange: (order: string[]) => void;
}

interface EditableIngredient {
  ingredientId: string;
  quantity?: number;
}

export default function MealDetails({
  meal,
  masterIngredients,
  availableTags,
  imageSrc,
  detailSectionOrder,
  onUpdate,
  onDelete,
  onBack,
  onAddMasterIngredient,
  onImageSaved,
  onImageRemoved,
  onSectionOrderChange,
}: MealDetailsProps) {
  const isNewMeal = !meal.name;

  // Per-section edit state
  const [editingSections, setEditingSections] = useState<Set<SectionId>>(() =>
    isNewMeal ? new Set(DEFAULT_SECTION_ORDER) : new Set()
  );

  // Local edit state for all fields
  const [name, setName] = useState(meal.name);
  const [sides, setSides] = useState(meal.sides?.join(", ") || "");
  const [tags, setTags] = useState<string[]>(meal.tags);
  const [prepTimeHours, setPrepTimeHours] = useState(meal.prepTimeHours?.toString() || "");
  const [startTimeHours, setStartTimeHours] = useState(meal.startTimeHours?.toString() || "");
  const [recipeUrl, setRecipeUrl] = useState(meal.recipeUrl || "");
  const [notes, setNotes] = useState(meal.notes || "");
  const [nutrition, setNutrition] = useState(meal.nutrition || "");
  const [ingredients, setIngredients] = useState<EditableIngredient[]>(
    meal.ingredients?.length ? [...meal.ingredients] : []
  );

  // Ingredient search/create state
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewIngForm, setShowNewIngForm] = useState(false);
  const [newIngName, setNewIngName] = useState("");
  const [newIngCategory, setNewIngCategory] = useState<StoreCategory>("other");
  const [newIngUnit, setNewIngUnit] = useState("");
  const [newIngPrice, setNewIngPrice] = useState("");

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" | "info" } | null>(null);

  // Drag state for section reorder
  const dragRef = useRef<SectionId | null>(null);
  const [dragOver, setDragOver] = useState<SectionId | null>(null);
  const [sectionOrder, setSectionOrder] = useState<SectionId[]>(() => {
    const order = detailSectionOrder.filter((s): s is SectionId =>
      DEFAULT_SECTION_ORDER.includes(s as SectionId)
    );
    // Add any missing sections at the end
    for (const s of DEFAULT_SECTION_ORDER) {
      if (!order.includes(s)) order.push(s);
    }
    return order;
  });

  // Parallax scroll effect — the scroll container is <main>, not viewport
  const bannerRef = useRef<HTMLDivElement>(null);
  const parallaxImgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const scrollContainer = bannerRef.current?.closest("main");
    if (!scrollContainer || !imageSrc) return;
    function onScroll() {
      if (!parallaxImgRef.current) return;
      const scrollY = scrollContainer!.scrollTop;
      // Move image at 40% of scroll speed for a subtle parallax
      parallaxImgRef.current.style.transform = `translateY(${scrollY * 0.4}px)`;
    }
    scrollContainer.addEventListener("scroll", onScroll, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", onScroll);
  }, [imageSrc]);

  // Focus name input on new meal
  const nameInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isNewMeal) {
      nameInputRef.current?.focus();
    }
  }, [isNewMeal]);

  const toggleSection = useCallback((section: SectionId) => {
    setEditingSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  function getMaster(id: string): MasterIngredient | undefined {
    return masterIngredients.find((m) => m.id === id);
  }

  // Build current meal definition from local state
  function buildDef(): Partial<MealDefinition> {
    return {
      name: name.trim(),
      sides: sides.split(",").map((s) => s.trim()).filter(Boolean),
      ingredients: ingredients.filter((i) => i.ingredientId),
      tags,
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
        // No name entered — delete the blank meal instead of saving it
        await onDelete(meal.id);
      } else {
        await onUpdate(meal.id, buildDef());
      }
    } catch (e) {
      console.error("Failed to save meal:", e);
      setToast({ message: "Failed to save changes", type: "error" });
      return; // Don't navigate away if save failed
    }
    onBack();
  }

  async function handleDelete() {
    await onDelete(meal.id);
    onBack();
  }

  // Ingredient helpers
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

  function toggleTag(tagId: string) {
    setTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  }

  const usedIngredientIds = new Set(ingredients.map((i) => i.ingredientId));
  const filteredMaster = masterIngredients.filter(
    (m) =>
      !usedIngredientIds.has(m.id) &&
      (!searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Drag handlers for section reorder
  function handleDragStart(e: React.DragEvent, section: SectionId) {
    dragRef.current = section;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", section);
  }

  function handleDragOver(e: React.DragEvent, section: SectionId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragRef.current && dragRef.current !== section) {
      setDragOver(section);
    }
  }

  function handleDragLeave(e: React.DragEvent, section: SectionId) {
    // Only clear if leaving the section itself, not a child
    if (dragOver === section && !e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(null);
    }
  }

  function handleDrop(e: React.DragEvent, targetSection: SectionId) {
    e.preventDefault();
    const source = dragRef.current;
    if (!source || source === targetSection) {
      setDragOver(null);
      dragRef.current = null;
      return;
    }
    setSectionOrder((prev) => {
      const next = [...prev];
      const srcIdx = next.indexOf(source);
      const tgtIdx = next.indexOf(targetSection);
      next.splice(srcIdx, 1);
      next.splice(tgtIdx, 0, source);
      onSectionOrderChange(next);
      return next;
    });
    setDragOver(null);
    dragRef.current = null;
  }

  function handleDragEnd() {
    setDragOver(null);
    dragRef.current = null;
  }

  // Section edit toggle button
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

  // Drag handle icon — this is the only draggable element
  function DragHandle({ sectionId }: { sectionId: SectionId }) {
    return (
      <span
        draggable
        onDragStart={(e) => {
          handleDragStart(e, sectionId);
        }}
        onDragEnd={handleDragEnd}
        className="cursor-grab text-gray-300 hover:text-gray-500 mr-2 select-none text-lg leading-none"
        title="Drag to reorder"
      >
        ⠿
      </span>
    );
  }

  // --- Section renderers ---

  function renderInfoSection() {
    const editing = editingSections.has("info");
    return (
      <div className="space-y-3">
        {/* Name */}
        {editing ? (
          <input
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Meal name"
            className="w-full text-2xl font-bold text-gray-800 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <h1 className="text-2xl font-bold text-gray-800">
            {name || <span className="italic text-gray-400">Untitled Meal</span>}
          </h1>
        )}

        {/* Sides */}
        {editing ? (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Sides (comma-separated)</label>
            <input
              type="text"
              value={sides}
              onChange={(e) => setSides(e.target.value)}
              placeholder="e.g., White Rice, Steamed Broccoli"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ) : sides ? (
          <p className="text-sm text-gray-600">Sides: {sides}</p>
        ) : null}

        {/* Tags */}
        {editing ? (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tags</label>
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
          </div>
        ) : tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <TagBadge key={tag} tag={tag} allTags={availableTags} />
            ))}
          </div>
        ) : null}

        {/* Prep & Start time */}
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
                placeholder="e.g. 0.5"
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
                placeholder="e.g. 5"
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

        {/* Recipe URL */}
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
              onClick={(e) => { e.preventDefault(); openExternal(recipeUrl); }}
              className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
            >
              {(() => { try { return new URL(recipeUrl).hostname.replace(/^www\./, ""); } catch { return "Recipe link"; } })()}
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
        {/* Left: Recipe (notes) */}
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

        {/* Right: Ingredients */}
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

              {/* Search to add */}
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

              {/* New ingredient form */}
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
      {/* Parallax Banner */}
      <div
        ref={bannerRef}
        className="relative h-[250px] -mx-6 -mt-6 mb-6 bg-gray-200 overflow-hidden"
      >
        {imageSrc ? (
          <>
            <img
              ref={parallaxImgRef}
              src={imageSrc}
              alt={name || "Meal image"}
              className="absolute inset-0 w-full h-[140%] object-cover"
              style={{ top: "-20%" }}
            />
            {/* Overlay for context menu actions */}
            <div className="absolute inset-0 z-[1]">
              <MealImagePanel
                mealId={meal.id}
                mealName={name || meal.name || "New Meal"}
                recipeUrl={recipeUrl || undefined}
                imageFilename={meal.imageFilename}
                imageSrc={imageSrc}
                onImageSaved={onImageSaved}
                onImageRemoved={onImageRemoved}
                onToast={(msg, type) => setToast({ message: msg, type })}
              />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
            <MealImagePanel
              mealId={meal.id}
              mealName={name || meal.name || "New Meal"}
              recipeUrl={recipeUrl || undefined}
              imageFilename={meal.imageFilename}
              imageSrc={undefined}
              onImageSaved={onImageSaved}
              onImageRemoved={onImageRemoved}
              onToast={(msg, type) => setToast({ message: msg, type })}
            />
          </div>
        )}

        {/* Back button */}
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

      {/* Sections */}
      <div className="space-y-6">
        {sectionOrder.map((sectionId) => {
          const renderer = SECTION_RENDERERS[sectionId];
          if (!renderer) return null;
          return (
            <div
              key={sectionId}
              onDragOver={(e) => handleDragOver(e, sectionId)}
              onDragLeave={(e) => handleDragLeave(e, sectionId)}
              onDrop={(e) => handleDrop(e, sectionId)}
              onDragEnd={handleDragEnd}
              className={`bg-white rounded-lg border border-gray-200 p-4 transition ${
                dragOver === sectionId ? "border-blue-400 border-t-2" : ""
              }`}
              onDoubleClick={() => {
                // Don't toggle if user is selecting text
                const selection = window.getSelection();
                if (selection && selection.toString().length > 0) return;
                if (!editingSections.has(sectionId)) {
                  toggleSection(sectionId);
                }
              }}
            >
              <div className="flex items-center mb-3">
                <DragHandle sectionId={sectionId} />
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

      {/* Delete button */}
      <div className="mt-8 mb-4 pt-6 border-t border-gray-200">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition"
        >
          Delete Meal
        </button>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <ConfirmDialog
          message={`Are you sure you want to delete "${name || "this meal"}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          confirmLabel="Delete"
          danger
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />
      )}
    </div>
  );
}
