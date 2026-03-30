"use client";

import { useActionState } from "react";

import { addAbbreviationAction } from "@/app/actions/abbreviations";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialActionState } from "@/lib/types";

export function AddAbbreviationForm() {
  const [state, action] = useActionState(addAbbreviationAction, initialActionState);

  return (
    <form action={action} className="grid gap-4 rounded-[24px] border border-border bg-white/70 p-5 md:grid-cols-[0.7fr_1.3fr_auto] md:items-end">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-foreground" htmlFor="shortcut">
          Skrót
        </label>
        <Input id="shortcut" name="shortcut" placeholder="bp" />
        <FormMessage message={state.fieldErrors?.shortcut?.[0]} tone="error" />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-foreground" htmlFor="expansion">
          Rozwinięcie
        </label>
        <Input id="expansion" name="expansion" placeholder="ból pleców" />
        <FormMessage message={state.fieldErrors?.expansion?.[0]} tone="error" />
      </div>

      <SubmitButton className="md:min-w-36" pendingLabel="Zapisywanie..." type="submit">
        Dodaj skrót
      </SubmitButton>

      <FormMessage
        className="md:col-span-3"
        message={state.message}
        tone={state.status === "success" ? "success" : "error"}
      />
    </form>
  );
}