import { describe, expect, it } from "vitest";

import { abbreviationSchema, loginSchema } from "@/lib/validation";

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
});