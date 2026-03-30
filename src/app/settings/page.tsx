import Link from "next/link";

import { deleteAbbreviationAction } from "@/app/actions/abbreviations";
import { AddAbbreviationForm } from "@/components/forms/add-abbreviation-form";
import { SetupCard } from "@/components/dashboard/setup-card";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getAbbreviationsForUser } from "@/lib/data";
import { hasSupabaseConfig } from "@/lib/env";

export default async function SettingsPage() {
  if (!hasSupabaseConfig()) {
    return <SetupCard />;
  }

  const user = await requireUser();
  const abbreviations = await getAbbreviationsForUser(user.id);

  return (
    <main className="flex-1 px-6 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Card className="animate-rise-in space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Ustawienia</p>
              <CardTitle>Prywatny słownik skrótów</CardTitle>
              <CardDescription className="max-w-3xl text-base leading-7">
                Wpisy z tego słownika działają globalnie w całej notatce jako dokładne zamiany 1:1 i są case-sensitive.
              </CardDescription>
            </div>
            <Link href="/">
              <Button variant="secondary">Wróć do generatora</Button>
            </Link>
          </div>

          <AddAbbreviationForm />
        </Card>

        <Card className="animate-rise-in space-y-5">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Lista skrótów</p>
            <CardTitle>Aktywne wpisy</CardTitle>
          </div>

          {!abbreviations.length ? (
            <div className="rounded-[24px] border border-dashed border-border bg-white/60 px-5 py-8 text-sm leading-7 text-muted">
              Nie masz jeszcze zapisanych skrótów.
            </div>
          ) : (
            <div className="overflow-hidden rounded-[28px] border border-border">
              <div className="grid grid-cols-[minmax(0,0.5fr)_minmax(0,1fr)_auto] gap-3 bg-[#f3ede2] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                <span>Skrót</span>
                <span>Rozwinięcie</span>
                <span>Akcja</span>
              </div>
              <div className="divide-y divide-border bg-white/70">
                {abbreviations.map((abbreviation) => (
                  <div className="grid grid-cols-[minmax(0,0.5fr)_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4" key={abbreviation.id}>
                    <span className="font-mono text-sm font-semibold text-foreground">{abbreviation.shortcut}</span>
                    <span className="text-sm leading-7 text-foreground">{abbreviation.expansion}</span>
                    <form action={deleteAbbreviationAction}>
                      <input name="id" type="hidden" value={abbreviation.id} />
                      <Button size="sm" type="submit" variant="ghost">
                        Usuń
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}