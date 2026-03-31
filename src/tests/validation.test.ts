import { describe, expect, it } from "vitest";

import { defaultUserPromptTemplates } from "@/lib/prompt-templates";
import { abbreviationSchema, loginSchema, userPromptTemplatesSchema } from "@/lib/validation";

describe("validation schemas", () => {
  it("accepts shortcuts with spaces", () => {
    const parsed = abbreviationSchema.safeParse({
      shortcut: "bp alt",
      expansion: "ból pleców",
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts valid login payload", () => {
    const parsed = loginSchema.safeParse({
      email: "lekarz@example.com",
      password: "sekret",
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts the default prompt templates", () => {
    const parsed = userPromptTemplatesSchema.safeParse(defaultUserPromptTemplates);

    expect(parsed.success).toBe(true);
  });

  it("rejects prompt templates without required placeholders", () => {
    const parsed = userPromptTemplatesSchema.safeParse({
      ...defaultUserPromptTemplates,
      sectionsUserPrompt: "Brakuje placeholderów.",
    });

    expect(parsed.success).toBe(false);
  });
});