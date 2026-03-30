import { redirect } from "next/navigation";

import { LoginForm } from "@/components/forms/login-form";
import { SetupCard } from "@/components/dashboard/setup-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/env";

export default async function LoginPage() {
  if (!hasSupabaseConfig()) {
    return <SetupCard />;
  }

  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="grid flex-1 place-items-center px-6 py-12">
      <Card className="grid-wash animate-rise-in w-full max-w-5xl overflow-hidden p-0 md:grid md:grid-cols-[0.95fr_1.05fr]">
        <div className="flex min-h-full flex-col bg-[#0f766e] px-8 py-10 text-accent-foreground md:px-10">
          <div>
            <Badge className="bg-white/15 text-white">Mednote MVP</Badge>
          </div>
          <div className="flex flex-1 items-center">
            <h1 className="font-serif text-4xl leading-tight tracking-[-0.03em] md:text-5xl">
              Czytelna karta wizyty z krótkiej notatki lekarza.
            </h1>
          </div>
        </div>

        <div className="bg-card-strong px-8 py-10 md:px-10">
          <div className="mb-8 space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
              Dostęp lekarza
            </p>
            <CardTitle>Zaloguj się do aplikacji</CardTitle>
            <CardDescription className="text-base leading-7">
              Użyj danych konta utworzonego przez administratora.
            </CardDescription>
          </div>
          <LoginForm />
        </div>
      </Card>
    </main>
  );
}
