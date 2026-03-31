"use client";

import { useActionState } from "react";

import { savePromptTemplatesAction } from "@/app/actions/prompts";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { promptTemplateTokens } from "@/lib/prompt-templates";
import { initialActionState, type UserPromptTemplates } from "@/lib/types";

type PromptSettingsFormProps = {
  initialValues: UserPromptTemplates;
};

export function PromptSettingsForm({ initialValues }: PromptSettingsFormProps) {
  const [state, action] = useActionState(savePromptTemplatesAction, initialActionState);

  return (
    <form action={action} className="space-y-5">
      <div className="rounded-3xl border border-border bg-white/65 px-4 py-4 text-sm leading-7 text-muted">
        Domyślne prompty z generatora są już wczytane poniżej. Zmiany zapisują się per konto lekarza.
        W szablonie użytkownika dla generowania sekcji zostaw placeholdery {promptTemplateTokens.abbreviations} i {promptTemplateTokens.note}, a w szablonie sugestii {promptTemplateTokens.sections}.
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground" htmlFor="sectionsSystemPrompt">
            System prompt: generowanie sekcji
          </label>
          <Textarea
            className="min-h-[420px]"
            defaultValue={initialValues.sectionsSystemPrompt}
            id="sectionsSystemPrompt"
            name="sectionsSystemPrompt"
          />
          <FormMessage message={state.fieldErrors?.sectionsSystemPrompt?.[0]} tone="error" />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground" htmlFor="sectionsUserPrompt">
            User prompt: generowanie sekcji
          </label>
          <Textarea
            className="min-h-[420px]"
            defaultValue={initialValues.sectionsUserPrompt}
            id="sectionsUserPrompt"
            name="sectionsUserPrompt"
          />
          <FormMessage
            message={`Wymagane placeholdery: ${promptTemplateTokens.abbreviations}, ${promptTemplateTokens.note}.`}
          />
          <FormMessage message={state.fieldErrors?.sectionsUserPrompt?.[0]} tone="error" />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground" htmlFor="suggestionsSystemPrompt">
            System prompt: sugestie doprecyzowania
          </label>
          <Textarea
            className="min-h-[220px]"
            defaultValue={initialValues.suggestionsSystemPrompt}
            id="suggestionsSystemPrompt"
            name="suggestionsSystemPrompt"
          />
          <FormMessage message={state.fieldErrors?.suggestionsSystemPrompt?.[0]} tone="error" />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground" htmlFor="suggestionsUserPrompt">
            User prompt: sugestie doprecyzowania
          </label>
          <Textarea
            className="min-h-[220px]"
            defaultValue={initialValues.suggestionsUserPrompt}
            id="suggestionsUserPrompt"
            name="suggestionsUserPrompt"
          />
          <FormMessage message={`Wymagany placeholder: ${promptTemplateTokens.sections}.`} />
          <FormMessage message={state.fieldErrors?.suggestionsUserPrompt?.[0]} tone="error" />
        </div>
      </div>

      <FormMessage
        message={state.message}
        tone={state.status === "success" ? "success" : "error"}
      />

      <SubmitButton pendingLabel="Zapisywanie promptów..." size="lg" type="submit">
        Zapisz prompty
      </SubmitButton>
    </form>
  );
}