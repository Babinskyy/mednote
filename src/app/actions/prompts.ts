"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { formDataToObject, userPromptTemplatesSchema } from "@/lib/validation";

export async function savePromptTemplatesAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = userPromptTemplatesSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Nie udało się zapisać promptów.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return {
      status: "error",
      message: "Brakuje konfiguracji Supabase.",
    };
  }

  const { error } = await supabase.from("user_prompt_preferences").upsert(
    {
      user_id: user.id,
      sections_system_prompt: parsed.data.sectionsSystemPrompt,
      sections_user_prompt: parsed.data.sectionsUserPrompt,
      suggestions_system_prompt: parsed.data.suggestionsSystemPrompt,
      suggestions_user_prompt: parsed.data.suggestionsUserPrompt,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id",
      ignoreDuplicates: false,
    },
  );

  if (error) {
    return {
      status: "error",
      message: "Nie udało się zapisać promptów do bazy.",
    };
  }

  revalidatePath("/");
  revalidatePath("/settings");

  return {
    status: "success",
    message: "Prompty zostały zapisane dla tego konta.",
  };
}