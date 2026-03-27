import type { Meal } from "../../types/meals";
import { useWeekPlanner } from "../../hooks/useWeekPlanner";
import WeekPlanner from "./WeekPlanner";
import CategoryPlanner from "../CategoryPlanner/CategoryPlanner";

interface PlannerPageProps {
  meals: Meal[];
}

export default function PlannerPage({ meals }: PlannerPageProps) {
  const {
    plan,
    deals,
    loaded,
    setDayTags,
    toggleLock,
    setDayMeal,
    autoFillWeek,
    regenerateSingleDay,
    clearWeek,
    setCategorySelections,
    addDeal,
    removeDeal,
  } = useWeekPlanner(meals);

  if (!loaded || !plan) {
    return <p className="text-gray-500">Loading planner...</p>;
  }

  return (
    <div className="space-y-8">
      <WeekPlanner
        weekOf={plan.weekOf}
        days={plan.days}
        deals={deals}
        meals={meals}
        onSetDayTags={setDayTags}
        onToggleLock={toggleLock}
        onSetDayMeal={setDayMeal}
        onAutoFill={autoFillWeek}
        onRegenerateDay={regenerateSingleDay}
        onClearWeek={clearWeek}
        onAddDeal={addDeal}
        onRemoveDeal={removeDeal}
      />

      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Breakfast, Lunch & Snacks
        </h2>
        <CategoryPlanner
          breakfastSelections={plan.breakfastSelections}
          lunchSelections={plan.lunchSelections}
          snackSelections={plan.snackSelections}
          onBreakfastChange={(ids) =>
            setCategorySelections("breakfastSelections", ids)
          }
          onLunchChange={(ids) =>
            setCategorySelections("lunchSelections", ids)
          }
          onSnackChange={(ids) =>
            setCategorySelections("snackSelections", ids)
          }
        />
      </div>
    </div>
  );
}
