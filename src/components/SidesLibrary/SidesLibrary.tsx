import { useState } from "react";
import type { Side, SideDefinition, MasterIngredient } from "../../types/meals";
import NoteText from "../common/NoteText";
import SideDetails from "./SideDetails";
import Toast from "../common/Toast";
import { CARD_BORDER } from "../../lib/theme";
import { useMealImages } from "../../hooks/useMealImages";
import MealImagePanel from "../MealLibrary/MealImagePanel";
import { openExternal } from "../../lib/openExternal";

type SortMode = "name-az" | "name-za" | "prep-time";

type ViewMode =
  | { view: "grid" }
  | { view: "details"; sideId: string };

interface SidesLibraryProps {
  sidesLib: {
    sides: Side[];
    loaded: boolean;
    addSide: (def: SideDefinition) => Promise<Side>;
    updateSide: (id: string, def: Partial<SideDefinition>) => Promise<void>;
    deleteSide: (id: string) => Promise<void>;
  };
  ingredientLib: {
    ingredients: MasterIngredient[];
    loaded: boolean;
    addIngredient: (def: Omit<MasterIngredient, "id">) => Promise<MasterIngredient>;
  };
  mealCardSize: "small" | "medium" | "large";
}

const CARD_SIZES = {
  small: { height: "h-[160px]", grid: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" },
  medium: { height: "h-[220px]", grid: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" },
  large: { height: "h-[280px]", grid: "grid-cols-1 md:grid-cols-2" },
};

export default function SidesLibrary({ sidesLib, ingredientLib, mealCardSize }: SidesLibraryProps) {
  const { sides, loaded, addSide, updateSide, deleteSide } = sidesLib;
  const { ingredients, loaded: ingsLoaded, addIngredient } = ingredientLib;

  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("name-az");
  const [viewMode, setViewMode] = useState<ViewMode>({ view: "grid" });
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [editingNotesValue, setEditingNotesValue] = useState("");
  const [editingUrlId, setEditingUrlId] = useState<string | null>(null);
  const [editingUrlValue, setEditingUrlValue] = useState("");

  const { images, reloadImage, removeImage } = useMealImages(sides);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" | "info" } | null>(null);

  if (!loaded || !ingsLoaded) {
    return <p className="text-gray-500">Loading sides...</p>;
  }

  const filtered = sides.filter((side) => {
    if (!searchQuery) return true;
    return side.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortMode) {
      case "name-az":
        return a.name.localeCompare(b.name);
      case "name-za":
        return b.name.localeCompare(a.name);
      case "prep-time": {
        const aTime = Math.max(a.startTimeHours ?? 0, a.prepTimeHours ?? 0);
        const bTime = Math.max(b.startTimeHours ?? 0, b.prepTimeHours ?? 0);
        return bTime - aTime || a.name.localeCompare(b.name);
      }
      default:
        return 0;
    }
  });

  async function handleNewSide() {
    try {
      const blank: SideDefinition = { name: "", ingredients: [], tags: [] };
      const newSide = await addSide(blank);
      setViewMode({ view: "details", sideId: newSide.id });
    } catch (e) {
      console.error("Failed to create side:", e);
      setToast({ message: "Failed to create side", type: "error" });
    }
  }

  async function handleImageSaved(sideId: string, filename: string) {
    await updateSide(sideId, { imageFilename: filename });
    reloadImage(sideId, filename);
  }

  async function handleImageRemoved(sideId: string) {
    await updateSide(sideId, { imageFilename: undefined });
    removeImage(sideId);
  }

  function startEditNotes(side: Side) {
    setEditingNotesId(side.id);
    setEditingNotesValue(side.notes || "");
  }
  async function saveNotes(sideId: string) {
    try {
      await updateSide(sideId, { notes: editingNotesValue.trim() || undefined });
      setEditingNotesId(null);
    } catch (e) {
      console.error("Failed to save notes:", e);
    }
  }

  function startEditUrl(side: Side) {
    setEditingUrlId(side.id);
    setEditingUrlValue(side.recipeUrl || "");
  }
  async function saveUrl(sideId: string) {
    try {
      await updateSide(sideId, { recipeUrl: editingUrlValue.trim() || undefined });
      setEditingUrlId(null);
    } catch (e) {
      console.error("Failed to save URL:", e);
    }
  }
  function handleUrlKeyDown(e: React.KeyboardEvent, sideId: string) {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      saveUrl(sideId);
    }
  }
  function handleOpenUrl(e: React.MouseEvent, url: string) {
    e.preventDefault();
    e.stopPropagation();
    openExternal(url);
  }

  if (viewMode.view === "details") {
    const side = sides.find((s) => s.id === viewMode.sideId);
    if (!side) {
      setViewMode({ view: "grid" });
      return null;
    }
    return (
      <SideDetails
        side={side}
        masterIngredients={ingredients}
        imageSrc={images.get(side.id)}
        onUpdate={updateSide}
        onDelete={deleteSide}
        onBack={() => setViewMode({ view: "grid" })}
        onAddMasterIngredient={addIngredient}
        onImageSaved={handleImageSaved}
        onImageRemoved={handleImageRemoved}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">
          Sides Library{" "}
          <span className="text-gray-400 font-normal text-base">
            ({sides.length} side{sides.length !== 1 ? "s" : ""})
          </span>
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleNewSide}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            + Add Side
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Search sides..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          {([
            ["name-az", "A-Z"],
            ["name-za", "Z-A"],
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
          {sides.length === 0 ? (
            <div>
              <p className="text-lg mb-2">No sides yet</p>
              <p className="text-sm">Add sides to mix and match with your meals.</p>
            </div>
          ) : (
            <p>No sides match your search.</p>
          )}
        </div>
      ) : (
        <div className={`grid ${CARD_SIZES[mealCardSize].grid} gap-4`}>
          {sorted.map((side) => {
            const imgSrc = images.get(side.id);
            return (
              <div
                key={side.id}
                onClick={() => setViewMode({ view: "details", sideId: side.id })}
                className={`bg-white rounded-lg border ${CARD_BORDER} overflow-hidden hover:shadow-sm transition ${CARD_SIZES[mealCardSize].height} flex cursor-pointer`}
              >
                <div className="flex-1 p-3 flex flex-col min-w-0 overflow-hidden">
                  <h3 className="font-semibold text-gray-800 text-sm truncate mb-1">
                    {side.name || "Untitled Side"}
                  </h3>
                  <p className="text-[10px] text-gray-500 mb-1">
                    {side.ingredients.length} ingredient{side.ingredients.length !== 1 ? "s" : ""}
                    {side.prepTimeHours ? ` · ${side.prepTimeHours}h prep` : ""}
                    {side.startTimeHours ? ` · ${side.startTimeHours}h start` : ""}
                  </p>

                  <div
                    className="text-[10px] mb-1 flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {side.recipeUrl ? (
                      <>
                        <a
                          href={side.recipeUrl}
                          onClick={(e) => handleOpenUrl(e, side.recipeUrl!)}
                          className="text-blue-500 hover:text-blue-700 underline truncate cursor-pointer"
                        >
                          {(() => {
                            try {
                              return new URL(side.recipeUrl).hostname.replace(/^www\./, "");
                            } catch {
                              return "Recipe";
                            }
                          })()}
                        </a>
                        <button
                          onClick={() => startEditUrl(side)}
                          className="text-gray-400 hover:text-gray-600 shrink-0"
                          title="Edit URL"
                        >
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <>
                        <a
                          href="#"
                          onClick={(e) =>
                            handleOpenUrl(
                              e,
                              `https://www.google.com/search?q=${encodeURIComponent(side.name + " recipe")}`,
                            )
                          }
                          className="text-gray-400 hover:text-gray-600 italic cursor-pointer"
                        >
                          Search recipe
                        </a>
                        <button
                          onClick={() => startEditUrl(side)}
                          className="text-gray-400 hover:text-gray-600 shrink-0"
                          title="Add recipe URL"
                        >
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                  {editingUrlId === side.id && (
                    <input
                      type="url"
                      value={editingUrlValue}
                      onChange={(e) => setEditingUrlValue(e.target.value)}
                      onBlur={() => saveUrl(side.id)}
                      onKeyDown={(e) => handleUrlKeyDown(e, side.id)}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      placeholder="Paste recipe URL..."
                      className="w-full px-1.5 py-0.5 text-[10px] border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 mb-1"
                    />
                  )}

                  <div
                    className="flex-1 min-h-0 mt-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {editingNotesId === side.id ? (
                      <textarea
                        value={editingNotesValue}
                        onChange={(e) => setEditingNotesValue(e.target.value)}
                        onBlur={() => saveNotes(side.id)}
                        autoFocus
                        rows={3}
                        className="w-full px-1.5 py-0.5 text-[10px] border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                      />
                    ) : (
                      <div
                        onClick={() => startEditNotes(side)}
                        className="text-[10px] text-gray-400 line-clamp-3 cursor-text hover:text-gray-500"
                        title="Click to edit notes"
                      >
                        {side.notes ? (
                          <NoteText text={side.notes} className="text-[10px] text-gray-400" />
                        ) : (
                          <span className="italic">Add notes...</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <MealImagePanel
                  mealId={side.id}
                  mealName={side.name}
                  recipeUrl={side.recipeUrl}
                  imageFilename={side.imageFilename}
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
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
