"use client";

import { useActionState } from "react";

import { generateDocumentAction } from "@/app/actions/documents";
import { Badge } from "@/components/ui/badge";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState } from "@/lib/types";

type GenerateNoteFormProps = {
  abbreviationCount: number;
  aiEnabled: boolean;
};

export function GenerateNoteForm({ abbreviationCount, aiEnabled }: GenerateNoteFormProps) {
  const [state, action] = useActionState(generateDocumentAction, initialActionState);

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 text-sm text-muted">
        <span>
          Prywatne skróty aktywne: <strong className="text-foreground">{abbreviationCount}</strong>
        </span>
        {!aiEnabled ? <Badge>Tryb lokalny</Badge> : <Badge>LLM</Badge>}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-foreground" htmlFor="note">
          Notatka lekarza
        </label>
        <Textarea
          id="note"
          name="note"
          placeholder="Np. 3 dni kaszel suchy, stan podgorączkowy, osłuchowo bez zmian, podejrzenie infekcji wirusowej, zal odpoczynek i nawodnienie"
        />
        <FormMessage message={state.fieldErrors?.note?.[0]} tone="error" />
      </div>

      <p className="rounded-2xl bg-accent-soft px-4 py-3 text-sm leading-6 text-foreground">
        Prywatne skróty są rozwijane 1:1. W trybie LLM system może też rozwinąć oczywiste skróty z kontekstu,
        ale nie powinien dopisywać nowych faktów klinicznych.
      </p>

      <FormMessage message={state.message} tone={state.status === "success" ? "success" : "error"} />

      <SubmitButton pendingLabel="Generowanie..." size="lg" type="submit">
        Generuj kartę wizyty
      </SubmitButton>
    </form>
  );
}