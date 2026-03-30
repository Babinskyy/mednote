"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { generateVisitDocument } from "@/lib/document-generation";
import { getAbbreviationsForUser } from "@/lib/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { formDataToObject, deleteByIdSchema, noteSchema } from "@/lib/validation";

export async function generateDocumentAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = noteSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Notatka jest wymagana.",
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

  const abbreviations = await getAbbreviationsForUser(user.id);
  const payload = await generateVisitDocument(parsed.data.note, abbreviations);

  const { error: deleteError } = await supabase.from("medical_documents").delete().eq("user_id", user.id);

  if (deleteError) {
    return {
      status: "error",
      message: "Nie udało się usunąć poprzedniego dokumentu.",
    };
  }

  const { error } = await supabase.from("medical_documents").insert({
    user_id: user.id,
    raw_note: parsed.data.note,
    expanded_note: payload.expandedNote,
    sections: payload.sections,
    suggestions: payload.suggestions,
  });

  if (error) {
    return {
      status: "error",
      message: "Nie udało się zapisać wygenerowanego dokumentu.",
    };
  }

  revalidatePath("/");

  return {
    status: "success",
    message: "Dokument został wygenerowany.",
  };
}

export async function deleteDocumentAction(formData: FormData) {
  const user = await requireUser();
  const parsed = deleteByIdSchema.safeParse({ id: formData.get("id") });

  if (!parsed.success) {
    return;
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return;
  }

  await supabase.from("medical_documents").delete().eq("id", parsed.data.id).eq("user_id", user.id);

  revalidatePath("/");
}