import { useState } from "react";
import { useMealLibrary } from "../../hooks/useMealLibrary";
import type { Meal, MealDefinition } from "../../types/meals";
import { MEAL_TAGS } from "../../types/meals";
import TagBadge from "../common/TagBadge";
import MealEditor from "./MealEditor";
import MealImport from "./MealImport";

export default function MealLibrary() {
  const { meals, loaded, addMeal, updateMeal, deleteMeal, importMeals, allIngredientNames } =
    useMealLibrary();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState<string>("");
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showImport, setShowImport] = useState(false);

  if (!loaded) {
    return <p className="text-gray-500">Loading meals...</p>;
  }

  const filtered = meals.filter((meal) => {
    const matchesSearch =
      !searchQuery ||
      meal.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !filterTag || meal.tags.includes(filterTag);
    return matchesSearch && matchesTag;
  });

  function handleNewMeal() {
    setEditingMeal(null);
    setShowEditor(true);
  }

  function handleEditMeal(meal: Meal) {
    setEditingMeal(meal);
    setShowEditor(true);
  }

  async function handleSaveMeal(def: MealDefinition) {
    if (editingMeal) {
      await updateMeal(editingMeal.id, def);
    } else {
      await addMeal(def);
    }
    setShowEditor(false);
    setEditingMeal(null);
  }

  async function handleDeleteMeal(id: string) {
    await deleteMeal(id);
  }

  if (showEditor) {
    return (
      <MealEditor
        meal={editingMeal}
        allIngredientNames={allIngredientNames()}
        onSave={handleSaveMeal}
        onCancel={() => {
          setShowEditor(false);
          setEditingMeal(null);
        }}
      />
    );
  }

  if (showImport) {
    return (
      <MealImport
        onImport={importMeals}
        onClose={() => setShowImport(false)}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">
          Meal Library{" "}
          <span className="text-gray-400 font-normal text-base">
            ({meals.length} meals)
          </span>
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Import JSON
          </button>
          <button
            onClick={handleNewMeal}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            + Add Meal
          </button>
        </div>
      </div>

      {/* Search and filter */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search meals..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All tags</option>
          {MEAL_TAGS.map((tag) => (
            <option key={tag} value={tag}>
              {tag.replace(/-/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {/* Meal list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {meals.length === 0 ? (
            <div>
              <p className="text-lg mb-2">No meals yet</p>
              <p className="text-sm">
                Add meals manually or import them from a JSON file.
              </p>
            </div>
          ) : (
            <p>No meals match your search.</p>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((meal) => (
            <div
              key={meal.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-800">
                      {meal.name}
                    </h3>
                    {meal.sides && meal.sides.length > 0 && (
                      <span className="text-xs text-gray-500">
                        + {meal.sides.join(", ")}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {meal.tags.map((tag) => (
                      <TagBadge key={tag} tag={tag} />
                    ))}
                  </div>
                  <p className="text-sm text-gray-500">
                    {meal.ingredients.length} ingredient
                    {meal.ingredients.length !== 1 ? "s" : ""}
                    {meal.prepTimeMinutes
                      ? ` · ${meal.prepTimeMinutes} min`
                      : ""}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEditMeal(meal)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteMeal(meal.id)}
                    className="text-sm text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
