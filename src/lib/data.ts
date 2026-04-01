import type { User } from "@supabase/supabase-js";

import { defaultUserPromptTemplates } from "@/lib/prompt-templates";
import { getConversationHistoryFromUnknown } from "@/lib/note-history";
import type { AbbreviationRecord, DocumentRecord, UserPromptTemplates } from "@/lib/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { generatedDocumentSchema, userPromptTemplatesSchema } from "@/lib/validation";

type MedicalDocumentRow = {
  id: string;
  raw_note: string;
  expanded_note: string;
  conversation_history: unknown;
  sections: unknown;
  suggestions: unknown;
  created_at: string;
};

function parseDocumentRecord(data: MedicalDocumentRow) {
  const parsed = generatedDocumentSchema.safeParse({
    sections: data.sections,
    suggestions: data.suggestions,
  });

  if (!parsed.success) {
    return null;
  }

  return {
    id: data.id,
    raw_note: data.raw_note,
    expanded_note: data.expanded_note,
    conversation_history: getConversationHistoryFromUnknown(
      data.conversation_history,
      data.raw_note,
      data.created_at,
    ),
    created_at: data.created_at,
    sections: parsed.data.sections,
    suggestions: parsed.data.suggestions,
  } satisfies DocumentRecord;
}

export async function getAbbreviationsForUser(userId: string) {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return [] satisfies AbbreviationRecord[];
  }

  const { data } = await supabase
    .from("abbreviations")
    .select("id, shortcut, expansion, created_at")
    .eq("user_id", userId)
    .order("shortcut", { ascending: true });

  return (data ?? []) as AbbreviationRecord[];
}

export async function getCurrentDocumentForUser(userId: string) {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data: activeDocumentData, error: activeDocumentError } = await supabase
    .from("user_active_documents")
    .select("active_document_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!activeDocumentError && activeDocumentData) {
    if (!activeDocumentData.active_document_id) {
      return null;
    }

    const { data: selectedDocument } = await supabase
      .from("medical_documents")
      .select(
        "id, raw_note, expanded_note, conversation_history, sections, suggestions, created_at",
      )
      .eq("user_id", userId)
      .eq("id", activeDocumentData.active_document_id)
      .maybeSingle();

    if (selectedDocument) {
      const parsedDocument = parseDocumentRecord(selectedDocument as MedicalDocumentRow);

      if (parsedDocument) {
        return parsedDocument;
      }
    }

    return null;
  }

  const [currentDocument] = await getDocumentHistoryForUser(userId, 1);

  return currentDocument ?? null;
}

export async function getDocumentHistoryForUser(userId: string, limit = 10) {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return [] satisfies DocumentRecord[];
  }

  const { data } = await supabase
    .from("medical_documents")
    .select(
      "id, raw_note, expanded_note, conversation_history, sections, suggestions, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  return ((data ?? []) as MedicalDocumentRow[])
    .map(parseDocumentRecord)
    .filter((document): document is DocumentRecord => document !== null);
}

export async function getPromptTemplatesForUser(userId: string): Promise<UserPromptTemplates> {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return defaultUserPromptTemplates;
  }

  const { data } = await supabase
    .from("user_prompt_preferences")
    .select(
      "sections_system_prompt, sections_user_prompt, suggestions_system_prompt, suggestions_user_prompt",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    return defaultUserPromptTemplates;
  }

  const parsed = userPromptTemplatesSchema.safeParse({
    sectionsSystemPrompt:
      data.sections_system_prompt ?? defaultUserPromptTemplates.sectionsSystemPrompt,
    sectionsUserPrompt: data.sections_user_prompt ?? defaultUserPromptTemplates.sectionsUserPrompt,
    suggestionsSystemPrompt:
      data.suggestions_system_prompt ?? defaultUserPromptTemplates.suggestionsSystemPrompt,
    suggestionsUserPrompt:
      data.suggestions_user_prompt ?? defaultUserPromptTemplates.suggestionsUserPrompt,
  });

  if (!parsed.success) {
    return defaultUserPromptTemplates;
  }

  return parsed.data;
}

export function getUserDisplayName(user: User) {
  return user.user_metadata.full_name ?? user.email ?? "Lekarz";
}