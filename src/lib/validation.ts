import { z } from "zod";

import { promptTemplateTokens } from "@/lib/prompt-templates";

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export const loginSchema = z.object({
  email: z.string().trim().email("Podaj poprawny adres e-mail."),
  password: z.string().min(1, "Hasło jest wymagane."),
});

export const abbreviationSchema = z.object({
  shortcut: z
    .string()
    .trim()
    .min(1, "Skrót jest wymagany.")
    .max(80, "Skrót jest zbyt długi.")
    .transform(collapseWhitespace),
  expansion: z
    .string()
    .trim()
    .min(1, "Rozwinięcie jest wymagane.")
    .max(300, "Rozwinięcie jest zbyt długie.")
    .transform(collapseWhitespace),
});

export const noteSchema = z.object({
  note: z.string().trim().min(1, "Wpisz notatkę z wizyty."),
});

export const appendNoteSchema = z.object({
  id: z.string().uuid("Nieprawidłowy identyfikator zasobu."),
  note: z.string().trim().min(1, "Wpisz informacje do dopisania."),
});

export const deleteByIdSchema = z.object({
  id: z.string().uuid("Nieprawidłowy identyfikator zasobu."),
});

export const generatedDocumentSchema = z.object({
  sections: z.object({
    interview: z.string(),
    conditionsAndOperations: z.string(),
    allergies: z.string(),
    familyHistory: z.string(),
    examination: z.string(),
    diagnosis: z.string(),
    recommendations: z.string(),
    prescriptionCode: z.string(),
  }),
  suggestions: z.array(z.string().trim().min(1)).max(10),
});

const promptTemplateSchema = z
  .string()
  .trim()
  .min(1, "Pole jest wymagane.")
  .max(25_000, "Treść promptu jest zbyt długa.");

export const userPromptTemplatesSchema = z
  .object({
    sectionsSystemPrompt: promptTemplateSchema,
    sectionsUserPrompt: promptTemplateSchema,
    suggestionsSystemPrompt: promptTemplateSchema,
    suggestionsUserPrompt: promptTemplateSchema,
  })
  .superRefine((value, ctx) => {
    if (!value.sectionsUserPrompt.includes(promptTemplateTokens.abbreviations)) {
      ctx.addIssue({
        code: "custom",
        path: ["sectionsUserPrompt"],
        message: `Prompt musi zawierać placeholder ${promptTemplateTokens.abbreviations}.`,
      });
    }

    if (!value.sectionsUserPrompt.includes(promptTemplateTokens.note)) {
      ctx.addIssue({
        code: "custom",
        path: ["sectionsUserPrompt"],
        message: `Prompt musi zawierać placeholder ${promptTemplateTokens.note}.`,
      });
    }

    if (!value.suggestionsUserPrompt.includes(promptTemplateTokens.sections)) {
      ctx.addIssue({
        code: "custom",
        path: ["suggestionsUserPrompt"],
        message: `Prompt musi zawierać placeholder ${promptTemplateTokens.sections}.`,
      });
    }
  });

export function formDataToObject(formData: FormData) {
  return Object.fromEntries(
    Array.from(formData.entries()).filter(([key]) => !key.startsWith("$ACTION_")),
  );
}