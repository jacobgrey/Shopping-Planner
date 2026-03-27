import { useState, useRef, useEffect } from "react";
import type { DayPlan } from "../../types/planner";
import type { Meal, TagDefinition } from "../../types/meals";
import { DAY_NAMES } from "../../types/planner";
import TagBadge from "../common/TagBadge";
import TagSelector from "./TagSelector";
import NoteText from "../common/NoteText";

interface DayCardProps {
  day: DayPlan;
  meal: Meal | undefined;
  allMeals: Meal[];
  availableTags: TagDefinition[];
  onTagsChange: (tags: string[]) => void;
  onToggleLock: () => void;
  onRegenerate: () => void;
  onSetMeal: (mealId: string | undefined) => void;
}

export default function DayCard({
  day,
  meal,
  allMeals,
  availableTags,
  onTagsChange,
  onToggleLock,
  onRegenerate,
  onSetMeal,
}: DayCardProps) {
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showMealPicker, setShowMealPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

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
      className={`bg-white rounded-lg border p-3 relative ${
        day.locked ? "border-blue-300 bg-blue-50/30" : "border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm text-gray-800">
          {DAY_NAMES[day.dayOfWeek]}
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

      <div className="border-t border-gray-100 pt-2">
        {meal ? (
          <div>
            <p className="text-sm font-medium text-gray-800">{meal.name}</p>
            {meal.sides && meal.sides.length > 0 && (
              <p className="text-xs text-gray-500">
                + {meal.sides.join(", ")}
              </p>
            )}
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
                filteredMeals.map((m) => (
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
                    {m.sides && m.sides.length > 0 && (
                      <span className="text-gray-400 ml-1">+ {m.sides.join(", ")}</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
