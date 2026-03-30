import type { User } from "@supabase/supabase-js";

import type { AbbreviationRecord, DocumentRecord } from "@/lib/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { generatedDocumentSchema } from "@/lib/validation";

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

  const { data } = await supabase
    .from("medical_documents")
    .select("id, raw_note, expanded_note, sections, suggestions, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return null;
  }

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
    created_at: data.created_at,
    sections: parsed.data.sections,
    suggestions: parsed.data.suggestions,
  } satisfies DocumentRecord;
}

export function getUserDisplayName(user: User) {
  return user.user_metadata.full_name ?? user.email ?? "Lekarz";
}