import { z } from "zod";

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
    .regex(/^\S+$/, "Skrót nie może zawierać spacji."),
  expansion: z
    .string()
    .trim()
    .min(1, "Rozwinięcie jest wymagane.")
    .max(300, "Rozwinięcie jest zbyt długie."),
});

export const noteSchema = z.object({
  note: z.string().trim().min(1, "Wpisz notatkę z wizyty."),
});

export const deleteByIdSchema = z.object({
  id: z.string().uuid("Nieprawidłowy identyfikator zasobu."),
});

export const generatedDocumentSchema = z.object({
  sections: z.object({
    interview: z.string(),
    examination: z.string(),
    diagnosis: z.string(),
    recommendations: z.string(),
  }),
  suggestions: z.array(z.string().trim().min(1)).max(10),
});

export function formDataToObject(formData: FormData) {
  return Object.fromEntries(
    Array.from(formData.entries()).filter(([key]) => !key.startsWith("$ACTION_")),
  );
}