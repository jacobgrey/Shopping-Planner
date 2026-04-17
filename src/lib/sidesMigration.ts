import type { Meal, Side, SideDefinition } from "../types/meals";

export interface MigrationResult {
  newSides: Side[];
  updatedMeals: Meal[];
  didMigrate: boolean;
}

/**
 * One-shot migration: convert legacy `meal.sides: string[]` free-text names
 * into `Side` entries and populate `meal.preferredSideIds` with the IDs.
 * Idempotent: if no meal has `sides?.length`, returns the inputs unchanged.
 *
 * Returns newSides = existingSides plus any newly created sides, and
 * updatedMeals = meals with legacy `sides` cleared and `preferredSideIds` populated.
 */
export function migrateLegacySides(
  meals: Meal[],
  existingSides: Side[],
): MigrationResult {
  const hasLegacy = meals.some((m) => m.sides && m.sides.length > 0);
  if (!hasLegacy) {
    return { newSides: existingSides, updatedMeals: meals, didMigrate: false };
  }

  const byName = new Map<string, Side>();
  for (const s of existingSides) byName.set(s.name.trim().toLowerCase(), s);

  const newSides: Side[] = [...existingSides];

  const getOrCreateSide = (rawName: string): Side | null => {
    const name = rawName.trim();
    if (!name) return null;
    const key = name.toLowerCase();
    const existing = byName.get(key);
    if (existing) return existing;
    const def: SideDefinition = {
      name,
      ingredients: [],
      tags: [],
    };
    const side: Side = {
      ...def,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    byName.set(key, side);
    newSides.push(side);
    return side;
  };

  const updatedMeals: Meal[] = meals.map((meal) => {
    if (!meal.sides || meal.sides.length === 0) return meal;
    const preferredIds: string[] = [...(meal.preferredSideIds ?? [])];
    for (const name of meal.sides) {
      const side = getOrCreateSide(name);
      if (side && !preferredIds.includes(side.id)) {
        preferredIds.push(side.id);
      }
    }
    const { sides: _legacy, ...rest } = meal;
    return { ...rest, preferredSideIds: preferredIds };
  });

  return { newSides, updatedMeals, didMigrate: true };
}
