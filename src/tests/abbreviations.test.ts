import { describe, expect, it } from "vitest";

import { expandAbbreviations } from "@/lib/abbreviations";

describe("expandAbbreviations", () => {
  it("replaces only exact case-sensitive tokens", () => {
    const result = expandAbbreviations("bp BP bp.", [
      { shortcut: "bp", expansion: "ból pleców" },
      { shortcut: "BP", expansion: "badanie przedmiotowe" },
    ]);

    expect(result).toBe("ból pleców badanie przedmiotowe ból pleców.");
  });

  it("preserves unmatched fragments inside longer words", () => {
    const result = expandAbbreviations("bp i bplec, bp/bd", [
      { shortcut: "bp", expansion: "ból pleców" },
    ]);

    expect(result).toBe("ból pleców i bplec, bp/bd");
  });
});