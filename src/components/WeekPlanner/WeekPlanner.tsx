import { useState } from "react";
import type { Meal, Side, TagDefinition, MasterIngredient } from "../../types/meals";
import type { DayPlan, Deal, ManualItem } from "../../types/planner";
import { getDisplayOrder } from "../../types/planner";
import DayCard from "./DayCard";
import DealsPanel from "./DealsPanel";
import ConfirmDialog from "../common/ConfirmDialog";

interface WeekPlannerProps {
  weekOf: string;
  days: DayPlan[];
  deals: Deal[];
  meals: Meal[];
  sides: Side[];
  availableTags: TagDefinition[];
  masterIngredients: MasterIngredient[];
  firstDayOfWeek: number;
  onSetDayTags: (dayOfWeek: number, tags: string[]) => void;
  onToggleLock: (dayOfWeek: number) => void;
  onSetDayMeal: (dayOfWeek: number, mealId: string | undefined) => void;
  onSetSideAt: (dayOfWeek: number, chipIndex: number, sideId: string) => void;
  onAddSideChip: (dayOfWeek: number) => void;
  onRemoveSideChip: (dayOfWeek: number, chipIndex: number) => void;
  onAutoFill: () => void;
  onRegenerateDay: (dayOfWeek: number) => void;
  onClearWeek: () => void;
  onResetAll: () => void;
  onAddDeal: (deal: Deal) => void;
  onRemoveDeal: (index: number) => void;
  onUpdateDeal: (index: number, deal: Deal) => void;
  dinnerTime: string;
  onSetDayManualItems: (dayOfWeek: number, items: ManualItem[]) => void;
  mealImages: Map<string, string>;
}

export default function WeekPlanner({
  weekOf,
  days,
  deals,
  meals,
  sides,
  availableTags,
  masterIngredients,
  firstDayOfWeek,
  onSetDayTags,
  onToggleLock,
  onSetDayMeal,
  onSetSideAt,
  onAddSideChip,
  onRemoveSideChip,
  onAutoFill,
  onRegenerateDay,
  onClearWeek,
  onResetAll,
  onAddDeal,
  onRemoveDeal,
  onUpdateDeal,
  dinnerTime,
  onSetDayManualItems,
  mealImages,
}: WeekPlannerProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  type CardView = "normal" | "qr" | "image";
  const [cardView, setCardView] = useState<CardView>("normal");

  function getMeal(mealId?: string): Meal | undefined {
    if (!mealId) return undefined;
    return meals.find((m) => m.id === mealId);
  }

  return (
    <div>
      {showResetConfirm && (
        <ConfirmDialog
          message="Reset everything? This will clear all meal assignments, day tags, deals, category selections, and manual items for this week. It will also reset meal cooldowns so previously used meals can be selected again by auto-fill."
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
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {([
              ["normal", "Normal"],
              ["qr", "QR Codes"],
              ["image", "Images"],
            ] as [CardView, string][]).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setCardView(mode)}
                className={`px-3 py-1.5 text-xs font-medium transition ${
                  cardView === mode
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
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

      <div className="grid grid-cols-4 min-[1000px]:grid-cols-7 gap-3 mb-6">
        {getDisplayOrder(firstDayOfWeek).map((dow) => days.find((d) => d.dayOfWeek === dow)).filter((d): d is DayPlan => !!d).map((day) => (
          <DayCard
            key={day.dayOfWeek}
            day={day}
            meal={getMeal(day.assignedMealId)}
            allMeals={meals}
            allSides={sides}
            availableTags={availableTags}
            onTagsChange={(tags) => onSetDayTags(day.dayOfWeek, tags)}
            onToggleLock={() => onToggleLock(day.dayOfWeek)}
            onRegenerate={() => onRegenerateDay(day.dayOfWeek)}
            onSetMeal={(id) => onSetDayMeal(day.dayOfWeek, id)}
            onSetSideAt={(idx, sideId) => onSetSideAt(day.dayOfWeek, idx, sideId)}
            onAddSideChip={() => onAddSideChip(day.dayOfWeek)}
            onRemoveSideChip={(idx) => onRemoveSideChip(day.dayOfWeek, idx)}
            cardView={cardView}
            dinnerTime={dinnerTime}
            weekOf={weekOf}
            masterIngredients={masterIngredients}
            mealImageSrc={day.assignedMealId ? mealImages.get(day.assignedMealId) : undefined}
            manualItems={day.manualItems || []}
            onManualItemsChange={(items) => onSetDayManualItems(day.dayOfWeek, items)}
          />
        ))}
      </div>

      <DealsPanel deals={deals} onAddDeal={onAddDeal} onRemoveDeal={onRemoveDeal} onUpdateDeal={onUpdateDeal} masterIngredients={masterIngredients} />
    </div>
  );
}
