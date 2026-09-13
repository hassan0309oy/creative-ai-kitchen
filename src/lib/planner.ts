/**
 * Moteur de planification Hassan Food — 100 % déterministe, exécuté côté serveur.
 * L'IA n'intervient jamais dans les prix, les quantités ou les contraintes.
 */
import {
  MEAL_TYPES,
  type Ingredient,
  type MealType,
  type PantryEntry,
  type PlanConstraints,
  type Recipe,
} from "./domain";

export interface PricedRecipe {
  recipe: Recipe;
  cost: number;
  costPerServing: number;
  missingPrices: string[];
}

export interface PlannedMeal {
  day: number;
  mealType: MealType;
  slot: number;
  recipeId: string;
  servings: number;
  cost: number;
}

export interface ShoppingLine {
  ingredient_slug: string | null;
  name: string;
  aisle: string;
  required_qty: number;
  purchase_qty: number;
  unit: string;
  packs: number;
  unit_price: number;
  price: number;
  price_source: string;
  price_confidence: string;
  already_have: boolean;
}

export interface PlanResult {
  meals: PlannedMeal[];
  shopping: ShoppingLine[];
  estimatedTotal: number;
  withinBudget: boolean;
  notes: string[];
  shortages: MealType[];
}

const DIET_ALLOWED: Record<string, (r: Recipe) => boolean> = {
  omnivore: () => true,
  flexitarien: () => true,
  sans_porc: () => true,
  pescetarien: (r) =>
    r.diets.some((d) => ["vegan", "vegetarien", "pescetarien"].includes(d)),
  vegetarien: (r) => r.diets.some((d) => ["vegan", "vegetarien"].includes(d)),
  vegan: (r) => r.diets.includes("vegan"),
};

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Coût proportionnel d'une recette (part de conditionnement réellement utilisée). */
export function priceRecipe(
  recipe: Recipe,
  ingredients: Map<string, Ingredient>,
  servings: number,
  storeIndex: number,
): PricedRecipe {
  const scale = servings / Math.max(1, recipe.base_servings);
  let cost = 0;
  const missingPrices: string[] = [];
  for (const item of recipe.items) {
    const ing = ingredients.get(item.slug);
    if (!ing) {
      missingPrices.push(item.name);
      continue;
    }
    const share = (item.qty * scale) / Math.max(ing.pack_qty, 0.0001);
    cost += share * ing.pack_price * storeIndex;
  }
  return {
    recipe,
    cost: Math.round(cost * 100) / 100,
    costPerServing: Math.round((cost / Math.max(1, servings)) * 100) / 100,
    missingPrices,
  };
}

/** Contraintes dures : une recette rejetée ici ne peut jamais être proposée. */
export function passesHardConstraints(
  recipe: Recipe,
  constraints: PlanConstraints,
  ingredients: Map<string, Ingredient>,
): boolean {
  const dietCheck = DIET_ALLOWED[constraints.diet] ?? (() => true);
  if (!dietCheck(recipe)) return false;

  const recipeAllergens = new Set(recipe.allergens);
  for (const item of recipe.items) {
    const ing = ingredients.get(item.slug);
    ing?.allergens.forEach((a) => recipeAllergens.add(a));
  }
  if (constraints.allergens.some((a) => recipeAllergens.has(a))) return false;

  const banned = constraints.exclusions.concat(constraints.dislikes).map(normalize).filter(Boolean);
  if (banned.length) {
    const haystack = recipe.items
      .map((i) => `${normalize(i.slug)} ${normalize(i.name)}`)
      .concat(normalize(recipe.title));
    if (banned.some((b) => haystack.some((h) => h.includes(b)))) return false;
  }

  if (constraints.equipment.length) {
    if (!recipe.equipment.every((e) => constraints.equipment.includes(e))) return false;
  }

  if (constraints.maxMinutes) {
    if (recipe.prep_minutes + recipe.cook_minutes > constraints.maxMinutes) return false;
  }

  return true;
}

function pantryCoverage(recipe: Recipe, pantry: Map<string, number>) {
  if (!pantry.size) return 0;
  const covered = recipe.items.filter((i) => (pantry.get(i.slug) ?? 0) > 0).length;
  return covered / Math.max(1, recipe.items.length);
}

function scoreRecipe(
  priced: PricedRecipe,
  constraints: PlanConstraints,
  pantry: Map<string, number>,
  usedCuisines: Map<string, number>,
  likes: string[],
) {
  const r = priced.recipe;
  let score = 0;
  const wantsCheap = constraints.objectives.includes("economie");
  score -= priced.cost * (wantsCheap ? 1.6 : 1);
  if (constraints.cuisines.length && constraints.cuisines.includes(r.cuisine)) score += 4;
  if (likes.some((l) => r.items.some((i) => normalize(i.slug).includes(normalize(l))))) score += 2;
  if (constraints.objectives.includes("rapidite")) {
    score -= (r.prep_minutes + r.cook_minutes) / 12;
  }
  if (constraints.objectives.includes("anti_gaspillage")) {
    score += pantryCoverage(r, pantry) * 6;
  } else {
    score += pantryCoverage(r, pantry) * 3;
  }
  if (constraints.objectives.includes("batch_cooking") && r.tags.includes("batch_cooking")) {
    score += 3;
  }
  if (constraints.objectives.includes("proteines") && r.tags.includes("proteine")) score += 2;
  score -= (usedCuisines.get(r.cuisine) ?? 0) * 1.5;
  return score;
}

/**
 * Construit le plan : filtrage dur → prix → sélection gloutonne →
 * amélioration locale sous contrainte de budget.
 */
export function buildPlan(
  recipes: Recipe[],
  ingredientList: Ingredient[],
  pantryEntries: PantryEntry[],
  constraints: PlanConstraints,
): PlanResult {
  const ingredients = new Map(ingredientList.map((i) => [i.slug, i]));
  const pantry = new Map<string, number>();
  for (const entry of pantryEntries) {
    if (!entry.ingredient_slug) continue;
    pantry.set(entry.ingredient_slug, (pantry.get(entry.ingredient_slug) ?? 0) + entry.quantity);
  }

  const notes: string[] = [];
  const shortages: MealType[] = [];
  const byType = new Map<MealType, PricedRecipe[]>();

  for (const mealType of MEAL_TYPES) {
    const candidates = recipes
      .filter((r) => r.meal_type === mealType)
      .filter((r) => passesHardConstraints(r, constraints, ingredients))
      .map((r) => priceRecipe(r, ingredients, constraints.servings, constraints.storeIndex));
    byType.set(mealType, candidates);
  }

  const meals: PlannedMeal[] = [];
  const usedCuisines = new Map<string, number>();
  const usageCount = new Map<string, number>();
  const maxRepeat =
    constraints.repeatPolicy === "aucune" ? 1 : constraints.repeatPolicy === "faible" ? 2 : 4;

  for (const mealType of MEAL_TYPES) {
    const needed = constraints.mealCounts[mealType];
    if (!needed) continue;
    const pool = byType.get(mealType) ?? [];
    if (!pool.length) {
      shortages.push(mealType);
      continue;
    }

    for (let index = 0; index < needed; index += 1) {
      const allowed = pool.filter((p) => (usageCount.get(p.recipe.id) ?? 0) < maxRepeat);
      const usable = allowed.length ? allowed : pool;
      let best = usable[0]!;
      let bestScore = -Infinity;
      for (const candidate of usable) {
        const s =
          scoreRecipe(candidate, constraints, pantry, usedCuisines, constraints.likes) -
          (usageCount.get(candidate.recipe.id) ?? 0) * 4;
        if (s > bestScore) {
          bestScore = s;
          best = candidate;
        }
      }
      usageCount.set(best.recipe.id, (usageCount.get(best.recipe.id) ?? 0) + 1);
      usedCuisines.set(best.recipe.cuisine, (usedCuisines.get(best.recipe.cuisine) ?? 0) + 1);
      meals.push({
        day: (index % Math.max(1, constraints.days)) + 1,
        mealType,
        slot: Math.floor(index / Math.max(1, constraints.days)) + 1,
        recipeId: best.recipe.id,
        servings: constraints.servings,
        cost: best.cost,
      });
    }
  }

  let shopping = buildShoppingList(meals, recipes, ingredientList, pantryEntries, constraints);
  let total = sumShopping(shopping);

  // Amélioration locale : remplacer les repas les plus chers tant que le budget est dépassé.
  if (constraints.budget && total > constraints.budget) {
    let guard = 0;
    while (constraints.budget && total > constraints.budget && guard < 60) {
      guard += 1;
      const sorted = [...meals].sort((a, b) => b.cost - a.cost);
      let improved = false;
      for (const meal of sorted) {
        const pool = (byType.get(meal.mealType) ?? [])
          .filter((p) => p.cost < meal.cost - 0.2)
          .sort((a, b) => a.cost - b.cost);
        const replacement = pool.find(
          (p) => (usageCount.get(p.recipe.id) ?? 0) < maxRepeat || pool.length === 1,
        );
        if (!replacement) continue;
        usageCount.set(meal.recipeId, Math.max(0, (usageCount.get(meal.recipeId) ?? 1) - 1));
        usageCount.set(
          replacement.recipe.id,
          (usageCount.get(replacement.recipe.id) ?? 0) + 1,
        );
        meal.recipeId = replacement.recipe.id;
        meal.cost = replacement.cost;
        improved = true;
        break;
      }
      shopping = buildShoppingList(meals, recipes, ingredientList, pantryEntries, constraints);
      total = sumShopping(shopping);
      if (!improved) break;
    }
    if (constraints.budget && total > constraints.budget) {
      notes.push(
        "Aucune combinaison ne tient dans le budget indiqué. Augmentez le budget, réduisez le nombre de repas, allongez la durée ou autorisez davantage de répétitions.",
      );
    }
  }

  if (shortages.length) {
    notes.push(
      "Certaines catégories de repas n'ont aucune recette compatible avec vos contraintes bloquantes (allergies, régime, équipement, temps).",
    );
  }

  return {
    meals,
    shopping,
    estimatedTotal: Math.round(total * 100) / 100,
    withinBudget: constraints.budget ? total <= constraints.budget : true,
    notes,
    shortages,
  };
}

export function sumShopping(lines: ShoppingLine[]) {
  return lines.reduce((acc, l) => acc + (l.already_have ? 0 : l.price), 0);
}

/**
 * Liste de courses : agrégation, déduction du placard, conditionnements réels.
 * Le prix correspond au produit acheté, pas seulement aux grammes utilisés.
 */
export function buildShoppingList(
  meals: PlannedMeal[],
  recipes: Recipe[],
  ingredientList: Ingredient[],
  pantryEntries: PantryEntry[],
  constraints: PlanConstraints,
): ShoppingLine[] {
  const ingredients = new Map(ingredientList.map((i) => [i.slug, i]));
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));
  const needed = new Map<string, { qty: number; unit: string; name: string }>();

  for (const meal of meals) {
    const recipe = recipeMap.get(meal.recipeId);
    if (!recipe) continue;
    const scale = meal.servings / Math.max(1, recipe.base_servings);
    for (const item of recipe.items) {
      const current = needed.get(item.slug) ?? { qty: 0, unit: item.unit, name: item.name };
      current.qty += item.qty * scale;
      needed.set(item.slug, current);
    }
  }

  const pantry = new Map<string, number>();
  for (const entry of pantryEntries) {
    if (!entry.ingredient_slug) continue;
    pantry.set(entry.ingredient_slug, (pantry.get(entry.ingredient_slug) ?? 0) + entry.quantity);
  }

  const lines: ShoppingLine[] = [];
  for (const [slug, req] of needed) {
    const ing = ingredients.get(slug);
    const owned = pantry.get(slug) ?? 0;
    const toBuy = Math.max(0, req.qty - owned);
    const packQty = ing?.pack_qty ?? 1;
    const packs = toBuy > 0 ? Math.ceil((toBuy / packQty) * 100) / 100 : 0;
    const wholePacks = toBuy > 0 ? Math.ceil(toBuy / packQty) : 0;
    const unitPrice = (ing?.pack_price ?? 0) * constraints.storeIndex;
    lines.push({
      ingredient_slug: slug,
      name: ing?.name ?? req.name,
      aisle: ing?.aisle ?? "Épicerie",
      required_qty: Math.round(req.qty * 100) / 100,
      purchase_qty: Math.round(wholePacks * packQty * 100) / 100,
      unit: ing?.base_unit ?? req.unit,
      packs: wholePacks || packs,
      unit_price: Math.round(unitPrice * 100) / 100,
      price: Math.round(wholePacks * unitPrice * 100) / 100,
      price_source: ing?.price_source ?? "inconnu",
      price_confidence: ing?.price_confidence ?? "low",
      already_have: toBuy <= 0,
    });
  }

  return lines.sort((a, b) => a.aisle.localeCompare(b.aisle) || a.name.localeCompare(b.name));
}
