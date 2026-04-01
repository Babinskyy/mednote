import type { DocumentConversationEntry } from "@/lib/types";
import { documentConversationHistorySchema } from "@/lib/validation";

function normalizeNoteContent(note: string) {
  return note.trim();
}

export function buildInitialConversationHistory(
  note: string,
  timestamp: string,
): DocumentConversationEntry[] {
  const content = normalizeNoteContent(note);

  if (!content) {
    return [];
  }

  return [
    {
      kind: "initial",
      content,
      created_at: timestamp,
    },
  ];
}

export function appendConversationHistory(
  history: DocumentConversationEntry[],
  note: string,
  timestamp: string,
): DocumentConversationEntry[] {
  const content = normalizeNoteContent(note);

  if (!content) {
    return history;
  }

  return [
    ...history,
    {
      kind: history.length ? "append" : "initial",
      content,
      created_at: timestamp,
    },
  ];
}

export function getConversationHistoryFromUnknown(
  value: unknown,
  fallbackNote: string,
  fallbackTimestamp: string,
): DocumentConversationEntry[] {
  const parsed = documentConversationHistorySchema.safeParse(value);

  if (parsed.success && parsed.data.length) {
    return parsed.data;
  }

  return buildInitialConversationHistory(fallbackNote, fallbackTimestamp);
}