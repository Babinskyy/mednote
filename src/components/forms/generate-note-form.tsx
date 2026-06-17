"use client";

import { Mic, MicOff } from "lucide-react";
import { useActionState, useCallback, useEffect, useState } from "react";

import {
  appendToDocumentAction,
  generateDocumentAction,
} from "@/app/actions/documents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { MaskedPeselText } from "@/components/ui/masked-pesel-text";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import {
  appendDictationText,
  formatRecordingDuration,
  useRealtimeDictation,
} from "@/components/forms/use-realtime-dictation";
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
  const [noteValue, setNoteValue] = useState("");
  const handleDictationTranscript = useCallback((transcript: string) => {
    setNoteValue((currentValue) => appendDictationText(currentValue, transcript));
  }, []);
  const {
    elapsedSeconds,
    isActive: isDictationActive,
    isConnecting: isDictationConnecting,
    isFinalizing: isDictationFinalizing,
    liveTranscript,
    message: dictationMessage,
    reset: resetDictation,
    support: dictationSupport,
    toggle: toggleDictation,
  } = useRealtimeDictation({
    onTranscript: handleDictationTranscript,
  });

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

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      resetDictation();
      setNoteValue("");
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [resetDictation, state.status, state.message]);

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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-sm font-semibold text-foreground" htmlFor="note">
              {isAppendMode ? "Nowe informacje do dopisania" : "Notatka lekarza"}
            </label>
            <Button
              aria-pressed={isDictationActive}
              className="min-w-32"
              disabled={
                dictationSupport === "checking" ||
                isDictationConnecting ||
                isDictationFinalizing
              }
              onClick={toggleDictation}
              size="sm"
              type="button"
              variant={isDictationActive ? "danger" : "secondary"}
            >
              {isDictationActive ? (
                <>
                  <MicOff aria-hidden="true" className="size-4" />
                  {isDictationConnecting ? "Łączenie..." : "Zatrzymaj"}
                </>
              ) : (
                <>
                  <Mic aria-hidden="true" className="size-4" />
                  Dyktuj
                </>
              )}
            </Button>
          </div>
          <Textarea
            aria-describedby="speech-status"
            id="note"
            name="note"
            onChange={(event) => setNoteValue(event.target.value)}
            placeholder={
              isAppendMode
                ? "Np. od dziś gorączka 38,5, w badaniu gardło zaczerwienione, zalecono kontrolę za 3 dni"
                : "Np. 3 dni kaszel suchy, stan podgorączkowy, osłuchowo bez zmian, podejrzenie infekcji wirusowej, zal odpoczynek i nawodnienie"
            }
            value={noteValue}
          />
          {isDictationActive ? (
            <div className="overflow-hidden rounded-2xl border border-danger/25 bg-danger-soft">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="relative flex size-3 shrink-0">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-75" />
                    <span className="relative inline-flex size-3 rounded-full bg-danger" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {isDictationConnecting ? "Łączenie z dyktowaniem" : "Dyktowanie realtime włączone"}
                    </p>
                    <p className="text-xs leading-5 text-muted">
                      Mikrofon nasłuchuje i pokazuje tekst na żywo do kliknięcia Zatrzymaj.
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-white/70 px-3 py-1 font-mono text-sm font-semibold text-danger">
                  {formatRecordingDuration(elapsedSeconds)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden bg-white/50">
                <div className="recording-sweep h-full w-1/2 bg-danger" />
              </div>
              {liveTranscript ? (
                <div className="border-t border-danger/15 bg-white/45 px-4 py-3">
                  <p className="whitespace-pre-wrap text-sm italic leading-6 text-foreground">
                    {liveTranscript}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
          <div aria-live="polite" className="min-h-6" id="speech-status">
            {dictationSupport === "unsupported" || dictationMessage ? (
              <p className="text-sm leading-6 text-muted">
                {dictationMessage ?? "Dyktowanie realtime jest niedostępne w tej przeglądarce."}
              </p>
            ) : null}
          </div>
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
