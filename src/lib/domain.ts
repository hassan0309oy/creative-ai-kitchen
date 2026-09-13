/**
 * Hassan Food — types et référentiels partagés (client + serveur).
 * Aucun secret, aucun accès réseau ici.
 */

export type MealType = "petit_dejeuner" | "dejeuner" | "diner";

export const MEAL_TYPES: MealType[] = ["petit_dejeuner", "dejeuner", "diner"];

export const MEAL_LABELS: Record<MealType, string> = {
  petit_dejeuner: "Petit déjeuner",
  dejeuner: "Déjeuner",
  diner: "Dîner",
};

export const DIETS = [
  { value: "omnivore", label: "Omnivore" },
  { value: "flexitarien", label: "Flexitarien" },
  { value: "vegetarien", label: "Végétarien" },
  { value: "vegan", label: "Végétalien" },
  { value: "pescetarien", label: "Pescétarien" },
  { value: "sans_porc", label: "Sans porc" },
] as const;

export const ALLERGENS = [
  { value: "gluten", label: "Gluten" },
  { value: "lait", label: "Lait / lactose" },
  { value: "oeuf", label: "Œuf" },
  { value: "poisson", label: "Poisson" },
  { value: "arachide", label: "Arachide" },
  { value: "fruits_a_coque", label: "Fruits à coque" },
  { value: "soja", label: "Soja" },
  { value: "sesame", label: "Sésame" },
] as const;

export const EQUIPMENT = [
  { value: "plaques", label: "Plaques / gaz" },
  { value: "four", label: "Four" },
  { value: "micro_ondes", label: "Micro-ondes" },
  { value: "air_fryer", label: "Air fryer" },
  { value: "blender", label: "Blender" },
  { value: "robot", label: "Robot" },
  { value: "barbecue", label: "Barbecue" },
] as const;

export const CUISINES = [
  "francaise",
  "italienne",
  "mediterraneenne",
  "marocaine",
  "indienne",
  "asiatique",
  "mexicaine",
  "espagnole",
  "internationale",
] as const;

export const OBJECTIVES = [
  { value: "economie", label: "Économiser" },
  { value: "rapidite", label: "Aller vite" },
  { value: "variete", label: "Varier les plats" },
  { value: "proteines", label: "Plus de protéines" },
  { value: "equilibre", label: "Équilibre" },
  { value: "anti_gaspillage", label: "Anti-gaspillage" },
  { value: "batch_cooking", label: "Batch cooking" },
] as const;

export interface MealCounts {
  petit_dejeuner: number;
  dejeuner: number;
  diner: number;
}

export interface PlanConstraints {
  days: number;
  mealCounts: MealCounts;
  servings: number;
  adults: number;
  children: number;
  budget: number | null;
  currency: string;
  storeBrand: string | null;
  storeId: string | null;
  storeIndex: number;
  diet: string;
  allergens: string[];
  exclusions: string[];
  likes: string[];
  dislikes: string[];
  cuisines: string[];
  equipment: string[];
  maxMinutes: number | null;
  objectives: string[];
  repeatPolicy: "aucune" | "faible" | "elevee";
}

export const DEFAULT_CONSTRAINTS: PlanConstraints = {
  days: 7,
  mealCounts: { petit_dejeuner: 7, dejeuner: 7, diner: 7 },
  servings: 2,
  adults: 2,
  children: 0,
  budget: 80,
  currency: "EUR",
  storeBrand: null,
  storeId: null,
  storeIndex: 1,
  diet: "omnivore",
  allergens: [],
  exclusions: [],
  likes: [],
  dislikes: [],
  cuisines: [],
  equipment: ["plaques", "four", "micro_ondes"],
  maxMinutes: 45,
  objectives: ["equilibre", "economie"],
  repeatPolicy: "faible",
};

export interface RecipeItem {
  slug: string;
  name: string;
  qty: number;
  unit: string;
  optional?: boolean;
}

export interface RecipeStep {
  text: string;
  timer?: number;
}

export interface Recipe {
  id: string;
  slug: string;
  title: string;
  description: string;
  meal_type: string;
  cuisine: string;
  diets: string[];
  allergens: string[];
  equipment: string[];
  tags: string[];
  prep_minutes: number;
  cook_minutes: number;
  difficulty: string;
  base_servings: number;
  items: RecipeItem[];
  steps: RecipeStep[];
  tips: string;
  image_url: string | null;
}

export interface Ingredient {
  slug: string;
  name: string;
  aisle: string;
  base_unit: string;
  pack_qty: number;
  pack_price: number;
  allergens: string[];
  price_source: string;
  price_confidence: string;
}

export interface PantryEntry {
  ingredient_slug: string | null;
  name: string;
  quantity: number;
  unit: string;
}

export function formatMoney(value: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function totalMeals(counts: MealCounts) {
  return counts.petit_dejeuner + counts.dejeuner + counts.diner;
}
