import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Lock, LockOpen, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { MEAL_LABELS, type MealType, formatMoney } from "@/lib/domain";
import { regenerateMeal } from "@/lib/plan.functions";

export const Route = createFileRoute("/_authenticated/plan/$planId")({
  head: () => ({
    meta: [
      { title: "Mon plan de repas — Hassan Food" },
      {
        name: "description",
        content:
          "Votre menu jour par jour avec le coût estimé de chaque repas, la possibilité de verrouiller ou remplacer un plat.",
      },
      { property: "og:title", content: "Mon plan de repas — Hassan Food" },
      { property: "og:description", content: "Votre menu jour par jour et son coût estimé." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlanView,
});

const ORDER: MealType[] = ["petit_dejeuner", "dejeuner", "diner"];

function PlanView() {
  const { planId } = Route.useParams();
  const queryClient = useQueryClient();
  const regenerate = useServerFn(regenerateMeal);

  const { data, isLoading } = useQuery({
    queryKey: ["plan", planId],
    queryFn: async () => {
      const [{ data: plan, error: planError }, { data: meals, error: mealsError }] =
        await Promise.all([
          supabase.from("plans").select("*").eq("id", planId).single(),
          supabase
            .from("plan_meals")
            .select(
              "id, day, meal_type, slot, servings, cost, locked, recipes(slug, title, description, prep_minutes, cook_minutes, difficulty, image_url)",
            )
            .eq("plan_id", planId)
            .order("day")
            .order("meal_type"),
        ]);
      if (planError) throw planError;
      if (mealsError) throw mealsError;
      return { plan, meals: meals ?? [] };
    },
  });

  const swap = useMutation({
    mutationFn: (mealId: string) => regenerate({ data: { mealId } }),
    onSuccess: () => {
      toast.success("Repas remplacé et liste de courses recalculée.");
      void queryClient.invalidateQueries({ queryKey: ["plan", planId] });
      void queryClient.invalidateQueries({ queryKey: ["courses", planId] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Aucune alternative compatible trouvée."),
  });

  const lock = useMutation({
    mutationFn: async ({ id, locked }: { id: string; locked: boolean }) => {
      const { error } = await supabase.from("plan_meals").update({ locked }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plan", planId] }),
  });

  if (isLoading) {
    return <p className="mx-auto max-w-5xl px-4 py-12 text-sm text-muted-foreground">Chargement…</p>;
  }
  if (!data?.plan) {
    return <p className="mx-auto max-w-5xl px-4 py-12">Ce plan est introuvable.</p>;
  }

  const { plan, meals } = data;
  const currency = plan.currency ?? "EUR";
  const days = Array.from({ length: plan.days as number }, (_, i) => i + 1);
  const overBudget = plan.budget != null && Number(plan.estimated_total) > Number(plan.budget);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{plan.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {plan.days} jour(s) · {meals.length} repas · {plan.servings} portion(s) par repas
          </p>
          <p className="mt-1 text-sm">
            Coût estimé :{" "}
            <strong>{formatMoney(Number(plan.estimated_total ?? 0), currency)}</strong>
            {plan.budget != null ? ` — budget ${formatMoney(Number(plan.budget), currency)}` : ""}
          </p>
          {overBudget ? (
            <Badge variant="destructive" className="mt-2">
              Au-dessus du budget
            </Badge>
          ) : plan.budget != null ? (
            <Badge className="mt-2">Dans le budget</Badge>
          ) : null}
        </div>
        <Button asChild>
          <Link to="/courses/$planId" params={{ planId }}>
            Voir la liste de courses
          </Link>
        </Button>
      </div>

      {plan.notes ? (
        <Card className="mt-6 border-warning/40 bg-warning/5">
          <CardContent className="py-4 text-sm whitespace-pre-line">{plan.notes}</CardContent>
        </Card>
      ) : null}

      <div className="mt-8 space-y-8">
        {days.map((day) => {
          const dayMeals = meals
            .filter((m) => m.day === day)
            .sort((a, b) => ORDER.indexOf(a.meal_type as MealType) - ORDER.indexOf(b.meal_type as MealType));
          if (!dayMeals.length) return null;
          return (
            <section key={day}>
              <h2 className="font-display text-xl font-semibold">Jour {day}</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {dayMeals.map((meal) => {
                  const recipe = meal.recipes as unknown as {
                    slug: string;
                    title: string;
                    description: string;
                    prep_minutes: number;
                    cook_minutes: number;
                  } | null;
                  return (
                    <Card key={meal.id} className="flex flex-col shadow-[var(--shadow-card)]">
                      <CardHeader className="pb-3">
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                          {MEAL_LABELS[meal.meal_type as MealType]}
                        </p>
                        <CardTitle className="text-base leading-snug">
                          {recipe?.title ?? "Recette"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col gap-3">
                        <p className="line-clamp-3 text-sm text-muted-foreground">
                          {recipe?.description}
                        </p>
                        <p className="text-sm">
                          {(recipe?.prep_minutes ?? 0) + (recipe?.cook_minutes ?? 0)} min ·{" "}
                          {formatMoney(Number(meal.cost), currency)}
                        </p>
                        <div className="mt-auto flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link to="/recettes/$slug" params={{ slug: recipe?.slug ?? "" }}>
                              Recette
                            </Link>
                          </Button>
                          <Button asChild size="sm">
                            <Link to="/cuisine/$mealId" params={{ mealId: meal.id }}>
                              Cuisiner
                            </Link>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={meal.locked ? "Déverrouiller ce repas" : "Verrouiller ce repas"}
                            onClick={() => lock.mutate({ id: meal.id, locked: !meal.locked })}
                          >
                            {meal.locked ? (
                              <Lock className="size-4" aria-hidden />
                            ) : (
                              <LockOpen className="size-4" aria-hidden />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Remplacer ce repas"
                            disabled={meal.locked || swap.isPending}
                            onClick={() => swap.mutate(meal.id)}
                          >
                            <RefreshCw className="size-4" aria-hidden />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
