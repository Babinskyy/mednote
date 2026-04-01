"use client";

import { useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { MaskedPeselText } from "@/components/ui/masked-pesel-text";
import { SubmitButton } from "@/components/ui/submit-button";

type HistoryDocumentCardProps = {
  createdAtLabel: string;
  deleteAction: (formData: FormData) => void | Promise<void>;
  diagnosis: string;
  documentId: string;
  hashTargetId: string;
  isActive: boolean;
  rawNote: string;
  recommendations: string;
  selectAction: (formData: FormData) => void | Promise<void>;
  suggestionsCount: number;
};

export function HistoryDocumentCard({
  createdAtLabel,
  deleteAction,
  diagnosis,
  documentId,
  hashTargetId,
  isActive,
  rawNote,
  recommendations,
  selectAction,
  suggestionsCount,
}: HistoryDocumentCardProps) {
  const selectFormRef = useRef<HTMLFormElement>(null);
  const previewText = rawNote.replace(/\s+/g, " ").trim();

  const handleSelectSubmit = () => {
    window.location.hash = hashTargetId;
  };

  const submitSelection = () => {
    selectFormRef.current?.requestSubmit();
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    submitSelection();
  };

  const handleDeleteSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!window.confirm("Usunąć tę notatkę z historii?")) {
      event.preventDefault();
    }
  };

  return (
    <div
      aria-pressed={isActive}
      className={`rounded-3xl border bg-white/75 p-5 transition cursor-pointer hover:border-accent/40 hover:bg-white ${
        isActive ? "border-accent/40 bg-white" : "border-border"
      }`}
      onClick={submitSelection}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={0}
    >
      <form action={selectAction} className="hidden" onSubmit={handleSelectSubmit} ref={selectFormRef}>
        <input name="id" type="hidden" value={documentId} />
      </form>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">
              {createdAtLabel}
            </p>
            {isActive ? (
              <Badge className="bg-[#0f766e]/15 text-[#0f766e]">
                Aktywna
              </Badge>
            ) : null}
          </div>
          <p className="text-sm leading-6 text-foreground">
            <MaskedPeselText maxLength={180} text={previewText} />
          </p>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">
            Sugestie: {suggestionsCount}
          </p>
          <form action={deleteAction} onClick={(event) => event.stopPropagation()} onSubmit={handleDeleteSubmit}>
            <input name="id" type="hidden" value={documentId} />
            <SubmitButton
              pendingLabel="Usuwanie..."
              size="sm"
              type="submit"
              variant="danger"
            >
              Usuń
            </SubmitButton>
          </form>
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-transparent text-left transition">
        <div className="space-y-3 border-t border-border/80 pt-4 text-sm leading-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              Notatka źródłowa
            </p>
            <p className="mt-1 whitespace-pre-wrap text-foreground">
              <MaskedPeselText text={rawNote} />
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              Rozpoznanie
            </p>
            <p className="mt-1 text-foreground">
              <MaskedPeselText text={diagnosis} />
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              Zalecenia
            </p>
            <p className="mt-1 text-foreground">
              <MaskedPeselText text={recommendations} />
            </p>
          </div>

          {!isActive ? (
            <p className="pt-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              Kliknij, aby ustawić jako aktywną notatkę
            </p>
          ) : (
            <p className="pt-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Aktywna notatka
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
