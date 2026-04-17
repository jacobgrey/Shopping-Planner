# Shopping Planner

A desktop meal planning and shopping list app built with Tauri v2, React, and TypeScript. Plan weekly dinners, manage a meal library with recipes and ingredients, and generate organized shopping lists — all in a self-contained Windows executable.

## Features

### Meal Library
- Browse, search, sort, and filter meals by name or tag
- Meal detail page with inline-editable sections: info, recipe/ingredients, and nutrition
- Quick-edit recipe URLs and notes directly from library cards
- Ingredient management linked to a master ingredient list with categories, units, and prices
- Meal images via upload, URL paste, recipe page scraping, or automatic Google Image search
- Bulk import meals from JSON

### Week Planner
- Assign meals to each day of the week with a visual grid
- Auto-suggest meals based on tag preferences, deal bonuses, recency, and variety
- Per-day manual items for breakfast, lunch, and snacks
- QR code generation for calendar reminders with prep/start times and ingredient lists

### Shopping List
- Automatically aggregated from the week plan: meal ingredients + category items + free-text notes
- Deduplicates ingredients by name, sums quantities, and estimates cost
- Organized by store category for efficient shopping
- Export and print support

### Settings
- Configurable first day of week, dinner time, meal card size
- Tag management (create, rename, recolor, delete)
- Data directory selection for portable storage

## Tech Stack

- **Tauri v2** — Rust backend with WebView2, producing a ~11MB standalone `.exe`
- **React 19** — UI framework
- **TypeScript** — Type safety throughout
- **Vite** — Build tooling and dev server
- **Tailwind CSS 4** — Utility-first styling

## Installation

### Option A: Installer (recommended)

Download the latest release from the [Releases](../../releases) page:

- **`Shopping Planner_x64-setup.exe`** — NSIS installer (recommended). Run it, follow the prompts, and launch from the Start Menu.
- **`Shopping Planner_x64_en-US.msi`** — MSI installer.

### Option B: Standalone executable

Download `shopping-planner.exe` from the [Releases](../../releases) page. No installation required — just run it from anywhere. On first launch you'll be prompted to choose a folder for your data.

### Updating

To update, download and run the latest installer — it will replace the previous version. Your meal data is stored separately from the application and will not be affected.

If using the standalone `.exe`, simply replace the old file with the new one.

---

## Development

### Prerequisites

- Node.js 18+
- Rust toolchain (for Tauri builds)

### Dev Server

```bash
# Install dependencies
npm install

# Start dev server with Tauri window
npx tauri dev

# Frontend only (no Tauri window, runs in browser)
npm run dev
```

### Build

```bash
# Production build (creates .exe + installers in src-tauri/target/release/)
npx tauri build

# Frontend only
npm run build

# Type check
npx tsc -b
```

## Data Storage

All data is stored as JSON files in a user-chosen directory. The directory path is saved in `%APPDATA%/com.meal-planner.app/config.json`. Data files include:

| File | Contents |
|------|----------|
| `meals.json` | Meal library (names, sides, tags, ingredients, notes, nutrition) |
| `ingredients.json` | Master ingredient list with categories, units, and prices |
| `tags.json` | Tag definitions with labels and colors |
| `category-items.json` | Breakfast, lunch, snack, and other quick-add items |
| `current-week.json` | Current week's meal plan |
| `deals.json` | Active deals used by the meal auto-selector |
| `meal-history.json` | Recently used meals for the recency/variety algorithm |
| `images/` | Meal images (resized to 600x450 JPG) |
