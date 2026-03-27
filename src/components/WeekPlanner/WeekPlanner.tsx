import type { Meal, TagDefinition } from "../../types/meals";
import type { DayPlan, Deal } from "../../types/planner";
import DayCard from "./DayCard";
import DealsPanel from "./DealsPanel";

interface WeekPlannerProps {
  weekOf: string;
  days: DayPlan[];
  deals: Deal[];
  meals: Meal[];
  availableTags: TagDefinition[];
  onSetDayTags: (dayOfWeek: number, tags: string[]) => void;
  onToggleLock: (dayOfWeek: number) => void;
  onSetDayMeal: (dayOfWeek: number, mealId: string | undefined) => void;
  onAutoFill: () => void;
  onRegenerateDay: (dayOfWeek: number) => void;
  onClearWeek: () => void;
  onAddDeal: (deal: Deal) => void;
  onRemoveDeal: (index: number) => void;
}

export default function WeekPlanner({
  weekOf,
  days,
  deals,
  meals,
  availableTags,
  onSetDayTags,
  onToggleLock,
  onSetDayMeal,
  onAutoFill,
  onRegenerateDay,
  onClearWeek,
  onAddDeal,
  onRemoveDeal,
}: WeekPlannerProps) {
  function getMeal(mealId?: string): Meal | undefined {
    if (!mealId) return undefined;
    return meals.find((m) => m.id === mealId);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Weekly Planner</h2>
          <p className="text-sm text-gray-500">Week of {weekOf}</p>
        </div>
        <div className="flex gap-2">
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
        {days.map((day) => (
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

      <DealsPanel deals={deals} onAddDeal={onAddDeal} onRemoveDeal={onRemoveDeal} />
    </div>
  );
}
