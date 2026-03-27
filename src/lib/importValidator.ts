import { STORE_CATEGORIES, type MealDefinition } from "../types/meals";

export interface ValidationResult {
  valid: boolean;
  meals: MealDefinition[];
  warnings: string[];
  errors: string[];
}

/** Validate a MealImport JSON object */
export function validateMealImport(data: unknown): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const validMeals: MealDefinition[] = [];

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
        category: category as MealDefinition["ingredients"][0]["category"],
        priceEstimate: typeof ing.priceEstimate === "number" ? ing.priceEstimate : undefined,
      });
    }

    if (validIngredients.length === 0) {
      errors.push(`${prefix} ("${meal.name}"): no valid ingredients after validation`);
      continue;
    }

    validMeals.push({
      name: meal.name as string,
      sides: Array.isArray(meal.sides) ? (meal.sides as string[]) : [],
      ingredients: validIngredients,
      tags: Array.isArray(meal.tags) ? (meal.tags as string[]) : [],
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

/** Parse a raw JSON string and validate as MealImport */
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
