import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/mes-plans")({
  head: () => ({
    meta: [
      { title: "Mes plans de repas — Hassan Food" },
      {
        name: "description",
        content:
          "Retrouvez l'historique de vos plans de repas Hassan Food, leur coût estimé et leur liste de courses.",
      },
      { property: "og:title", content: "Mes plans de repas — Hassan Food" },
      { property: "og:description", content: "Historique de vos plans et de leurs coûts estimés." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MyPlans,
});

function MyPlans() {
  const { data, isLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("id, title, days, servings, currency, budget, estimated_total, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Mes plans</h1>
        <Button asChild>
          <Link to="/questionnaire">Nouveau plan</Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Chargement…</p>
      ) : !data?.length ? (
        <Card className="mt-8">
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">
              Vous n'avez pas encore de plan. Le questionnaire prend deux minutes.
            </p>
            <Button asChild className="mt-4">
              <Link to="/questionnaire">Commencer</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="mt-8 space-y-3">
          {data.map((plan) => (
            <li key={plan.id}>
              <Card className="shadow-[var(--shadow-card)]">
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{plan.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {plan.days} jour(s) · {plan.servings} portion(s) ·{" "}
                      {formatMoney(Number(plan.estimated_total ?? 0), plan.currency ?? "EUR")}
                      {plan.budget != null
                        ? ` sur ${formatMoney(Number(plan.budget), plan.currency ?? "EUR")}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to="/courses/$planId" params={{ planId: plan.id }}>
                        Courses
                      </Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link to="/plan/$planId" params={{ planId: plan.id }}>
                        Ouvrir
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
