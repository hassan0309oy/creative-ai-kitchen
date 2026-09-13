import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_CONSTRAINTS, type PlanConstraints, type Ingredient, type Recipe } from "./domain";
import {
  buildPlan,
  buildShoppingList,
  priceRecipe,
  passesHardConstraints,
  sumShopping,
  type PlannedMeal,
} from "./planner";

type Supa = { from: (t: string) => any };

function coerceConstraints(input: unknown): PlanConstraints {
  const raw = (input ?? {}) as Partial<PlanConstraints>;
  const merged = { ...DEFAULT_CONSTRAINTS, ...raw } as PlanConstraints;
  merged.days = Math.min(31, Math.max(1, Math.round(Number(merged.days) || 1)));
  merged.servings = Math.min(12, Math.max(1, Math.round(Number(merged.servings) || 1)));
  const counts = merged.mealCounts ?? DEFAULT_CONSTRAINTS.mealCounts;
  merged.mealCounts = {
    petit_dejeuner: Math.min(31, Math.max(0, Math.round(Number(counts.petit_dejeuner) || 0))),
    dejeuner: Math.min(31, Math.max(0, Math.round(Number(counts.dejeuner) || 0))),
    diner: Math.min(31, Math.max(0, Math.round(Number(counts.diner) || 0))),
  };
  merged.storeIndex = Number(merged.storeIndex) > 0 ? Number(merged.storeIndex) : 1;
  merged.budget = merged.budget === null ? null : Number(merged.budget) || null;
  merged.allergens = (merged.allergens ?? []).slice(0, 20);
  merged.exclusions = (merged.exclusions ?? []).slice(0, 40);
  merged.likes = (merged.likes ?? []).slice(0, 40);
  merged.dislikes = (merged.dislikes ?? []).slice(0, 40);
  merged.cuisines = (merged.cuisines ?? []).slice(0, 15);
  merged.equipment = (merged.equipment ?? []).slice(0, 15);
  merged.objectives = (merged.objectives ?? []).slice(0, 10);
  return merged;
}

async function loadCatalogue(supabase: Supa) {
  const [{ data: recipes, error: rErr }, { data: ingredients, error: iErr }] = await Promise.all([
    supabase.from("recipes").select("*").eq("published", true),
    supabase.from("ingredients").select("*"),
  ]);
  if (rErr) throw new Error(`Catalogue recettes indisponible: ${rErr.message}`);
  if (iErr) throw new Error(`Catalogue ingrédients indisponible: ${iErr.message}`);
  return {
    recipes: (recipes ?? []) as Recipe[],
    ingredients: (ingredients ?? []) as Ingredient[],
  };
}

async function loadPantry(supabase: Supa, userId: string) {
  const { data } = await supabase
    .from("pantry_items")
    .select("ingredient_slug, name, quantity, unit")
    .eq("user_id", userId);
  return data ?? [];
}

async function persistShopping(
  supabase: Supa,
  planId: string,
  userId: string,
  meals: PlannedMeal[],
  recipes: Recipe[],
  ingredients: Ingredient[],
  pantry: any[],
  constraints: PlanConstraints,
) {
  const lines = buildShoppingList(meals, recipes, ingredients, pantry, constraints);
  await supabase.from("shopping_items").delete().eq("plan_id", planId).eq("manual", false);
  if (lines.length) {
    const { error } = await supabase.from("shopping_items").insert(
      lines.map((l) => ({ ...l, plan_id: planId, user_id: userId })),
    );
    if (error) throw new Error(`Liste de courses: ${error.message}`);
  }
  return { lines, total: sumShopping(lines) };
}

/** Génère un plan complet et sa liste de courses. Tous les calculs sont faits ici. */
export const generatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { constraints: unknown; title?: string }) => input)
  .handler(async ({ data, context }) => {
    const started = Date.now();
    const supabase = context.supabase as unknown as Supa;
    const userId = context.userId as string;
    const constraints = coerceConstraints(data.constraints);

    const { recipes, ingredients } = await loadCatalogue(supabase);
    const pantry = await loadPantry(supabase, userId);
    const result = buildPlan(recipes, ingredients, pantry, constraints);

    const { data: plan, error: planError } = await supabase
      .from("plans")
      .insert({
        user_id: userId,
        title: data.title?.slice(0, 80) || `Plan ${constraints.days} jour(s)`,
        status: result.meals.length ? "completed" : "failed",
        days: constraints.days,
        servings: constraints.servings,
        currency: constraints.currency,
        budget: constraints.budget,
        estimated_total: result.estimatedTotal,
        constraints,
        notes: result.notes.join("\n"),
        progress: 100,
        progress_label: result.meals.length ? "Plan prêt" : "Aucun plan possible",
      })
      .select()
      .single();
    if (planError || !plan) throw new Error(`Sauvegarde du plan: ${planError?.message}`);

    if (result.meals.length) {
      const { error } = await supabase.from("plan_meals").insert(
        result.meals.map((m) => ({
          plan_id: plan.id,
          user_id: userId,
          recipe_id: m.recipeId,
          day: m.day,
          meal_type: m.mealType,
          slot: m.slot,
          servings: m.servings,
          cost: m.cost,
        })),
      );
      if (error) throw new Error(`Sauvegarde des repas: ${error.message}`);
      await persistShopping(
        supabase,
        plan.id,
        userId,
        result.meals,
        recipes,
        ingredients,
        pantry,
        constraints,
      );
    }

    await supabase.from("generation_runs").insert({
      user_id: userId,
      plan_id: plan.id,
      kind: "plan",
      status: result.meals.length ? "completed" : "failed",
      latency_ms: Date.now() - started,
      details: {
        meals: result.meals.length,
        total: result.estimatedTotal,
        shortages: result.shortages,
      },
    });

    return {
      planId: plan.id as string,
      mealCount: result.meals.length,
      estimatedTotal: result.estimatedTotal,
      withinBudget: result.withinBudget,
      notes: result.notes,
      shortages: result.shortages,
    };
  });

/** Remplace un seul repas par une alternative compatible et recalcule tout. */
export const regenerateMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { mealId: string }) => input)
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as unknown as Supa;
    const userId = context.userId as string;

    const { data: meal, error } = await supabase
      .from("plan_meals")
      .select("*")
      .eq("id", data.mealId)
      .single();
    if (error || !meal) throw new Error("Repas introuvable.");
    if (meal.locked) throw new Error("Ce repas est verrouillé.");

    const { data: plan } = await supabase.from("plans").select("*").eq("id", meal.plan_id).single();
    if (!plan) throw new Error("Plan introuvable.");
    const constraints = coerceConstraints(plan.constraints);

    const { recipes, ingredients } = await loadCatalogue(supabase);
    const pantry = await loadPantry(supabase, userId);
    const ingMap = new Map(ingredients.map((i) => [i.slug, i]));

    const { data: siblings } = await supabase
      .from("plan_meals")
      .select("id, recipe_id, meal_type, day, slot, servings, cost")
      .eq("plan_id", meal.plan_id);
    const usedIds = new Set((siblings ?? []).map((s: any) => s.recipe_id));

    const pool = recipes
      .filter((r) => r.meal_type === meal.meal_type && r.id !== meal.recipe_id)
      .filter((r) => passesHardConstraints(r, constraints, ingMap))
      .map((r) => priceRecipe(r, ingMap, meal.servings, constraints.storeIndex))
      .sort((a, b) => a.cost - b.cost);

    const pick = pool.find((p) => !usedIds.has(p.recipe.id)) ?? pool[0];
    if (!pick) throw new Error("Aucune alternative compatible avec vos contraintes.");

    await supabase
      .from("plan_meals")
      .update({ recipe_id: pick.recipe.id, cost: pick.cost })
      .eq("id", meal.id);

    const meals: PlannedMeal[] = (siblings ?? []).map((s: any) => ({
      day: s.day,
      mealType: s.meal_type,
      slot: s.slot,
      recipeId: s.id === meal.id ? pick.recipe.id : s.recipe_id,
      servings: s.servings,
      cost: s.id === meal.id ? pick.cost : Number(s.cost),
    }));

    const { total } = await persistShopping(
      supabase,
      meal.plan_id,
      userId,
      meals,
      recipes,
      ingredients,
      pantry,
      constraints,
    );
    await supabase
      .from("plans")
      .update({ estimated_total: Math.round(total * 100) / 100 })
      .eq("id", meal.plan_id);

    return { recipeId: pick.recipe.id as string, cost: pick.cost, estimatedTotal: total };
  });

/** Recalcule la liste de courses (après modification du placard par exemple). */
export const rebuildShoppingList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { planId: string }) => input)
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as unknown as Supa;
    const userId = context.userId as string;
    const { data: plan } = await supabase.from("plans").select("*").eq("id", data.planId).single();
    if (!plan) throw new Error("Plan introuvable.");
    const constraints = coerceConstraints(plan.constraints);
    const { recipes, ingredients } = await loadCatalogue(supabase);
    const pantry = await loadPantry(supabase, userId);
    const { data: rows } = await supabase
      .from("plan_meals")
      .select("recipe_id, day, meal_type, slot, servings, cost")
      .eq("plan_id", data.planId);
    const meals: PlannedMeal[] = (rows ?? []).map((s: any) => ({
      day: s.day,
      mealType: s.meal_type,
      slot: s.slot,
      recipeId: s.recipe_id,
      servings: s.servings,
      cost: Number(s.cost),
    }));
    const { total } = await persistShopping(
      supabase,
      data.planId,
      userId,
      meals,
      recipes,
      ingredients,
      pantry,
      constraints,
    );
    await supabase
      .from("plans")
      .update({ estimated_total: Math.round(total * 100) / 100 })
      .eq("id", data.planId);
    return { estimatedTotal: Math.round(total * 100) / 100 };
  });
