import { Link, useRouter } from "@tanstack/react-router";
import { ChefHat, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function AppHeader({ authenticated = false }: { authenticated?: boolean }) {
  const router = useRouter();

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <ChefHat className="size-5 text-primary" aria-hidden />
          Hassan Food
        </Link>
        <nav className="ml-auto flex items-center gap-1">
          {authenticated ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/mes-plans">Mes plans</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/placard">Mon placard</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/questionnaire">Nouveau plan</Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={signOut} aria-label="Se déconnecter">
                <LogOut className="size-4" aria-hidden />
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Se connecter</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
