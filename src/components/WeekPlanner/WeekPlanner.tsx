import { useState } from "react";
import type { Meal, TagDefinition, MasterIngredient } from "../../types/meals";
import type { DayPlan, Deal } from "../../types/planner";
import { getDisplayOrder } from "../../types/planner";
import DayCard from "./DayCard";
import DealsPanel from "./DealsPanel";
import ConfirmDialog from "../common/ConfirmDialog";

interface WeekPlannerProps {
  weekOf: string;
  days: DayPlan[];
  deals: Deal[];
  meals: Meal[];
  availableTags: TagDefinition[];
  masterIngredients: MasterIngredient[];
  firstDayOfWeek: number;
  onSetDayTags: (dayOfWeek: number, tags: string[]) => void;
  onToggleLock: (dayOfWeek: number) => void;
  onSetDayMeal: (dayOfWeek: number, mealId: string | undefined) => void;
  onAutoFill: () => void;
  onRegenerateDay: (dayOfWeek: number) => void;
  onClearWeek: () => void;
  onResetAll: () => void;
  onAddDeal: (deal: Deal) => void;
  onRemoveDeal: (index: number) => void;
}

export default function WeekPlanner({
  weekOf,
  days,
  deals,
  meals,
  availableTags,
  masterIngredients,
  firstDayOfWeek,
  onSetDayTags,
  onToggleLock,
  onSetDayMeal,
  onAutoFill,
  onRegenerateDay,
  onClearWeek,
  onResetAll,
  onAddDeal,
  onRemoveDeal,
}: WeekPlannerProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  function getMeal(mealId?: string): Meal | undefined {
    if (!mealId) return undefined;
    return meals.find((m) => m.id === mealId);
  }

  return (
    <div>
      {showResetConfirm && (
        <ConfirmDialog
          message="Reset everything? This will clear all meal assignments, day tags, deals, and category selections for this week."
          confirmLabel="Reset All"
          danger
          onConfirm={() => {
            setShowResetConfirm(false);
            onResetAll();
          }}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Weekly Planner</h2>
          <p className="text-sm text-gray-500">Week of {weekOf}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50"
          >
            Reset All
          </button>
          <button
            onClick={onClearWeek}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Clear Week
          </button>
          <button
            onClick={onAutoFill}
            disabled={meals.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Auto-Fill Week
          </button>
        </div>
      </div>

      {meals.length === 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
          Add some meals to your library first before planning.
        </div>
      )}

      <div className="grid grid-cols-7 gap-3 mb-6">
        {getDisplayOrder(firstDayOfWeek).map((dow) => days.find((d) => d.dayOfWeek === dow)!).map((day) => (
          <DayCard
            key={day.dayOfWeek}
            day={day}
            meal={getMeal(day.assignedMealId)}
            allMeals={meals}
            availableTags={availableTags}
            onTagsChange={(tags) => onSetDayTags(day.dayOfWeek, tags)}
            onToggleLock={() => onToggleLock(day.dayOfWeek)}
            onRegenerate={() => onRegenerateDay(day.dayOfWeek)}
            onSetMeal={(id) => onSetDayMeal(day.dayOfWeek, id)}
          />
        ))}
      </div>

      <DealsPanel deals={deals} onAddDeal={onAddDeal} onRemoveDeal={onRemoveDeal} masterIngredients={masterIngredients} />
    </div>
  );
}
