"use client";

import { useActionState } from "react";

import { loginAction } from "@/app/actions/auth";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialActionState } from "@/lib/types";

export function LoginForm() {
  const [state, action] = useActionState(loginAction, initialActionState);

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-foreground" htmlFor="email">
          E-mail
        </label>
        <Input id="email" name="email" placeholder="lekarz@placowka.pl" type="email" />
        <FormMessage message={state.fieldErrors?.email?.[0]} tone="error" />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-foreground" htmlFor="password">
          Hasło
        </label>
        <Input id="password" name="password" placeholder="Hasło" type="password" />
        <FormMessage message={state.fieldErrors?.password?.[0]} tone="error" />
      </div>

      <FormMessage message={state.message} tone={state.status === "success" ? "success" : "error"} />

      <SubmitButton className="w-full" pendingLabel="Logowanie..." size="lg" type="submit">
        Zaloguj
      </SubmitButton>
    </form>
  );
}