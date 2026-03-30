"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  appendToDocumentAction,
  deleteDocumentAction,
  generateDocumentAction,
} from "@/app/actions/documents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState, type DocumentRecord } from "@/lib/types";

type GenerateNoteFormProps = {
  abbreviationCount: number;
  aiEnabled: boolean;
  currentDocument: Pick<DocumentRecord, "id"> | null;
};

export function GenerateNoteForm({
  abbreviationCount,
  aiEnabled,
  currentDocument,
}: GenerateNoteFormProps) {
  const isAppendMode = Boolean(currentDocument);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [state, action] = useActionState(
    isAppendMode ? appendToDocumentAction : generateDocumentAction,
    initialActionState,
  );
  const canUseDOM = typeof window !== "undefined";

  useEffect(() => {
    if (!isConfirmOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsConfirmOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isConfirmOpen]);

  const confirmDialog =
    currentDocument && isConfirmOpen && canUseDOM
      ? createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-4 py-6 sm:px-6">
            <button
              aria-label="Zamknij potwierdzenie"
              className="fixed inset-0 bg-[#11232b]/55"
              onClick={() => setIsConfirmOpen(false)}
              type="button"
            />

            <div
              aria-describedby="new-note-confirmation-description"
              aria-labelledby="new-note-confirmation-title"
              aria-modal="true"
              className="relative z-10 w-full max-w-md overflow-y-auto rounded-[28px] border border-border bg-[#f8f5ef] p-6 shadow-2xl max-h-[calc(100dvh-3rem)]"
              role="dialog"
            >
              <p
                className="text-xs font-semibold uppercase tracking-[0.16em] text-accent"
                id="new-note-confirmation-title"
              >
                Potwierdzenie
              </p>
              <h3 className="mt-3 font-serif text-2xl leading-tight text-foreground">
                Usunąć bieżącą notatkę?
              </h3>
              <p
                className="mt-3 text-sm leading-7 text-muted"
                id="new-note-confirmation-description"
              >
                Po potwierdzeniu aktywny dokument zostanie usunięty, a widok wróci do
                formularza tworzenia nowej notatki.
              </p>

              <form action={deleteDocumentAction} className="mt-6 flex flex-col gap-3 sm:flex-row">
                <input name="id" type="hidden" value={currentDocument.id} />
                <Button
                  className="flex-1 justify-center"
                  onClick={() => setIsConfirmOpen(false)}
                  type="button"
                  variant="ghost"
                >
                  Anuluj
                </Button>
                <SubmitButton
                  className="flex-1 justify-center"
                  pendingLabel="Usuwanie..."
                  type="submit"
                  variant="danger"
                >
                  Usuń i zacznij nową
                </SubmitButton>
              </form>
            </div>
          </div>,
          document.body,
        )
      : null;

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

        {currentDocument ? <input name="id" type="hidden" value={currentDocument.id} /> : null}

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

      {currentDocument ? (
        <>
          <Button
            className="w-full justify-center"
            onClick={() => setIsConfirmOpen(true)}
            size="lg"
            type="button"
            variant="secondary"
          >
            Nowa notatka
          </Button>
          {confirmDialog}
        </>
      ) : null}
    </div>
  );
}
