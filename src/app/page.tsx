import Link from "next/link";

import { deleteDocumentAction } from "@/app/actions/documents";
import { logoutAction } from "@/app/actions/auth";
import { CopyDocumentButton } from "@/components/dashboard/copy-document-button";
import { SetupCard } from "@/components/dashboard/setup-card";
import { GenerateNoteForm } from "@/components/forms/generate-note-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  formatDocumentForClipboard,
  formatSectionValue,
} from "@/lib/document-format";
import {
  getAbbreviationsForUser,
  getCurrentDocumentForUser,
  getUserDisplayName,
} from "@/lib/data";
import { hasOpenAIConfig, hasSupabaseConfig } from "@/lib/env";
import { requireUser } from "@/lib/auth";

const sectionLabels = {
  interview: "Wywiad",
  examination: "Badanie",
  diagnosis: "Rozpoznanie",
  recommendations: "Zalecenia",
} as const;

export default async function Home() {
  if (!hasSupabaseConfig()) {
    return <SetupCard />;
  }

  const user = await requireUser();
  const [abbreviations, document] = await Promise.all([
    getAbbreviationsForUser(user.id),
    getCurrentDocumentForUser(user.id),
  ]);

  const clipboardText = document
    ? formatDocumentForClipboard(document.sections)
    : "";

  return (
    <main className="grid-wash flex-1 px-6 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <Card className="animate-rise-in overflow-hidden bg-[#11232b] p-0">
          <div className="grid gap-8 px-7 py-8 md:grid-cols-[1.1fr_0.9fr] md:px-9">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-white/12">
                  Generator dokumentacji POZ
                </Badge>
                {!hasOpenAIConfig() ? (
                  <Badge className="bg-[#f4b942]/20 text-[#f9d98c]">
                    heurystyka lokalna
                  </Badge>
                ) : null}
              </div>
              <div className="space-y-3">
                <h1 className="max-w-3xl font-serif text-4xl leading-tight tracking-[-0.03em] md:text-5xl">
                  Uporządkuj notatkę lekarza do gotowej karty wizyty, bez
                  mieszania sugestii z dokumentacją.
                </h1>
                <p className="max-w-2xl text-base leading-7">
                  Aplikacja rozwija prywatne skróty, może porządkować oczywiste
                  skróty z kontekstu i oddziela listę braków od wyniku do schowka.
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-5 rounded-4xl border border-white/10 bg-white/6 p-6">
              <div className="space-y-2">
                <p className="text-sm uppercase tracking-[0.18em]">
                  Zalogowano jako
                </p>
                <p className="text-xl font-semibold">
                  {getUserDisplayName(user)}
                </p>
                <p className="text-sm">{user.email}</p>
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-3xl bg-white/8 p-4">
                  <p className="text-xs uppercase tracking-[0.16em]">Skróty</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {abbreviations.length}
                  </p>
                </div>
                <div className="rounded-3xl bg-white/8 p-4">
                  <p className="text-xs uppercase tracking-[0.16em]">
                    Dokument
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {document ? "1" : "0"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link className="inline-flex" href="/settings">
                  <Button size="sm" variant="secondary">
                    Ustawienia skrótów
                  </Button>
                </Link>
                <form action={logoutAction}>
                  <Button size="sm" variant="ghost">
                    Wyloguj
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="animate-rise-in space-y-5">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
                Generacja
              </p>
              <CardTitle>Wpisz notatkę z wizyty</CardTitle>
              <CardDescription className="text-base leading-7">
                Wynik zawiera zawsze sekcje: wywiad, badanie, rozpoznanie i
                zalecenia. Sugestie braków są osobno.
              </CardDescription>
            </div>
            <GenerateNoteForm
              abbreviationCount={abbreviations.length}
              aiEnabled={hasOpenAIConfig()}
            />
          </Card>

          <Card className="animate-rise-in space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
                  Wynik
                </p>
                <CardTitle>Gotowa karta wizyty</CardTitle>
                <CardDescription className="max-w-xl text-base leading-7">
                  Przed użyciem zweryfikuj treść. System nie powinien dopisywać
                  nowych informacji klinicznych.
                </CardDescription>
              </div>
              {document ? <CopyDocumentButton content={clipboardText} /> : null}
            </div>

            {!document ? (
              <div className="rounded-[28px] border border-dashed border-border bg-white/60 px-6 py-10 text-sm leading-7 text-muted">
                Po wygenerowaniu dokument pojawi się tutaj. Kopiowanie obejmie
                tylko część dokumentacyjną, bez sugestii.
              </div>
            ) : (
              <>
                <div className="rounded-[28px] border border-[#0f766e]/15 bg-white/75 p-5 text-sm leading-7 text-foreground">
                  <strong>Ostrzeżenie:</strong> wynik wymaga weryfikacji lekarza
                  przed użyciem w dokumentacji medycznej.
                </div>

                <div className="space-y-4">
                  {(
                    Object.keys(sectionLabels) as Array<
                      keyof typeof sectionLabels
                    >
                  ).map((key) => (
                    <section
                      className="rounded-[24px] border border-border bg-white/75 p-5"
                      key={key}
                    >
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                        {sectionLabels[key]}
                      </p>
                      <p className="document-copy text-sm leading-7 text-foreground">
                        {formatSectionValue(document.sections[key])}
                      </p>
                    </section>
                  ))}
                </div>

                <section className="rounded-[28px] border border-[#e7a62b]/25 bg-[#fff7e7] p-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#9b6a0e]">
                    Sugestie braków
                  </p>
                  {document.suggestions.length ? (
                    <ul className="space-y-2 text-sm leading-7 text-foreground">
                      {document.suggestions.map((suggestion) => (
                        <li key={suggestion}>• {suggestion}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm leading-7 text-muted">
                      Brak dodatkowych sugestii.
                    </p>
                  )}
                </section>

                <form action={deleteDocumentAction}>
                  <input name="id" type="hidden" value={document.id} />
                  <Button type="submit" variant="danger">
                    Usuń dokument
                  </Button>
                </form>
              </>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
