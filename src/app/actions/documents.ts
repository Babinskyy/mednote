"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { transcribeAudioNote } from "@/lib/audio-transcription";
import { appendToRawNote, generateVisitDocument } from "@/lib/document-generation";
import { getAbbreviationsForUser, getCurrentDocumentForUser, getPromptTemplatesForUser } from "@/lib/data";
import { appendConversationHistory, buildInitialConversationHistory } from "@/lib/note-history";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { appendNoteSchema, formDataToObject, deleteByIdSchema, noteSchema } from "@/lib/validation";

const maxAudioFileSize = 25 * 1024 * 1024;

type TranscribeAudioActionState = {
  status: "success" | "error";
  message?: string;
  transcript?: string;
};

async function setActiveDocumentForUser(
  userId: string,
  documentId: string | null,
) {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return { error: new Error("missing-supabase") };
  }

  const result = await supabase.from("user_active_documents").upsert(
    {
      user_id: userId,
      active_document_id: documentId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  return { error: result.error };
}

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
  const conversationTimestamp = new Date().toISOString();

  const { data: createdDocument, error } = await supabase
    .from("medical_documents")
    .insert({
      user_id: user.id,
      raw_note: parsed.data.note,
      expanded_note: payload.expandedNote,
      conversation_history: buildInitialConversationHistory(
        parsed.data.note,
        conversationTimestamp,
      ),
      sections: payload.sections,
      suggestions: payload.suggestions,
    })
    .select("id")
    .single();

  if (error || !createdDocument) {
    return {
      status: "error",
      message: "Nie udało się zapisać wygenerowanego dokumentu.",
    };
  }

  const activeDocumentUpdate = await setActiveDocumentForUser(user.id, createdDocument.id);

  if (activeDocumentUpdate.error) {
    return {
      status: "error",
      message: "Dokument zapisano, ale nie udało się ustawić go jako aktywnego.",
    };
  }

  revalidatePath("/");

  return {
    status: "success",
    message: "Dokument został wygenerowany i dodany do historii.",
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
  const updatedConversationHistory = appendConversationHistory(
    currentDocument.conversation_history,
    parsed.data.note,
    new Date().toISOString(),
  );
  const payload = await generateVisitDocument(combinedNote, abbreviations, promptTemplates);

  const { error } = await supabase
    .from("medical_documents")
    .update({
      raw_note: combinedNote,
      expanded_note: payload.expandedNote,
      conversation_history: updatedConversationHistory,
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

export async function transcribeAudioAction(
  formData: FormData,
): Promise<TranscribeAudioActionState> {
  await requireUser();

  const audio = formData.get("audio");

  if (!(audio instanceof File) || audio.size === 0) {
    return {
      status: "error",
      message: "Nie udało się odczytać nagrania.",
    };
  }

  if (audio.size > maxAudioFileSize) {
    return {
      status: "error",
      message: "Nagranie jest za długie. Zatrzymaj dyktowanie wcześniej i spróbuj ponownie.",
    };
  }

  try {
    const transcript = await transcribeAudioNote(audio);

    if (!transcript) {
      return {
        status: "error",
        message: "Brakuje konfiguracji OpenAI do transkrypcji.",
      };
    }

    return {
      status: "success",
      transcript,
    };
  } catch {
    return {
      status: "error",
      message: "Nie udało się przetworzyć nagrania.",
    };
  }
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

  const currentDocument = await getCurrentDocumentForUser(user.id);

  await supabase.from("medical_documents").delete().eq("id", parsed.data.id).eq("user_id", user.id);

  if (currentDocument?.id === parsed.data.id) {
    await setActiveDocumentForUser(user.id, null);
  }

  revalidatePath("/");
}

export async function setActiveDocumentAction(formData: FormData) {
  const user = await requireUser();
  const parsed = deleteByIdSchema.safeParse({ id: formData.get("id") });

  if (!parsed.success) {
    return;
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return;
  }

  const { data: document } = await supabase
    .from("medical_documents")
    .select("id")
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!document) {
    return;
  }

  await supabase.from("user_active_documents").upsert(
    {
      user_id: user.id,
      active_document_id: document.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  revalidatePath("/");
}

export async function clearActiveDocumentAction() {
  const user = await requireUser();

  const activeDocumentUpdate = await setActiveDocumentForUser(user.id, null);

  if (activeDocumentUpdate.error) {
    return;
  }

  revalidatePath("/");
}
