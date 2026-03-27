import { useState, useEffect } from "react";
import {
  getDataDirectory,
  setDataDirectory,
  promptForDataDirectory,
  getDefaultDataDirectory,
  ensureDataDirectory,
} from "./lib/dataDirectory";
import { setStorageDirectory, readJson } from "./lib/storage";
import { useMealLibrary } from "./hooks/useMealLibrary";
import { useIngredients } from "./hooks/useIngredients";
import { useCategoryItems } from "./hooks/useCategoryItems";
import { useTags } from "./hooks/useTags";
import { useSettings } from "./hooks/useSettings";
import type { WeekPlan } from "./types/planner";
import TabNav from "./components/common/TabNav";
import MealLibrary from "./components/MealLibrary/MealLibrary";
import PlannerPage from "./components/WeekPlanner/PlannerPage";
import ShoppingList from "./components/ShoppingList/ShoppingList";
import Settings from "./components/Settings/Settings";

type Tab = "meals" | "planner" | "shopping" | "settings";

function App() {
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("meals");

  useEffect(() => {
    initApp();
  }, []);

  async function initApp() {
    const dir = await getDataDirectory();
    if (dir) {
      await ensureDataDirectory(dir);
      setStorageDirectory(dir);
      setReady(true);
    } else {
      setNeedsSetup(true);
    }
    setLoading(false);
  }

  async function handleChooseDirectory() {
    const chosen = await promptForDataDirectory();
    if (chosen) await finishSetup(chosen);
  }

  async function handleUseDefault() {
    const defaultDir = await getDefaultDataDirectory();
    await finishSetup(defaultDir);
  }

  async function finishSetup(dir: string) {
    await ensureDataDirectory(dir);
    await setDataDirectory(dir);
    setStorageDirectory(dir);
    setNeedsSetup(false);
    setReady(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <p className="text-gray-500 text-lg">Loading...</p>
      </div>
    );
  }

  if (needsSetup) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Meal Planner</h1>
          <p className="text-gray-600 mb-6">
            Choose where to store your meal planner data. You can pick an
            existing folder to load previous data, or use the default location.
          </p>
          <div className="space-y-3">
            <button
              onClick={handleUseDefault}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Use Default Location
            </button>
            <button
              onClick={handleChooseDirectory}
              className="w-full py-3 px-4 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Choose Custom Folder...
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!ready) return null;

  return <MainApp activeTab={activeTab} setActiveTab={setActiveTab} />;
}

function MainApp({
  activeTab,
  setActiveTab,
}: {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}) {
  // Single source of truth for all shared state
  const mealLib = useMealLibrary();
  const ingredientLib = useIngredients();
  const tagLib = useTags();
  const catItemLib = useCategoryItems();
  const settingsLib = useSettings();

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 overflow-auto p-6">
        {activeTab === "meals" && (
          <MealLibrary
            mealLib={mealLib}
            tagLib={tagLib}
            ingredientLib={ingredientLib}
          />
        )}
        {activeTab === "planner" && (
          <PlannerPage
            meals={mealLib.meals}
            tags={tagLib.tags}
            masterIngredients={ingredientLib.ingredients}
            firstDayOfWeek={settingsLib.firstDayOfWeek}
            categoryItemLib={catItemLib}
          />
        )}
        {activeTab === "shopping" && (
          <ShoppingPage
            meals={mealLib.meals}
            masterIngredients={ingredientLib.ingredients}
            categoryItems={catItemLib.items}
          />
        )}
        {activeTab === "settings" && (
          <Settings
            firstDayOfWeek={settingsLib.firstDayOfWeek}
            setFirstDayOfWeek={settingsLib.setFirstDayOfWeek}
          />
        )}
      </main>
    </div>
  );
}

function ShoppingPage({
  meals,
  masterIngredients,
  categoryItems,
}: {
  meals: import("./types/meals").Meal[];
  masterIngredients: import("./types/meals").MasterIngredient[];
  categoryItems: import("./types/meals").CategoryItem[];
}) {
  const [plan, setPlan] = useState<WeekPlan | null>(null);

  useEffect(() => {
    readJson<WeekPlan>("current-week.json").then((data) => {
      if (data) setPlan(data);
    });
  }, []);

  return (
    <ShoppingList
      plan={plan}
      meals={meals}
      masterIngredients={masterIngredients}
      categoryItems={categoryItems}
    />
  );
}

export default App;