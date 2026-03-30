import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export function SetupCard() {
  return (
    <main className="grid flex-1 place-items-center px-6 py-12">
      <Card className="grid-wash max-w-3xl animate-rise-in space-y-5 p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Konfiguracja wymagana</p>
        <CardTitle>Najpierw podłącz Supabase i zmienne środowiskowe</CardTitle>
        <CardDescription className="max-w-2xl text-base leading-7">
          Aplikacja wymaga zewnętrznych usług do logowania i przechowywania danych. Instrukcja dla developera
          jest w pliku <strong>docs/developer-setup.md</strong>, a gotowy schemat bazy w <strong>supabase/schema.sql</strong>.
        </CardDescription>
        <div className="rounded-[24px] border border-border bg-white/70 p-5 text-sm leading-7 text-muted">
          Po uzupełnieniu <strong>.env.local</strong> i uruchomieniu skryptu SQL odśwież aplikację. Jeśli nie podasz
          klucza OpenAI, generator przełączy się na lokalny tryb heurystyczny do developmentu.
        </div>
      </Card>
    </main>
  );
}