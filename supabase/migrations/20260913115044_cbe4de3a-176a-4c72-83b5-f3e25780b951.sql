-- =========================================================
-- HASSAN FOOD — schéma de base
-- =========================================================

-- ---------- rôles ----------
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ---------- catalogue public : ingrédients ----------
CREATE TABLE public.ingredients (
  slug text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'autre',
  aisle text NOT NULL DEFAULT 'Épicerie',
  base_unit text NOT NULL DEFAULT 'g',
  pack_qty numeric NOT NULL DEFAULT 1000,
  pack_price numeric NOT NULL DEFAULT 2,
  currency text NOT NULL DEFAULT 'EUR',
  allergens text[] NOT NULL DEFAULT '{}',
  diet_flags text[] NOT NULL DEFAULT '{}',
  price_source text NOT NULL DEFAULT 'estimation_moyenne',
  price_confidence text NOT NULL DEFAULT 'low',
  price_fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ingredients TO anon, authenticated;
GRANT ALL ON public.ingredients TO service_role;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ingredients readable" ON public.ingredients FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage ingredients" ON public.ingredients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- catalogue public : recettes ----------
CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  meal_type text NOT NULL,
  cuisine text NOT NULL DEFAULT 'internationale',
  diets text[] NOT NULL DEFAULT '{}',
  allergens text[] NOT NULL DEFAULT '{}',
  equipment text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  prep_minutes int NOT NULL DEFAULT 10,
  cook_minutes int NOT NULL DEFAULT 10,
  difficulty text NOT NULL DEFAULT 'facile',
  base_servings int NOT NULL DEFAULT 2,
  items jsonb NOT NULL DEFAULT '[]',
  steps jsonb NOT NULL DEFAULT '[]',
  tips text NOT NULL DEFAULT '',
  image_url text,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX recipes_meal_type_idx ON public.recipes (meal_type) WHERE published;
GRANT SELECT ON public.recipes TO anon, authenticated;
GRANT ALL ON public.recipes TO service_role;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipes readable" ON public.recipes FOR SELECT TO anon, authenticated USING (published OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage recipes" ON public.recipes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER recipes_touch BEFORE UPDATE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- enseignes ----------
CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  country text NOT NULL DEFAULT 'FR',
  city text,
  address text,
  latitude numeric,
  longitude numeric,
  price_index numeric NOT NULL DEFAULT 1.0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stores TO anon, authenticated;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stores readable" ON public.stores FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage stores" ON public.stores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- profils / préférences ----------
CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY,
  display_name text,
  country text NOT NULL DEFAULT 'FR',
  language text NOT NULL DEFAULT 'fr',
  currency text NOT NULL DEFAULT 'EUR',
  city text,
  postal_code text,
  latitude numeric,
  longitude numeric,
  store_brand text,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  answers jsonb NOT NULL DEFAULT '{}',
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- placard ----------
CREATE TABLE public.pantry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ingredient_slug text REFERENCES public.ingredients(slug) ON DELETE SET NULL,
  name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'g',
  expires_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pantry_user_idx ON public.pantry_items (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pantry_items TO authenticated;
GRANT ALL ON public.pantry_items TO service_role;
ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pantry" ON public.pantry_items FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER pantry_touch BEFORE UPDATE ON public.pantry_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- plans ----------
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Mon plan',
  status text NOT NULL DEFAULT 'queued',
  version int NOT NULL DEFAULT 1,
  days int NOT NULL DEFAULT 7,
  servings int NOT NULL DEFAULT 2,
  currency text NOT NULL DEFAULT 'EUR',
  budget numeric,
  estimated_total numeric NOT NULL DEFAULT 0,
  constraints jsonb NOT NULL DEFAULT '{}',
  notes text NOT NULL DEFAULT '',
  progress int NOT NULL DEFAULT 0,
  progress_label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX plans_user_idx ON public.plans (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plans" ON public.plans FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER plans_touch BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.plan_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE RESTRICT,
  day int NOT NULL,
  meal_type text NOT NULL,
  slot int NOT NULL DEFAULT 1,
  servings int NOT NULL DEFAULT 2,
  cost numeric NOT NULL DEFAULT 0,
  locked boolean NOT NULL DEFAULT false,
  cooked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX plan_meals_plan_idx ON public.plan_meals (plan_id, day);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_meals TO authenticated;
GRANT ALL ON public.plan_meals TO service_role;
ALTER TABLE public.plan_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plan meals" ON public.plan_meals FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---------- liste de courses ----------
CREATE TABLE public.shopping_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  ingredient_slug text,
  name text NOT NULL,
  aisle text NOT NULL DEFAULT 'Épicerie',
  required_qty numeric NOT NULL DEFAULT 0,
  purchase_qty numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'g',
  packs numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  price_source text NOT NULL DEFAULT 'estimation_moyenne',
  price_confidence text NOT NULL DEFAULT 'low',
  already_have boolean NOT NULL DEFAULT false,
  checked boolean NOT NULL DEFAULT false,
  manual boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shopping_plan_idx ON public.shopping_items (plan_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_items TO authenticated;
GRANT ALL ON public.shopping_items TO service_role;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own shopping items" ON public.shopping_items FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---------- favoris / feedback / historique ----------
CREATE TABLE public.favorites (
  user_id uuid NOT NULL,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, recipe_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favorites" ON public.favorites FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  rating int NOT NULL DEFAULT 0,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own feedback" ON public.feedback FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.generation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'plan',
  status text NOT NULL DEFAULT 'completed',
  provider text,
  model text,
  latency_ms int,
  error text,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.generation_runs TO authenticated;
GRANT ALL ON public.generation_runs TO service_role;
ALTER TABLE public.generation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own runs" ON public.generation_runs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "insert own runs" ON public.generation_runs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE public.recipe_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  url text NOT NULL,
  provider text NOT NULL DEFAULT 'openai',
  prompt text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.recipe_images TO anon, authenticated;
GRANT ALL ON public.recipe_images TO service_role;
ALTER TABLE public.recipe_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipe images readable" ON public.recipe_images FOR SELECT TO anon, authenticated USING (true);