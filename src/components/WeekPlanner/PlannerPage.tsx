import type { Meal, TagDefinition, CategoryItem, MasterIngredient } from "../../types/meals";
import { useWeekPlanner } from "../../hooks/useWeekPlanner";
import WeekPlanner from "./WeekPlanner";
import CategoryPlanner from "../CategoryPlanner/CategoryPlanner";

interface PlannerPageProps {
  meals: Meal[];
  tags: TagDefinition[];
  masterIngredients: MasterIngredient[];
  firstDayOfWeek: number;
  categoryItemLib: {
    breakfastItems: CategoryItem[];
    lunchItems: CategoryItem[];
    snackItems: CategoryItem[];
    otherItems: CategoryItem[];
    addItem: (def: Omit<CategoryItem, "id">) => Promise<CategoryItem>;
    updateItem: (id: string, updates: Partial<Omit<CategoryItem, "id">>) => void;
    deleteItem: (id: string) => void;
    resetQuantities: () => Promise<void>;
  };
}

export default function PlannerPage({ meals, tags, masterIngredients, firstDayOfWeek, categoryItemLib }: PlannerPageProps) {
  const planner = useWeekPlanner(meals, firstDayOfWeek);

  if (!planner.loaded || !planner.plan) {
    return <p className="text-gray-500">Loading planner...</p>;
  }

  return (
    <div className="space-y-8">
      <WeekPlanner
        weekOf={planner.plan.weekOf}
        days={planner.plan.days}
        deals={planner.deals}
        meals={meals}
        availableTags={tags}
        masterIngredients={masterIngredients}
        firstDayOfWeek={firstDayOfWeek}
        onSetDayTags={planner.setDayTags}
        onToggleLock={planner.toggleLock}
        onSetDayMeal={planner.setDayMeal}
        onAutoFill={planner.autoFillWeek}
        onRegenerateDay={planner.regenerateSingleDay}
        onClearWeek={planner.clearWeek}
        onResetAll={async () => {
          await planner.resetAll();
          await categoryItemLib.resetQuantities();
        }}
        onAddDeal={planner.addDeal}
        onRemoveDeal={planner.removeDeal}
        onUpdateDeal={planner.updateDeal}
      />

      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Breakfast, Lunch & Snacks
        </h2>
        <CategoryPlanner
          breakfastItems={categoryItemLib.breakfastItems}
          lunchItems={categoryItemLib.lunchItems}
          snackItems={categoryItemLib.snackItems}
          otherItems={categoryItemLib.otherItems}
          breakfastSelections={planner.plan.breakfastSelections}
          lunchSelections={planner.plan.lunchSelections}
          snackSelections={planner.plan.snackSelections}
          otherSelections={planner.plan.otherSelections || []}
          otherNotes={planner.plan.otherNotes || ""}
          onBreakfastChange={(ids) => planner.setCategorySelections("breakfastSelections", ids)}
          onLunchChange={(ids) => planner.setCategorySelections("lunchSelections", ids)}
          onSnackChange={(ids) => planner.setCategorySelections("snackSelections", ids)}
          onOtherChange={(ids) => planner.setCategorySelections("otherSelections", ids)}
          onOtherNotesChange={planner.setOtherNotes}
          onAddItem={categoryItemLib.addItem}
          onUpdateItem={categoryItemLib.updateItem}
          onDeleteItem={categoryItemLib.deleteItem}
        />
      </div>
    </div>
  );
}
