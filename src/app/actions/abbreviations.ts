"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { formDataToObject, abbreviationSchema, deleteByIdSchema } from "@/lib/validation";

export async function addAbbreviationAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = abbreviationSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Nie udało się zapisać skrótu.",
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

  const { error } = await supabase.from("abbreviations").upsert(
    {
      user_id: user.id,
      shortcut: parsed.data.shortcut,
      expansion: parsed.data.expansion,
    },
    {
      onConflict: "user_id,shortcut",
      ignoreDuplicates: false,
    },
  );

  if (error) {
    return {
      status: "error",
      message: "Nie udało się zapisać skrótu do bazy.",
    };
  }

  revalidatePath("/");
  revalidatePath("/settings");

  return {
    status: "success",
    message: "Skrót został zapisany.",
  };
}

export async function deleteAbbreviationAction(formData: FormData) {
  const user = await requireUser();
  const parsed = deleteByIdSchema.safeParse({ id: formData.get("id") });

  if (!parsed.success) {
    return;
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return;
  }

  await supabase.from("abbreviations").delete().eq("id", parsed.data.id).eq("user_id", user.id);

  revalidatePath("/");
  revalidatePath("/settings");
}