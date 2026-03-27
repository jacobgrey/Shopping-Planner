# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Development (starts Vite dev server + Tauri window)
export PATH="$HOME/.cargo/bin:$PATH"
npx tauri dev

# TypeScript check only
npx tsc -b

# Production build (creates .exe + installers in src-tauri/target/release/)
npx tauri build

# Frontend only (no Tauri window)
npm run dev
npm run build
```

Rust toolchain required for Tauri builds. The standalone exe is at `src-tauri/target/release/app.exe` (~11MB).

## Architecture

**Stack:** Tauri v2 (Rust/WebView2) + React 19 + TypeScript + Vite + Tailwind CSS 4

### State Ownership

`App.tsx` → `MainApp` is the **single owner** of all shared hooks. No component creates its own instance of a shared hook — state is passed down as props.

```
MainApp
├── useMealLibrary()     → passed to MealLibrary, PlannerPage, ShoppingPage
├── useIngredients()     → passed to MealLibrary, ShoppingPage
├── useTags()            → passed to MealLibrary, PlannerPage
└── useCategoryItems()   → passed to PlannerPage, ShoppingPage
```

`useWeekPlanner(meals)` is owned by `PlannerPage` (not shared — only the planner tab needs it). The shopping page reads the plan directly from disk.

### Stale Closure Pattern

All hooks that perform async CRUD use `useRef` alongside `useState` to avoid stale closure bugs. The ref is updated synchronously before `setState`, so sequential calls in loops (e.g., batch import) always see the latest data. Follow this pattern for any new hooks.

### Data Model — ID References

Meals don't embed ingredient details. Instead:
- `MasterIngredient` (in `ingredients.json`) holds name, category, unit, pricePerUnit
- `IngredientEntry` on a meal is just `{ ingredientId: string, quantity?: number }`
- All lookups happen at render/aggregation time via the master list

Similarly, tags are `TagDefinition` objects in `tags.json`, referenced by slug ID in meal `tags: string[]`.

### Import Pipeline

The JSON import format (`MealImport v1.0`) uses inline ingredient details (name, category, unit, price). On import, `MealImport.tsx` converts these by finding or creating `MasterIngredient` entries, then stores only `{ ingredientId, quantity }` on the meal. The sample file is `sample-meals-import.json`.

### Storage

Data persists as JSON files via Tauri's fs plugin in a user-chosen directory. The directory path is stored in `%APPDATA%/com.meal-planner.app/config.json`. Key files: `meals.json`, `ingredients.json`, `tags.json`, `category-items.json`, `current-week.json`, `deals.json`, `meal-history.json`.

### Shopping List Aggregation

The shopping list is computed (not stored) by `shoppingAggregator.ts` from: planned meals + master ingredients + selected category items + free-text notes. It deduplicates by ingredient name, sums quantities, and computes cost from `quantity × pricePerUnit`.

### Meal Auto-Selection Algorithm

`mealSelector.ts` scores meals per day: tag match (0–100) + deal bonus (0–30, capped) − recency penalty − variety penalty. Iterates Monday→Sunday, excluding already-picked meals. Random tiebreak for variety.
