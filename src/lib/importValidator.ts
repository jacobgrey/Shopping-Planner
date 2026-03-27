import { STORE_CATEGORIES, type ImportMealDefinition } from "../types/meals";

export interface ValidationResult {
  valid: boolean;
  meals: ImportMealDefinition[];
  warnings: string[];
  errors: string[];
}

export function validateMealImport(data: unknown): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const validMeals: ImportMealDefinition[] = [];

  if (!data || typeof data !== "object") {
    return { valid: false, meals: [], warnings: [], errors: ["Invalid JSON: not an object"] };
  }

  const obj = data as Record<string, unknown>;

  if (obj.version !== "1.0") {
    warnings.push(`Unknown version "${obj.version}", attempting to parse anyway`);
  }

  if (!Array.isArray(obj.meals)) {
    return { valid: false, meals: [], warnings, errors: ["Missing or invalid 'meals' array"] };
  }

  const categorySet = new Set<string>(STORE_CATEGORIES);

  for (let i = 0; i < obj.meals.length; i++) {
    const meal = obj.meals[i] as Record<string, unknown>;
    const prefix = `Meal ${i + 1}`;

    if (!meal.name || typeof meal.name !== "string") {
      errors.push(`${prefix}: missing or invalid 'name'`);
      continue;
    }

    if (!Array.isArray(meal.ingredients) || meal.ingredients.length === 0) {
      errors.push(`${prefix} ("${meal.name}"): must have at least one ingredient`);
      continue;
    }

    const validIngredients = [];
    for (let j = 0; j < meal.ingredients.length; j++) {
      const ing = meal.ingredients[j] as Record<string, unknown>;
      if (!ing.name || typeof ing.name !== "string") {
        warnings.push(`${prefix} ("${meal.name}"): ingredient ${j + 1} missing name, skipped`);
        continue;
      }
      const category = typeof ing.category === "string" && categorySet.has(ing.category)
        ? ing.category
        : "other";
      if (typeof ing.category === "string" && !categorySet.has(ing.category)) {
        warnings.push(`${prefix}: ingredient "${ing.name}" has unknown category "${ing.category}", defaulting to "other"`);
      }
      validIngredients.push({
        name: ing.name as string,
        quantity: typeof ing.quantity === "number" ? ing.quantity : undefined,
        unit: typeof ing.unit === "string" ? ing.unit : undefined,
        category: category as ImportMealDefinition["ingredients"][0]["category"],
        priceEstimate: typeof ing.priceEstimate === "number" ? ing.priceEstimate : undefined,
      });
    }

    if (validIngredients.length === 0) {
      errors.push(`${prefix} ("${meal.name}"): no valid ingredients after validation`);
      continue;
    }

    // Validate tags: must be strings, convert spaces to hyphens for slug format
    const rawTags = Array.isArray(meal.tags) ? (meal.tags as unknown[]) : [];
    const validTags: string[] = [];
    for (const tag of rawTags) {
      if (typeof tag !== "string") {
        warnings.push(`${prefix} ("${meal.name}"): non-string tag skipped`);
        continue;
      }
      // Normalize: trim, lowercase, convert spaces to hyphens
      const slug = tag.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/^-|-$/g, "");
      if (!slug) {
        warnings.push(`${prefix} ("${meal.name}"): empty tag skipped`);
        continue;
      }
      if (slug !== tag) {
        warnings.push(`${prefix} ("${meal.name}"): tag "${tag}" normalized to "${slug}"`);
      }
      validTags.push(slug);
    }

    validMeals.push({
      name: meal.name as string,
      sides: Array.isArray(meal.sides) ? (meal.sides as string[]) : [],
      ingredients: validIngredients,
      tags: validTags,
      prepTimeMinutes: typeof meal.prepTimeMinutes === "number" ? meal.prepTimeMinutes : undefined,
      notes: typeof meal.notes === "string" ? meal.notes : undefined,
    });
  }

  return {
    valid: errors.length === 0 && validMeals.length > 0,
    meals: validMeals,
    warnings,
    errors,
  };
}

export function parseMealImportJson(jsonString: string): ValidationResult {
  try {
    const data = JSON.parse(jsonString);
    return validateMealImport(data);
  } catch (e) {
    return {
      valid: false,
      meals: [],
      warnings: [],
      errors: [`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`],
    };
  }
}
