import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ALLERGENS,
  CUISINES,
  DEFAULT_CONSTRAINTS,
  DIETS,
  EQUIPMENT,
  MEAL_LABELS,
  MEAL_TYPES,
  OBJECTIVES,
  type MealType,
  type PlanConstraints,
  formatMoney,
  totalMeals,
} from "@/lib/domain";
import { generatePlan } from "@/lib/plan.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/questionnaire")({
  head: () => ({
    meta: [
      { title: "Créer mon plan de repas — Hassan Food" },
      {
        name: "description",
        content:
          "Répondez à quelques questions : durée, foyer, budget, régime, allergies, équipement et enseigne. Hassan Food calcule votre menu.",
      },
      { property: "og:title", content: "Créer mon plan de repas — Hassan Food" },
      {
        property: "og:description",
        content: "Un questionnaire court et adaptatif pour un menu réellement adapté à votre foyer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Questionnaire,
});

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function splitList(raw: string) {
  return raw
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

function Questionnaire() {
  const navigate = useNavigate();
  const generate = useServerFn(generatePlan);
  const [step, setStep] = useState(0);
  const [c, setC] = useState<PlanConstraints>(DEFAULT_CONSTRAINTS);
  const [activeMeals, setActiveMeals] = useState<MealType[]>([...MEAL_TYPES]);
  const [exclusionsRaw, setExclusionsRaw] = useState("");
  const [dislikesRaw, setDislikesRaw] = useState("");

  const { data: stores } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, brand, city, price_index")
        .order("brand");
      if (error) throw error;
      return data;
    },
  });

  function patch(next: Partial<PlanConstraints>) {
    setC((prev) => ({ ...prev, ...next }));
  }

  function setMealCount(type: MealType, value: number) {
    setC((prev) => ({
      ...prev,
      mealCounts: { ...prev.mealCounts, [type]: Math.max(0, Math.min(value, prev.days * 4)) },
    }));
  }

  function setDays(days: number) {
    const safeDays = Math.max(1, Math.min(days, 14));
    setC((prev) => ({
      ...prev,
      days: safeDays,
      mealCounts: {
        petit_dejeuner: activeMeals.includes("petit_dejeuner") ? safeDays : 0,
        dejeuner: activeMeals.includes("dejeuner") ? safeDays : 0,
        diner: activeMeals.includes("diner") ? safeDays : 0,
      },
    }));
  }

  function toggleMealType(type: MealType) {
    const next = activeMeals.includes(type)
      ? activeMeals.filter((t) => t !== type)
      : [...activeMeals, type];
    setActiveMeals(next);
    setC((prev) => ({
      ...prev,
      mealCounts: {
        ...prev.mealCounts,
        [type]: next.includes(type) ? prev.days : 0,
      },
    }));
  }

  const finalConstraints = useMemo<PlanConstraints>(
    () => ({
      ...c,
      servings: Math.max(1, c.adults + c.children),
      exclusions: splitList(exclusionsRaw),
      dislikes: splitList(dislikesRaw),
      storeIndex:
        stores?.find((s) => s.id === c.storeId)?.price_index != null
          ? Number(stores.find((s) => s.id === c.storeId)!.price_index)
          : 1,
      storeBrand: stores?.find((s) => s.id === c.storeId)?.brand ?? null,
    }),
    [c, exclusionsRaw, dislikesRaw, stores],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      await supabase
        .from("profiles")
        .update({
          answers: finalConstraints as unknown as Record<string, unknown>,
          onboarding_completed: true,
          store_id: finalConstraints.storeId,
          store_brand: finalConstraints.storeBrand,
        })
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "");
      return generate({
        data: {
          constraints: finalConstraints,
          title: `Plan ${finalConstraints.days} jour(s) — ${totalMeals(finalConstraints.mealCounts)} repas`,
        },
      });
    },
    onSuccess: (result) => {
      if (!result.mealCount) {
        toast.error(
          "Aucun repas ne satisfait toutes vos contraintes. Assouplissez le temps, le budget ou les exclusions.",
        );
        return;
      }
      if (!result.withinBudget) {
        toast.warning(
          `Plan créé à ${formatMoney(result.estimatedTotal, finalConstraints.currency)}, au-dessus de votre budget.`,
        );
      }
      navigate({ to: "/plan/$planId", params: { planId: result.planId } });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "La génération a échoué."),
  });

  const steps = [
    {
      title: "Où faites-vous vos courses ?",
      description: "Le magasin ajuste les prix de référence utilisés pour le calcul.",
      content: (
        <div className="space-y-2">
          <Label>Enseigne</Label>
          <Select value={c.storeId ?? "aucune"} onValueChange={(v) => patch({ storeId: v === "aucune" ? null : v })}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir une enseigne" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aucune">Prix moyens (aucune enseigne)</SelectItem>
              {(stores ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.brand} — {s.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Les prix restent des estimations par conditionnement, pas des relevés en temps réel.
          </p>
        </div>
      ),
    },
    {
      title: "Sur combien de jours, et quels repas ?",
      description: "Vous pouvez ne planifier que les dîners, ou les trois repas.",
      content: (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="days">Nombre de jours (1 à 14)</Label>
            <Input
              id="days"
              type="number"
              min={1}
              max={14}
              value={c.days}
              onChange={(e) => setDays(Number(e.target.value))}
            />
          </div>
          <div className="space-y-3">
            <Label>Repas à planifier</Label>
            {MEAL_TYPES.map((type) => (
              <div key={type} className="flex items-center gap-3">
                <Checkbox
                  id={`mt-${type}`}
                  checked={activeMeals.includes(type)}
                  onCheckedChange={() => toggleMealType(type)}
                />
                <Label htmlFor={`mt-${type}`} className="flex-1 font-normal">
                  {MEAL_LABELS[type]}
                </Label>
                {activeMeals.includes(type) ? (
                  <Input
                    type="number"
                    min={0}
                    max={c.days * 4}
                    className="w-20"
                    aria-label={`Nombre de ${MEAL_LABELS[type]}`}
                    value={c.mealCounts[type]}
                    onChange={(e) => setMealCount(type, Number(e.target.value))}
                  />
                ) : null}
              </div>
            ))}
            <p className="text-sm text-muted-foreground">
              Total : {totalMeals(c.mealCounts)} repas à préparer.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Qui mange, et pour quel budget ?",
      description: "Le budget est respecté en remplaçant les repas les plus chers si besoin.",
      content: (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="adults">Adultes</Label>
            <Input
              id="adults"
              type="number"
              min={1}
              max={12}
              value={c.adults}
              onChange={(e) => patch({ adults: Math.max(1, Number(e.target.value)) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="children">Enfants</Label>
            <Input
              id="children"
              type="number"
              min={0}
              max={12}
              value={c.children}
              onChange={(e) => patch({ children: Math.max(0, Number(e.target.value)) })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="budget">Budget total pour la période (laisser vide = pas de limite)</Label>
            <Input
              id="budget"
              type="number"
              min={0}
              step="0.5"
              value={c.budget ?? ""}
              onChange={(e) =>
                patch({ budget: e.target.value === "" ? null : Number(e.target.value) })
              }
            />
          </div>
        </div>
      ),
    },
    {
      title: "Régime et allergies",
      description: "Une allergie cochée exclut définitivement toute recette qui la contient.",
      content: (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Régime alimentaire</Label>
            <Select value={c.diet} onValueChange={(v) => patch({ diet: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIETS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label>Allergies et intolérances</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {ALLERGENS.map((a) => (
                <div key={a.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`al-${a.value}`}
                    checked={c.allergens.includes(a.value)}
                    onCheckedChange={() => patch({ allergens: toggle(c.allergens, a.value) })}
                  />
                  <Label htmlFor={`al-${a.value}`} className="font-normal">
                    {a.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exclusions">Aliments à exclure totalement (séparés par des virgules)</Label>
            <Textarea
              id="exclusions"
              placeholder="porc, champignons, coriandre"
              value={exclusionsRaw}
              onChange={(e) => setExclusionsRaw(e.target.value)}
            />
          </div>
        </div>
      ),
    },
    {
      title: "Temps et équipement",
      description: "Une recette qui demande un équipement absent est écartée.",
      content: (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="minutes">Temps maximum par repas, en minutes (vide = aucune limite)</Label>
            <Input
              id="minutes"
              type="number"
              min={5}
              max={240}
              value={c.maxMinutes ?? ""}
              onChange={(e) =>
                patch({ maxMinutes: e.target.value === "" ? null : Number(e.target.value) })
              }
            />
          </div>
          <div className="space-y-3">
            <Label>Équipement disponible</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {EQUIPMENT.map((eq) => (
                <div key={eq.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`eq-${eq.value}`}
                    checked={c.equipment.includes(eq.value)}
                    onCheckedChange={() => patch({ equipment: toggle(c.equipment, eq.value) })}
                  />
                  <Label htmlFor={`eq-${eq.value}`} className="font-normal">
                    {eq.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Vos goûts",
      description: "Facultatif, mais cela améliore nettement les propositions.",
      content: (
        <div className="space-y-5">
          <div className="space-y-3">
            <Label>Cuisines que vous aimez</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {CUISINES.map((cu) => (
                <div key={cu} className="flex items-center gap-2">
                  <Checkbox
                    id={`cu-${cu}`}
                    checked={c.cuisines.includes(cu)}
                    onCheckedChange={() => patch({ cuisines: toggle(c.cuisines, cu) })}
                  />
                  <Label htmlFor={`cu-${cu}`} className="font-normal capitalize">
                    {cu.replace("_", " ")}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dislikes">Ce que vous préférez éviter sans l'interdire</Label>
            <Textarea
              id="dislikes"
              placeholder="poisson, plats épicés"
              value={dislikesRaw}
              onChange={(e) => setDislikesRaw(e.target.value)}
            />
          </div>
          <div className="space-y-3">
            <Label>Vos priorités</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {OBJECTIVES.map((o) => (
                <div key={o.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`ob-${o.value}`}
                    checked={c.objectives.includes(o.value)}
                    onCheckedChange={() => patch({ objectives: toggle(c.objectives, o.value) })}
                  />
                  <Label htmlFor={`ob-${o.value}`} className="font-normal">
                    {o.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Répétition des recettes</Label>
            <Select
              value={c.repeatPolicy}
              onValueChange={(v) => patch({ repeatPolicy: v as PlanConstraints["repeatPolicy"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aucune">Jamais deux fois la même recette</SelectItem>
                <SelectItem value="faible">Peu de répétitions</SelectItem>
                <SelectItem value="elevee">Répéter volontiers (moins cher)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ),
    },
  ];

  const last = step === steps.length - 1;
  const current = steps[step]!;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Progress value={((step + 1) / steps.length) * 100} className="mb-6" />
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardDescription>
            Étape {step + 1} sur {steps.length}
          </CardDescription>
          <CardTitle className="font-display text-2xl">{current.title}</CardTitle>
          <CardDescription>{current.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {current.content}

          <div className="flex justify-between gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || mutation.isPending}
            >
              Retour
            </Button>
            {last ? (
              <Button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || totalMeals(c.mealCounts) === 0}
              >
                {mutation.isPending ? "Calcul du plan…" : "Créer mon plan"}
              </Button>
            ) : (
              <Button onClick={() => setStep((s) => s + 1)}>Continuer</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
