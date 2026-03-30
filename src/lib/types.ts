export type VisitSections = {
  interview: string;
  examination: string;
  diagnosis: string;
  recommendations: string;
};

export type GeneratedDocumentPayload = {
  sections: VisitSections;
  suggestions: string[];
};

export type AbbreviationRecord = {
  id: string;
  shortcut: string;
  expansion: string;
  created_at: string;
};

export type DocumentRecord = {
  id: string;
  raw_note: string;
  expanded_note: string;
  sections: VisitSections;
  suggestions: string[];
  created_at: string;
};

export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialActionState: ActionState = {
  status: "idle",
};