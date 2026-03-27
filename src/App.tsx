import { useState, useEffect, useRef, Component } from "react";
import type { ReactNode } from "react";
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

// Fix #8: Error boundary to prevent white-screen crashes
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-lg w-full mx-4">
            <h1 className="text-xl font-bold text-red-700 mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-gray-600 mb-4">
              {this.state.error.message}
            </p>
            <button
              onClick={() => this.setState({ error: null })}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("planner");

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

  return (
    <ErrorBoundary>
      <MainApp activeTab={activeTab} setActiveTab={setActiveTab} />
    </ErrorBoundary>
  );
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

  // Fix #10: Read plan from disk when switching to shopping tab
  const [shoppingPlan, setShoppingPlan] = useState<WeekPlan | null>(null);
  useEffect(() => {
    if (activeTab === "shopping") {
      readJson<WeekPlan>("current-week.json").then((data) => {
        setShoppingPlan(data);
      });
    }
  }, [activeTab]);

  // On startup, check for orphaned tags and ingredients and add them to master lists.
  // Uses async IIFE with sequential awaits to avoid concurrent file write races.
  const orphanCheckDone = useRef(false);
  useEffect(() => {
    if (
      orphanCheckDone.current ||
      !mealLib.loaded ||
      !tagLib.loaded ||
      !ingredientLib.loaded
    )
      return;
    orphanCheckDone.current = true;

    (async () => {
      try {
        const tagIds = new Set(tagLib.tags.map((t) => t.id));
        const ingredientIds = new Set(
          ingredientLib.ingredients.map((i) => i.id)
        );

        const orphanedTags = new Set<string>();
        const orphanedIngredientIds = new Set<string>();

        for (const meal of mealLib.meals) {
          for (const tagSlug of meal.tags) {
            if (!tagIds.has(tagSlug)) orphanedTags.add(tagSlug);
          }
          for (const entry of meal.ingredients) {
            if (!ingredientIds.has(entry.ingredientId)) {
              orphanedIngredientIds.add(entry.ingredientId);
            }
          }
        }

        // Create missing tags sequentially to avoid concurrent write races
        for (const tagSlug of orphanedTags) {
          const label = tagSlug
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
          await tagLib.addTag(label);
        }

        // Create placeholder ingredients with the exact orphaned IDs
        if (orphanedIngredientIds.size > 0) {
          const placeholders = [...orphanedIngredientIds].map((id) => ({
            id,
            name: `Unknown (${id.slice(0, 8)})`,
            category: "other" as const,
            defaultUnit: "each",
          }));
          await ingredientLib.saveIngredients([
            ...ingredientLib.getIngredients(),
            ...placeholders,
          ]);
        }
      } catch (e) {
        console.error("Orphan check failed:", e);
      }
    })();
  }, [mealLib.loaded, tagLib.loaded, ingredientLib.loaded]);

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
          <ShoppingList
            plan={shoppingPlan}
            meals={mealLib.meals}
            masterIngredients={ingredientLib.ingredients}
            categoryItems={catItemLib.items}
          />
        )}
        {activeTab === "settings" && (
          <Settings
            firstDayOfWeek={settingsLib.firstDayOfWeek}
            setFirstDayOfWeek={settingsLib.setFirstDayOfWeek}
            tagLib={tagLib}
            mealLib={mealLib}
            ingredientLib={ingredientLib}
            onReloadAll={async () => {
              await mealLib.reload();
              await ingredientLib.reload();
              await tagLib.reload();
              await catItemLib.reload();
            }}
          />
        )}
      </main>
    </div>
  );
}

export default App;
