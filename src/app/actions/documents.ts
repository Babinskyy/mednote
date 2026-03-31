"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { appendToRawNote, generateVisitDocument } from "@/lib/document-generation";
import { getAbbreviationsForUser, getCurrentDocumentForUser, getPromptTemplatesForUser } from "@/lib/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { appendNoteSchema, formDataToObject, deleteByIdSchema, noteSchema } from "@/lib/validation";

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

  const [abbreviations, promptTemplates] = await Promise.all([
    getAbbreviationsForUser(user.id),
    getPromptTemplatesForUser(user.id),
  ]);
  const payload = await generateVisitDocument(parsed.data.note, abbreviations, promptTemplates);

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

export async function appendToDocumentAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = appendNoteSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Wpisz informacje do dopisania.",
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

  const currentDocument = await getCurrentDocumentForUser(user.id);

  if (!currentDocument || currentDocument.id !== parsed.data.id) {
    return {
      status: "error",
      message: "Nie znaleziono dokumentu do uzupełnienia.",
    };
  }

  const [abbreviations, promptTemplates] = await Promise.all([
    getAbbreviationsForUser(user.id),
    getPromptTemplatesForUser(user.id),
  ]);
  const combinedNote = appendToRawNote(currentDocument.raw_note, parsed.data.note);
  const payload = await generateVisitDocument(combinedNote, abbreviations, promptTemplates);

  const { error } = await supabase
    .from("medical_documents")
    .update({
      raw_note: combinedNote,
      expanded_note: payload.expandedNote,
      sections: payload.sections,
      suggestions: payload.suggestions,
    })
    .eq("id", currentDocument.id)
    .eq("user_id", user.id);

  if (error) {
    return {
      status: "error",
      message: "Nie udało się uzupełnić dokumentu.",
    };
  }

  revalidatePath("/");

  return {
    status: "success",
    message: "Dokument został uzupełniony.",
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