import { Link, createFileRoute } from "@tanstack/react-router";
import { CalendarRange, ChefHat, ListChecks, PiggyBank, Salad, Timer } from "lucide-react";

import heroImage from "@/assets/hero-hassan-food.jpg";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hassan Food — planifiez vos repas selon votre budget" },
      {
        name: "description",
        content:
          "Hassan Food construit votre menu sur mesure : budget réel, allergies respectées, recettes détaillées et liste de courses agrégée. Gratuit.",
      },
      { property: "og:title", content: "Hassan Food — planifiez vos repas selon votre budget" },
      {
        property: "og:description",
        content:
          "Un plan de repas complet à partir de vos contraintes : durée, foyer, budget, régime, allergies, équipement et placard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: CalendarRange,
    title: "Un plan sur la durée que vous voulez",
    text: "1 jour, une semaine, 14 jours. Vous choisissez séparément le nombre de petits déjeuners, déjeuners et dîners.",
  },
  {
    icon: PiggyBank,
    title: "Votre budget est une règle, pas un vœu",
    text: "Les coûts sont calculés à partir de prix de référence par conditionnement, jamais inventés.",
  },
  {
    icon: Salad,
    title: "Allergies et régime bloquants",
    text: "Une allergie exclut définitivement une recette. Le régime, l'équipement et le temps filtrent aussi.",
  },
  {
    icon: ListChecks,
    title: "Une liste de courses agrégée",
    text: "Tous les repas réunis, rangés par rayon, avec les quantités réellement à acheter et votre placard déduit.",
  },
  {
    icon: Timer,
    title: "Mode cuisine pas à pas",
    text: "Une étape à la fois, en grand, avec les minuteurs intégrés.",
  },
  {
    icon: ChefHat,
    title: "Des fiches recettes complètes",
    text: "Ingrédients quantifiés, étapes numérotées, matériel, coût par personne et conseils.",
  },
];

function Landing() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader authenticated={!loading && !!user} />

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
          <div>
            <p className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              Gratuit — aucun paiement demandé
            </p>
            <h1 className="mt-4 font-display text-4xl leading-tight font-semibold tracking-tight md:text-5xl">
              Vos repas de la semaine, calculés selon votre budget réel.
            </h1>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">
              Dites-nous votre durée, votre foyer, votre budget, votre régime, vos allergies, votre
              équipement et ce qu'il reste dans le placard. Hassan Food construit le menu, les
              recettes et la liste de courses.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={user ? "/questionnaire" : "/auth"}>Créer mon plan</Link>
              </Button>
              {user ? (
                <Button asChild size="lg" variant="outline">
                  <Link to="/mes-plans">Reprendre un plan</Link>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl shadow-[var(--shadow-lift)]">
            <img
              src={heroImage}
              alt="Table garnie de légumes frais, céréales et plats maison prêts à cuisiner"
              className="h-full w-full object-cover"
              width={1200}
              height={900}
            />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
            Un vrai moteur de planification, pas un générateur de texte
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <Card key={title} className="shadow-[var(--shadow-card)]">
                <CardContent className="pt-6">
                  <Icon className="size-5 text-primary" aria-hidden />
                  <h3 className="mt-3 font-medium">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8">
        <p className="mx-auto max-w-6xl px-4 text-sm text-muted-foreground">
          Hassan Food — les prix affichés sont des prix de référence par conditionnement, indiqués
          comme estimatifs et jamais générés par une intelligence artificielle.
        </p>
      </footer>
    </div>
  );
}
