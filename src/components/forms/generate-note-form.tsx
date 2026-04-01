"use client";

import { useActionState, useEffect } from "react";

import {
  appendToDocumentAction,
  generateDocumentAction,
} from "@/app/actions/documents";
import { Badge } from "@/components/ui/badge";
import { FormMessage } from "@/components/ui/form-message";
import { MaskedPeselText } from "@/components/ui/masked-pesel-text";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState, type DocumentRecord } from "@/lib/types";

const historyDateFormatter = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatHistoryTimestamp(value: string) {
  return historyDateFormatter.format(new Date(value));
}

type GenerateNoteFormProps = {
  abbreviationCount: number;
  aiEnabled: boolean;
  currentDocument: Pick<DocumentRecord, "id" | "conversation_history"> | null;
  scrollTargetId?: string;
};

export function GenerateNoteForm({
  abbreviationCount,
  aiEnabled,
  currentDocument,
  scrollTargetId,
}: GenerateNoteFormProps) {
  const [createState, createAction] = useActionState(
    generateDocumentAction,
    initialActionState,
  );
  const [appendState, appendAction] = useActionState(
    appendToDocumentAction,
    initialActionState,
  );
  const isAppendMode = Boolean(currentDocument);
  const state = isAppendMode ? appendState : createState;
  const action = isAppendMode ? appendAction : createAction;
  const primaryMessage = currentDocument?.conversation_history[0] ?? null;
  const appendedMessages = currentDocument?.conversation_history.slice(1) ?? [];

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const targetId = scrollTargetId ?? "generate-note-section";
    const expectedHash = `#${targetId}`;

    if (window.location.hash !== expectedHash) {
      return;
    }

    const target = document.getElementById(targetId);

    if (!target) {
      return;
    }

    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    });
  }, [currentDocument?.id, scrollTargetId]);

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3 text-sm text-muted">
          <span>
            Prywatne skróty aktywne:{" "}
            <strong className="text-foreground">{abbreviationCount}</strong>
          </span>
          {!aiEnabled ? <Badge>Tryb lokalny</Badge> : <Badge>AI</Badge>}
        </div>

        {isAppendMode ? (
          <p className="rounded-3xl border border-border bg-white/65 px-4 py-3 text-sm leading-6 text-muted">
            Bieżący dokument już istnieje. Wpisz tylko nowe informacje, a aplikacja
            uzupełni całą notatkę i przeliczy sekcje od nowa.
          </p>
        ) : null}

        {isAppendMode ? <input name="id" type="hidden" value={currentDocument.id} /> : null}

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground" htmlFor="note">
            {isAppendMode ? "Nowe informacje do dopisania" : "Notatka lekarza"}
          </label>
          <Textarea
            id="note"
            name="note"
            placeholder={
              isAppendMode
                ? "Np. od dziś gorączka 38,5, w badaniu gardło zaczerwienione, zalecono kontrolę za 3 dni"
                : "Np. 3 dni kaszel suchy, stan podgorączkowy, osłuchowo bez zmian, podejrzenie infekcji wirusowej, zal odpoczynek i nawodnienie"
            }
          />
          <FormMessage message={state.fieldErrors?.note?.[0]} tone="error" />
        </div>

        <FormMessage
          message={state.message}
          tone={state.status === "success" ? "success" : "error"}
        />

        <SubmitButton
          pendingLabel={isAppendMode ? "Uzupełnianie..." : "Generowanie..."}
          size="lg"
          type="submit"
        >
          {isAppendMode ? "Uzupełnij bieżącą notatkę" : "Generuj kartę wizyty"}
        </SubmitButton>
      </form>

      {currentDocument && primaryMessage ? (
        <section className="rounded-[28px] border border-border bg-white/70 p-5">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
              Historia twoich notatek
            </p>
            <p className="text-sm leading-6 text-muted">
              Zachowujemy pierwszą wiadomość oraz każde kolejne dopisanie do bieżącej notatki.
            </p>
          </div>

          <div className="mt-5 grid gap-4">
            <div className="rounded-3xl border border-border bg-white/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                  Główna wiadomość
                </p>
                <p className="text-xs text-muted">
                  {formatHistoryTimestamp(primaryMessage.created_at)}
                </p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-foreground">
                <MaskedPeselText text={primaryMessage.content} />
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                Dopisane nowe informacje
              </p>

              {appendedMessages.length ? (
                appendedMessages.map((message, index) => (
                  <div
                    className="rounded-3xl border border-border bg-white/80 p-4"
                    key={`${message.created_at}-${index}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                        Dopisanie {index + 1}
                      </p>
                      <p className="text-xs text-muted">
                        {formatHistoryTimestamp(message.created_at)}
                      </p>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-foreground">
                      <MaskedPeselText text={message.content} />
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-border bg-white/60 px-4 py-3 text-sm leading-6 text-muted">
                  Brak dopisanych informacji do tej notatki.
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
