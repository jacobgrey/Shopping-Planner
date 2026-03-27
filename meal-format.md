# Meal Import Format (v1.0)

Use this format to create a JSON file for importing meals into the Meal Planner app.

## JSON Structure

```json
{
  "version": "1.0",
  "meals": [
    {
      "name": "Meal Name",
      "sides": ["Side 1", "Side 2"],
      "ingredients": [
        {
          "name": "ingredient name",
          "quantity": 1.5,
          "unit": "lbs",
          "category": "meat",
          "priceEstimate": 5.49
        }
      ],
      "tags": ["quick", "kid-favorite"],
      "prepTimeMinutes": 25,
      "notes": "Optional prep notes or recipe URL"
    }
  ]
}
```

## Field Reference

### Meal Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Meal name (used as unique key for duplicate detection) |
| `sides` | string[] | No | Side dishes (e.g., `["White Rice", "Steamed Broccoli"]`) |
| `ingredients` | object[] | **Yes** | At least one ingredient required |
| `tags` | string[] | No | Tag slugs — lowercase, hyphens only, no spaces (e.g., `"kid-friendly"`). Unknown tags are auto-created on import. Tags with spaces or special characters are auto-normalized. |
| `prepTimeMinutes` | number | No | Active prep/cook time in minutes |
| `notes` | string | No | Free-text notes. URLs are rendered as clickable links in the app. |

### Ingredient Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Ingredient name (matched to master list; created if new) |
| `quantity` | number | No | Amount needed for this meal |
| `unit` | string | No | Unit of measure (e.g., "lbs", "cups", "each", "tbsp"). Defaults to "each" if omitted. |
| `category` | string | No | Store category for shopping list grouping. Defaults to "other" if omitted or unknown. |
| `priceEstimate` | number | No | Estimated total cost for this quantity (not per-unit). Used to calculate per-unit price. |

### Valid Categories

```
produce, meat, dairy, frozen, bakery, canned-goods, dry-goods,
condiments, spices, snacks, beverages, deli, other
```

### Tags

Tags are **slug-format strings**: lowercase letters, numbers, and hyphens only. No spaces, no special characters.

- **Good:** `"kid-friendly"`, `"slow-cooker"`, `"easy"`, `"kids-can-cook"`
- **Bad:** `"Kid Friendly"`, `"slow cooker"` (these will be auto-normalized but may trigger warnings)

You can use **any** tag slug — unknown tags are automatically created on import. Here are the built-in defaults:

```
low-effort, has-leftovers, low-cost, filling, kid-favorite,
dads-favorite, healthy, comfort-food, quick, slow-cooker,
grill, vegetarian
```

## Example

```json
{
  "version": "1.0",
  "meals": [
    {
      "name": "Chicken Stir Fry",
      "sides": ["White Rice"],
      "ingredients": [
        { "name": "chicken breast", "quantity": 1.5, "unit": "lbs", "category": "meat", "priceEstimate": 5.49 },
        { "name": "bell pepper", "quantity": 2, "unit": "each", "category": "produce", "priceEstimate": 1.50 },
        { "name": "soy sauce", "quantity": 3, "unit": "tbsp", "category": "condiments" },
        { "name": "white rice", "quantity": 1.5, "unit": "cups", "category": "dry-goods", "priceEstimate": 0.75 }
      ],
      "tags": ["quick", "kid-favorite", "healthy"],
      "prepTimeMinutes": 25
    },
    {
      "name": "Slow Cooker Pulled Pork",
      "sides": ["Coleslaw", "Buns"],
      "ingredients": [
        { "name": "pork shoulder", "quantity": 3, "unit": "lbs", "category": "meat", "priceEstimate": 9.99 },
        { "name": "BBQ sauce", "quantity": 1, "unit": "bottle", "category": "condiments", "priceEstimate": 2.99 },
        { "name": "hamburger buns", "quantity": 8, "unit": "each", "category": "bakery", "priceEstimate": 2.49 }
      ],
      "tags": ["low-effort", "has-leftovers", "slow-cooker"],
      "prepTimeMinutes": 15,
      "notes": "8 hours on low, 4 on high"
    }
  ]
}
```

## Tips for AI-Generated Imports

When providing meal information to an AI for conversion to this format:

1. **Be specific with ingredients** — include quantities and units for accurate shopping lists
2. **Use standard units** — lbs, oz, cups, tbsp, tsp, each, bag, can, jar, box, pkg
3. **Assign categories** — helps group items by store aisle on the shopping list
4. **Include price estimates** — enables cost estimation per meal and per week
5. **Tag generously** — tags drive the auto-fill algorithm (meals are selected based on day tags + deal bias)
6. **Add notes for non-obvious prep** — slow cooker times, marinating requirements, recipe URLs
