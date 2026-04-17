import { useState, useRef, useEffect } from "react";
import type { DayPlan, ManualItem } from "../../types/planner";
import type { Meal, Side, TagDefinition, MasterIngredient } from "../../types/meals";
import { DAY_NAMES } from "../../types/planner";
import TagBadge from "../common/TagBadge";
import TagSelector from "./TagSelector";
import NoteText from "../common/NoteText";
import { QRCodeSVG } from "qrcode.react";
import { buildCalendarEvent } from "../../lib/calendarUrl";
import { CARD_BORDER } from "../../lib/theme";
import ManualItemChips from "../common/ManualItemChips";
import SidePicker from "./SidePicker";

interface DayCardProps {
  day: DayPlan;
  meal: Meal | undefined;
  allMeals: Meal[];
  allSides: Side[];
  availableTags: TagDefinition[];
  onTagsChange: (tags: string[]) => void;
  onToggleLock: () => void;
  onRegenerate: () => void;
  onSetMeal: (mealId: string | undefined) => void;
  onSetSideAt: (chipIndex: number, sideId: string) => void;
  onAddSideChip: () => void;
  onRemoveSideChip: (chipIndex: number) => void;
  cardView: "normal" | "qr" | "image";
  dinnerTime?: string;
  weekOf?: string;
  masterIngredients?: MasterIngredient[];
  mealImageSrc?: string;
  manualItems: ManualItem[];
  onManualItemsChange: (items: ManualItem[]) => void;
}

export default function DayCard({
  day,
  meal,
  allMeals,
  allSides,
  availableTags,
  onTagsChange,
  onToggleLock,
  onRegenerate,
  onSetMeal,
  onSetSideAt,
  onAddSideChip,
  onRemoveSideChip,
  cardView,
  dinnerTime,
  weekOf,
  masterIngredients,
  mealImageSrc,
  manualItems,
  onManualItemsChange,
}: DayCardProps) {
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showMealPicker, setShowMealPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [openSidePickerIdx, setOpenSidePickerIdx] = useState<number | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Resolve assigned side IDs into Side objects (skip missing ones gracefully)
  const assignedSideIds = day.assignedSideIds ?? [];
  const sideLookup = (id: string) => allSides.find((s) => s.id === id);

  // Close picker on click outside
  useEffect(() => {
    if (!showMealPicker) return;
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowMealPicker(false);
        setPickerSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMealPicker]);

  // Compute QR code URL for calendar reminder
  function getQRUrl(): string | null {
    if (!meal || !weekOf || !dinnerTime) return null;
    const baseDate = new Date(weekOf + "T00:00:00");
    baseDate.setDate(baseDate.getDate() + day.dayOfWeek);
    const isoDate = baseDate.toISOString().slice(0, 10);
    const [dh, dm] = dinnerTime.split(":").map(Number);
    const dinnerDecimal = dh + dm / 60;
    const leadTime = Math.max(meal.startTimeHours ?? 0, meal.prepTimeHours ?? 0);
    const offset = leadTime > 0 ? leadTime + 0.5 : 1.5;
    const startHour = dinnerDecimal - offset;
    // Build event description: recipe URL, notes, then ingredients
    const detailParts: string[] = [];
    if (meal.recipeUrl) detailParts.push(meal.recipeUrl);
    if (meal.notes) {
      if (detailParts.length > 0) detailParts.push("");
      detailParts.push(meal.notes);
    }
    if (meal.ingredients.length > 0 && masterIngredients) {
      if (detailParts.length > 0) detailParts.push("");
      detailParts.push("Ingredients:");
      for (const ing of meal.ingredients) {
        const master = masterIngredients.find((m) => m.id === ing.ingredientId);
        const name = master?.name ?? "Unknown";
        const qty = ing.quantity != null ? `${ing.quantity} ${master?.defaultUnit ?? ""}`.trim() : "";
        detailParts.push(qty ? `- ${qty} ${name}` : `- ${name}`);
      }
    }

    return buildCalendarEvent({
      title: `Start prepping ${meal.name}`,
      date: isoDate,
      startHour: Math.max(0, startHour),
      endHour: dinnerDecimal,
      description: detailParts.length > 0 ? detailParts.join("\n") : undefined,
    });
  }

  // Show red clock if meal has significant lead time (>2 hours)
  const hasLongLeadTime = meal && Math.max(meal.startTimeHours ?? 0, meal.prepTimeHours ?? 0) > 2;

  // Filter meals: by day tags (if set) then by search text
  const filteredMeals = allMeals.filter((m) => {
    if (day.tags.length > 0) {
      const hasMatch = day.tags.some((t) => m.tags.includes(t));
      if (!hasMatch) return false;
    }
    if (pickerSearch) {
      return m.name.toLowerCase().includes(pickerSearch.toLowerCase());
    }
    return true;
  });

  return (
    <div
      className={`bg-white rounded-lg border p-3 relative flex flex-col ${
        day.locked ? "border-blue-300 bg-blue-50/30" : CARD_BORDER
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm text-gray-800 flex items-center gap-1">
          {DAY_NAMES[day.dayOfWeek]}
          {hasLongLeadTime && (
            <span title="Long prep time — consider setting a reminder">
              <svg className="w-3.5 h-3.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </span>
          )}
        </h3>
        <button
          onClick={onToggleLock}
          className={`text-xs px-1.5 py-0.5 rounded ${
            day.locked
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-500"
          }`}
          title={day.locked ? "Unlock" : "Lock"}
        >
          {day.locked ? "Locked" : "Lock"}
        </button>
      </div>

      <div className="mb-2">
        {day.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1 mb-1">
            {day.tags.map((tag) => (
              <TagBadge
                key={tag}
                tag={tag}
                allTags={availableTags}
                onRemove={() =>
                  onTagsChange(day.tags.filter((t) => t !== tag))
                }
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 mb-1">No preferences set</p>
        )}
        <button
          onClick={() => setShowTagPicker(!showTagPicker)}
          className="text-[10px] text-blue-600 hover:text-blue-800"
        >
          {showTagPicker ? "Hide tags" : "Edit tags"}
        </button>
        {showTagPicker && (
          <div className="mt-1">
            <TagSelector
              selected={day.tags}
              availableTags={availableTags}
              onChange={onTagsChange}
            />
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 pt-2 flex-1 flex flex-col">
        {cardView === "qr" && meal ? (
          <>
            <p className="text-sm font-medium text-gray-800 mb-2">{meal.name}</p>
            <div className="mt-auto">
              {(() => {
                const url = getQRUrl();
                return url ? (
                  <QRCodeSVG value={url} size={256} level="L" style={{ width: "100%", height: "auto" }} />
                ) : null;
              })()}
            </div>
          </>
        ) : cardView === "image" && meal ? (
          <>
            <p className="text-sm font-medium text-gray-800 mb-2">{meal.name}</p>
            <div className="mt-auto flex-1 flex items-center justify-center">
              {mealImageSrc ? (
                <img src={mealImageSrc} alt={meal.name} className="w-full h-auto rounded object-cover" />
              ) : (
                <p className="text-xs text-gray-400 italic">No image</p>
              )}
            </div>
          </>
        ) : meal ? (
          <div>
            <p className="text-sm font-medium text-gray-800">{meal.name}</p>
            <div className="flex flex-wrap items-center gap-1 mt-1">
              {assignedSideIds.map((sideId, idx) => {
                const side = sideLookup(sideId);
                return (
                  <span
                    key={`${sideId}-${idx}`}
                    className="relative inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-700 border border-gray-200"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenSidePickerIdx(openSidePickerIdx === idx ? null : idx);
                      }}
                      className="hover:text-blue-700"
                      title="Change side"
                    >
                      {side?.name ?? "(missing)"}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSideChip(idx);
                        if (openSidePickerIdx === idx) setOpenSidePickerIdx(null);
                      }}
                      className="text-gray-400 hover:text-red-500 leading-none"
                      title="Remove"
                    >
                      &times;
                    </button>
                    {openSidePickerIdx === idx && (
                      <SidePicker
                        sides={allSides}
                        meal={meal}
                        currentSideId={sideId}
                        onPick={(newId) => {
                          onSetSideAt(idx, newId);
                          setOpenSidePickerIdx(null);
                        }}
                        onClose={() => setOpenSidePickerIdx(null)}
                      />
                    )}
                  </span>
                );
              })}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddSideChip();
                }}
                className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-dashed border-gray-300 text-gray-400 hover:text-blue-600 hover:border-blue-400 text-xs leading-none"
                title="Add side"
                disabled={allSides.length === 0}
              >
                +
              </button>
            </div>
            {meal.notes && (
              <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">
                <NoteText text={meal.notes} className="text-[10px] text-gray-400" />
              </p>
            )}
            <div className="flex gap-2 mt-1">
              <button
                onClick={onRegenerate}
                className="text-[10px] text-blue-600 hover:text-blue-800"
              >
                Regenerate
              </button>
              <button
                onClick={() => {
                  setShowMealPicker(!showMealPicker);
                  setPickerSearch("");
                }}
                className="text-[10px] text-gray-500 hover:text-gray-700"
              >
                Change
              </button>
              <button
                onClick={() => onSetMeal(undefined)}
                className="text-[10px] text-red-500 hover:text-red-700"
              >
                Clear
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs text-gray-400 italic mb-1">No meal assigned</p>
            <button
              onClick={() => {
                setShowMealPicker(!showMealPicker);
                setPickerSearch("");
              }}
              className="text-[10px] text-blue-600 hover:text-blue-800"
            >
              Pick manually
            </button>
          </div>
        )}

        {showMealPicker && (
          <div
            ref={pickerRef}
            className="absolute left-0 right-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg"
            style={{ top: "100%" }}
          >
            <div className="p-1.5 border-b border-gray-100">
              <input
                type="text"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Search meals..."
                autoFocus
                className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              {day.tags.length > 0 && (
                <p className="text-[9px] text-gray-400 mt-0.5 px-1">
                  Filtered by day tags ({filteredMeals.length} match{filteredMeals.length !== 1 ? "es" : ""})
                </p>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filteredMeals.length === 0 ? (
                <p className="px-2 py-2 text-xs text-gray-400">No matching meals</p>
              ) : (
                filteredMeals.map((m) => {
                  const preferredNames = (m.preferredSideIds ?? [])
                    .map((sid) => allSides.find((s) => s.id === sid)?.name)
                    .filter(Boolean) as string[];
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        onSetMeal(m.id);
                        setShowMealPicker(false);
                        setPickerSearch("");
                      }}
                      className={`block w-full text-left px-2 py-1.5 text-xs hover:bg-blue-50 ${
                        meal?.id === m.id ? "bg-blue-50 font-medium" : ""
                      }`}
                    >
                      {m.name}
                      {preferredNames.length > 0 && (
                        <span className="text-gray-400 ml-1">+ {preferredNames.join(", ")}</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
      {cardView === "normal" && (
        <div className="border-t border-gray-100 pt-1.5 mt-1.5">
          <ManualItemChips items={manualItems} onChange={onManualItemsChange} compact />
        </div>
      )}
    </div>
  );
}
