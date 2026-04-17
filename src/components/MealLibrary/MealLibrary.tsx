import { useState } from "react";
import type { Meal, MealDefinition, MasterIngredient, TagDefinition } from "../../types/meals";
import TagBadge from "../common/TagBadge";
import NoteText from "../common/NoteText";
import MealDetails from "./MealDetails";
import MealImport from "./MealImport";
import Toast from "../common/Toast";
import { CARD_BORDER } from "../../lib/theme";
import { useMealImages } from "../../hooks/useMealImages";
import MealImagePanel from "./MealImagePanel";
import { openExternal } from "../../lib/openExternal";

type SortMode = "name-az" | "name-za" | "by-tag" | "prep-time";

type ViewMode =
  | { view: "grid" }
  | { view: "details"; mealId: string }
  | { view: "import" };

interface MealLibraryProps {
  mealLib: {
    meals: Meal[];
    loaded: boolean;
    addMeal: (def: MealDefinition) => Promise<Meal>;
    updateMeal: (id: string, def: Partial<MealDefinition>) => Promise<void>;
    deleteMeal: (id: string) => Promise<void>;
    importMeals: (
      defs: MealDefinition[],
      mode: "merge" | "replace"
    ) => Promise<{ added: number; skipped: number; replaced: number }>;
  };
  tagLib: {
    tags: TagDefinition[];
    loaded: boolean;
    addTag: (label: string) => Promise<TagDefinition>;
    addTagsBatch: (entries: { slug: string; label: string }[]) => Promise<TagDefinition[]>;
  };
  ingredientLib: {
    ingredients: MasterIngredient[];
    loaded: boolean;
    addIngredient: (def: Omit<MasterIngredient, "id">) => Promise<MasterIngredient>;
    addIngredientsBatch: (defs: Omit<MasterIngredient, "id">[]) => Promise<MasterIngredient[]>;
    findByName: (name: string) => MasterIngredient | undefined;
  };
  mealCardSize: "small" | "medium" | "large";
}

const CARD_SIZES = {
  small: { height: "h-[160px]", grid: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" },
  medium: { height: "h-[220px]", grid: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" },
  large: { height: "h-[280px]", grid: "grid-cols-1 md:grid-cols-2" },
};

export default function MealLibrary({ mealLib, tagLib, ingredientLib, mealCardSize }: MealLibraryProps) {
  const { meals, loaded, addMeal, updateMeal, deleteMeal, importMeals } = mealLib;
  const { tags, loaded: tagsLoaded } = tagLib;
  const { ingredients, loaded: ingsLoaded, addIngredient } = ingredientLib;
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState<string>("");
  const [sortMode, setSortMode] = useState<SortMode>("name-az");
  const [viewMode, setViewMode] = useState<ViewMode>({ view: "grid" });

  // Quick-edit states
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [editingNotesValue, setEditingNotesValue] = useState("");
  const [editingUrlId, setEditingUrlId] = useState<string | null>(null);
  const [editingUrlValue, setEditingUrlValue] = useState("");

  // Image states
  const { images, reloadImage, removeImage } = useMealImages(meals);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" | "info" } | null>(null);

  if (!loaded || !tagsLoaded || !ingsLoaded) {
    return <p className="text-gray-500">Loading meals...</p>;
  }

  // Filter
  const filtered = meals.filter((meal) => {
    const matchesSearch =
      !searchQuery ||
      meal.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !filterTag || meal.tags.includes(filterTag);
    return matchesSearch && matchesTag;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    switch (sortMode) {
      case "name-az":
        return a.name.localeCompare(b.name);
      case "name-za":
        return b.name.localeCompare(a.name);
      case "by-tag": {
        const aTag = a.tags[0] || "zzz";
        const bTag = b.tags[0] || "zzz";
        const tagCmp = aTag.localeCompare(bTag);
        return tagCmp !== 0 ? tagCmp : a.name.localeCompare(b.name);
      }
      case "prep-time": {
        const aTime = Math.max(a.startTimeHours ?? 0, a.prepTimeHours ?? 0);
        const bTime = Math.max(b.startTimeHours ?? 0, b.prepTimeHours ?? 0);
        return bTime - aTime || a.name.localeCompare(b.name);
      }
      default:
        return 0;
    }
  });

  async function handleNewMeal() {
    try {
      const blank: MealDefinition = {
        name: "",
        ingredients: [],
        tags: [],
      };
      const newMeal = await addMeal(blank);
      setViewMode({ view: "details", mealId: newMeal.id });
    } catch (e) {
      console.error("Failed to create meal:", e);
      setToast({ message: "Failed to create meal", type: "error" });
    }
  }

  // Image handlers
  async function handleImageSaved(mealId: string, filename: string) {
    await updateMeal(mealId, { imageFilename: filename });
    reloadImage(mealId, filename);
  }

  async function handleImageRemoved(mealId: string) {
    await updateMeal(mealId, { imageFilename: undefined });
    removeImage(mealId);
  }

  // Quick-edit handlers
  function startEditNotes(meal: Meal) {
    setEditingNotesId(meal.id);
    setEditingNotesValue(meal.notes || "");
  }

  async function saveNotes(mealId: string) {
    try {
      await updateMeal(mealId, { notes: editingNotesValue.trim() || undefined });
      setEditingNotesId(null);
    } catch (e) {
      console.error("Failed to save notes:", e);
    }
  }

  function startEditUrl(meal: Meal) {
    setEditingUrlId(meal.id);
    setEditingUrlValue(meal.recipeUrl || "");
  }

  async function saveUrl(mealId: string) {
    try {
      await updateMeal(mealId, { recipeUrl: editingUrlValue.trim() || undefined });
      setEditingUrlId(null);
    } catch (e) {
      console.error("Failed to save URL:", e);
    }
  }

  function handleUrlKeyDown(e: React.KeyboardEvent, mealId: string) {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      saveUrl(mealId);
    }
  }

  function handleOpenUrl(e: React.MouseEvent, url: string) {
    e.preventDefault();
    e.stopPropagation();
    openExternal(url);
  }

  // Details view
  if (viewMode.view === "details") {
    const meal = meals.find((m) => m.id === viewMode.mealId);
    if (!meal) {
      // Meal was deleted — this is expected after handleDelete.
      // Return grid directly; React supports setState-during-render for own state.
      setViewMode({ view: "grid" });
      return null;
    }
    return (
      <MealDetails
        meal={meal}
        masterIngredients={ingredients}
        availableTags={tags}
        imageSrc={images.get(meal.id)}
        onUpdate={updateMeal}
        onDelete={deleteMeal}
        onBack={() => setViewMode({ view: "grid" })}
        onAddMasterIngredient={addIngredient}
        onImageSaved={handleImageSaved}
        onImageRemoved={handleImageRemoved}
      />
    );
  }

  if (viewMode.view === "import") {
    return (
      <MealImport
        ingredientLib={ingredientLib}
        tagLib={tagLib}
        onImport={importMeals}
        onClose={() => setViewMode({ view: "grid" })}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">
          Meal Library{" "}
          <span className="text-gray-400 font-normal text-base">
            ({meals.length} meals)
          </span>
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode({ view: "import" })}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Import JSON
          </button>
          <button
            onClick={handleNewMeal}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            + Add Meal
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Search meals..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All tags</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.label}
            </option>
          ))}
        </select>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          {([
            ["name-az", "A-Z"],
            ["name-za", "Z-A"],
            ["by-tag", "By Tag"],
            ["prep-time", "Prep Time"],
          ] as [SortMode, string][]).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setSortMode(mode)}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                sortMode === mode
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {meals.length === 0 ? (
            <div>
              <p className="text-lg mb-2">No meals yet</p>
              <p className="text-sm">Add meals manually or import them from a JSON file.</p>
            </div>
          ) : (
            <p>No meals match your search.</p>
          )}
        </div>
      ) : (
        <div className={`grid ${CARD_SIZES[mealCardSize].grid} gap-4`}>
          {sorted.map((meal) => {
            const imgSrc = images.get(meal.id);

            return (
              <div
                key={meal.id}
                onClick={() => setViewMode({ view: "details", mealId: meal.id })}
                className={`bg-white rounded-lg border ${CARD_BORDER} overflow-hidden hover:shadow-sm transition ${CARD_SIZES[mealCardSize].height} flex cursor-pointer`}
              >
                {/* Left: Info */}
                <div className="flex-1 p-3 flex flex-col min-w-0 overflow-hidden">
                  <h3 className="font-semibold text-gray-800 text-sm truncate mb-1">{meal.name || "Untitled Meal"}</h3>
                  {meal.sides && meal.sides.length > 0 && (
                    <p className="text-[10px] text-gray-500 truncate mb-1">+ {meal.sides.join(", ")}</p>
                  )}
                  {meal.tags.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mb-1">
                      {meal.tags.slice(0, 3).map((tag) => (
                        <TagBadge key={tag} tag={tag} allTags={tags} />
                      ))}
                      {meal.tags.length > 3 && (
                        <span className="text-[9px] text-gray-400">+{meal.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] text-gray-500 mb-1">
                    {meal.ingredients.length} ingredient{meal.ingredients.length !== 1 ? "s" : ""}
                    {meal.prepTimeHours ? ` · ${meal.prepTimeHours}h prep` : ""}
                    {meal.startTimeHours ? ` · ${meal.startTimeHours}h start` : ""}
                  </p>

                  {/* Recipe URL / Search link */}
                  <div className="text-[10px] mb-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {meal.recipeUrl ? (
                      <>
                        <a href={meal.recipeUrl} onClick={(e) => handleOpenUrl(e, meal.recipeUrl!)} className="text-blue-500 hover:text-blue-700 underline truncate cursor-pointer">
                          {(() => { try { return new URL(meal.recipeUrl).hostname.replace(/^www\./, ""); } catch { return "Recipe"; } })()}
                        </a>
                        <button onClick={() => startEditUrl(meal)} className="text-gray-400 hover:text-gray-600 shrink-0" title="Edit URL">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </button>
                      </>
                    ) : (
                      <>
                        <a
                          href="#"
                          onClick={(e) => handleOpenUrl(e, `https://www.google.com/search?q=${encodeURIComponent(meal.name + " recipe")}`)}
                          className="text-gray-400 hover:text-gray-600 italic cursor-pointer"
                        >
                          Search recipe
                        </a>
                        <button onClick={() => startEditUrl(meal)} className="text-gray-400 hover:text-gray-600 shrink-0" title="Add recipe URL">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </button>
                      </>
                    )}
                  </div>
                  {editingUrlId === meal.id && (
                    <input
                      type="url"
                      value={editingUrlValue}
                      onChange={(e) => setEditingUrlValue(e.target.value)}
                      onBlur={() => saveUrl(meal.id)}
                      onKeyDown={(e) => handleUrlKeyDown(e, meal.id)}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      placeholder="Paste recipe URL..."
                      className="w-full px-1.5 py-0.5 text-[10px] border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 mb-1"
                    />
                  )}

                  {/* Notes (quick-edit) */}
                  <div className="flex-1 min-h-0 mt-auto" onClick={(e) => e.stopPropagation()}>
                    {editingNotesId === meal.id ? (
                      <textarea
                        value={editingNotesValue}
                        onChange={(e) => setEditingNotesValue(e.target.value)}
                        onBlur={() => saveNotes(meal.id)}
                        autoFocus
                        rows={3}
                        className="w-full px-1.5 py-0.5 text-[10px] border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                      />
                    ) : (
                      <div
                        onClick={() => startEditNotes(meal)}
                        className="text-[10px] text-gray-400 line-clamp-3 cursor-text hover:text-gray-500"
                        title="Click to edit notes"
                      >
                        {meal.notes ? (
                          <NoteText text={meal.notes} className="text-[10px] text-gray-400" />
                        ) : (
                          <span className="italic">Add notes...</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Image */}
                <MealImagePanel
                  mealId={meal.id}
                  mealName={meal.name}
                  recipeUrl={meal.recipeUrl}
                  imageFilename={meal.imageFilename}
                  imageSrc={imgSrc}
                  compact
                  onImageSaved={handleImageSaved}
                  onImageRemoved={handleImageRemoved}
                  onToast={(msg, type) => setToast({ message: msg, type })}
                />
              </div>
            );
          })}
        </div>
      )}
      {toast && (
        <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />
      )}
    </div>
  );
}
