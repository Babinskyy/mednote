import Link from "next/link";

import {
  clearActiveDocumentAction,
  deleteDocumentAction,
  setActiveDocumentAction,
} from "@/app/actions/documents";
import { logoutAction } from "@/app/actions/auth";
import { CopyDocumentButton } from "@/components/dashboard/copy-document-button";
import { HistoryDocumentCard } from "@/components/dashboard/history-document-card";
import { SetupCard } from "@/components/dashboard/setup-card";
import { GenerateNoteForm } from "@/components/forms/generate-note-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { MaskedPeselText } from "@/components/ui/masked-pesel-text";
import {
  formatDocumentForClipboard,
  formatSectionValue,
} from "@/lib/document-format";
import {
  getAbbreviationsForUser,
  getCurrentDocumentForUser,
  getDocumentHistoryForUser,
  getUserDisplayName,
} from "@/lib/data";
import { hasOpenAIConfig, hasSupabaseConfig } from "@/lib/env";
import { requireUser } from "@/lib/auth";

const sectionLabels = {
  interview: "Wywiad",
  conditionsAndOperations: "Choroby i operacje",
  allergies: "Alergie",
  familyHistory: "Wywiad rodzinny",
  examination: "Badanie",
  diagnosis: "Rozpoznanie",
  recommendations: "Zalecenia",
  prescriptionCode: "Kod recepty",
} as const;

const historyDateFormatter = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatHistoryTimestamp(value: string) {
  return historyDateFormatter.format(new Date(value));
}

export default async function Home() {
  if (!hasSupabaseConfig()) {
    return <SetupCard />;
  }

  const user = await requireUser();
  const [abbreviations, documents, currentDocument] = await Promise.all([
    getAbbreviationsForUser(user.id),
    getDocumentHistoryForUser(user.id),
    getCurrentDocumentForUser(user.id),
  ]);

  const clipboardText = currentDocument
    ? formatDocumentForClipboard(currentDocument.sections)
    : "";

  return (
    <main className="grid-wash flex-1 px-6 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <Card className="animate-rise-in overflow-hidden bg-[#11232b] p-0">
          <div className="grid gap-8 px-7 py-8 md:grid-cols-[1.1fr_0.9fr] md:px-9">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-white/12">
                  Generator dokumentacji medycznej
                </Badge>
                {!hasOpenAIConfig() ? (
                  <Badge className="bg-[#f4b942]/20 text-[#f9d98c]">
                    heurystyka lokalna
                  </Badge>
                ) : null}
              </div>
              <div className="space-y-3">
                <h1 className="max-w-3xl font-serif text-4xl leading-tight tracking-[-0.03em] md:text-5xl">
                  Uporządkuj notatkę lekarza do gotowej karty wizyty.
                </h1>
                <p className="max-w-2xl text-base leading-7">
                  Aplikacja rozwija prywatne skróty, może porządkować oczywiste
                  skróty z kontekstu i oddziela listę braków od wyniku do
                  schowka.
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
                    Historia
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {documents.length}/10
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link className="inline-flex" href="/settings">
                  <Button size="sm" variant="secondary">
                    Ustawienia
                  </Button>
                </Link>
                <form action={logoutAction}>
                  <Button size="sm" type="submit" variant="ghost">
                    Wyloguj
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </Card>

        {currentDocument ? (
          <Card className="animate-rise-in border border-accent/25 bg-[linear-gradient(135deg,rgba(15,118,110,0.14),rgba(255,255,255,0.92))] p-6 md:p-7">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl space-y-2">
                <CardTitle>Rozpocznij nową notatkę</CardTitle>
                <CardDescription className="text-base leading-7">
                  Aktywna notatka zostanie zapisana w historii.
                </CardDescription>
              </div>

              <form action={clearActiveDocumentAction} className="w-full md:w-auto">
                <Button className="h-14 w-full px-8 text-base md:min-w-64" size="lg" type="submit">
                  Nowa notatka
                </Button>
              </form>
            </div>
          </Card>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card
            className="animate-rise-in space-y-5"
            id="generate-note-section"
          >
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
                Generacja
              </p>
              <CardTitle>
                {currentDocument
                  ? "Uzupełnij bieżącą notatkę"
                  : "Wpisz notatkę z wizyty"}
              </CardTitle>
              <CardDescription className="text-base leading-7">
                {currentDocument
                  ? "Nowe informacje zostaną dopisane do aktywnej notatki i przeliczone razem z dotychczasową treścią."
                  : "Wynik zawiera sekcje: wywiad, choroby i operacje, alergie, wywiad rodzinny, badanie, rozpoznanie, zalecenia i kod recepty."}
              </CardDescription>
              <p className="rounded-3xl border border-border bg-white/65 px-4 py-3 text-sm leading-6 text-muted">
                Aplikacja przechowuje 10 ostatnich wygenerowanych notatek. Po
                zapisaniu jedenastej najstarszy wpis jest automatycznie usuwany
                z historii.
              </p>
            </div>
            <GenerateNoteForm
              key={currentDocument?.id ?? "new-document"}
              abbreviationCount={abbreviations.length}
              aiEnabled={hasOpenAIConfig()}
              currentDocument={currentDocument}
              scrollTargetId="generate-note-section"
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
                  Wyświetlamy aktywną notatkę. Przed użyciem zweryfikuj treść.
                </CardDescription>
              </div>
              {currentDocument ? (
                <CopyDocumentButton content={clipboardText} />
              ) : null}
            </div>

            {!currentDocument ? (
              <div className="rounded-[28px] border border-dashed border-border bg-white/60 px-6 py-10 text-sm leading-7 text-muted">
                Po wygenerowaniu dokument pojawi się tutaj.
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
                      className="rounded-3xl border border-border bg-white/75 p-5"
                      key={key}
                    >
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                        {sectionLabels[key]}
                      </p>
                      <p className="document-copy text-sm leading-7 text-foreground">
                        <MaskedPeselText
                          text={formatSectionValue(currentDocument.sections[key])}
                        />
                      </p>
                    </section>
                  ))}
                </div>

                {currentDocument.suggestions.length ? (
                  <section className="rounded-[28px] border border-[#e7a62b]/25 bg-[#fff7e7] p-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#9b6a0e]">
                      Sugestie
                    </p>
                    <ul className="space-y-2 text-sm leading-7 text-foreground">
                      {currentDocument.suggestions.map((suggestion) => (
                        <li key={suggestion}>
                          • <MaskedPeselText text={suggestion} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </>
            )}
          </Card>
        </div>

        {documents.length ? (
          <Card className="animate-rise-in space-y-5">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
                Historia notatek
              </p>
              <CardTitle>10 ostatnich wpisów</CardTitle>
              <CardDescription className="max-w-3xl text-base leading-7">
                Kliknięcie wpisu z historii ustawia go jako aktywną notatkę do
                dalszego uzupełniania. Historia nadal przechowuje maksymalnie 10
                ostatnich zapisów.
              </CardDescription>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {documents.map((document) => {
                const isActive = currentDocument?.id === document.id;

                return (
                  <HistoryDocumentCard
                    createdAtLabel={formatHistoryTimestamp(document.created_at)}
                    deleteAction={deleteDocumentAction}
                    diagnosis={formatSectionValue(document.sections.diagnosis)}
                    documentId={document.id}
                    hashTargetId="#generate-note-section"
                    isActive={isActive}
                    key={document.id}
                    rawNote={document.raw_note}
                    recommendations={formatSectionValue(
                      document.sections.recommendations,
                    )}
                    selectAction={setActiveDocumentAction}
                    suggestionsCount={document.suggestions.length}
                  />
                );
              })}
            </div>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
