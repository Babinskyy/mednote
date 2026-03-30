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

  it("supports shortcuts consisting of multiple words", () => {
    const result = expandAbbreviations("ból w klp od wczoraj, ból w klp.", [
      { shortcut: "ból w klp", expansion: "ból w klatce piersiowej" },
    ]);

    expect(result).toBe("ból w klatce piersiowej od wczoraj, ból w klatce piersiowej.");
  });

  it("prefers longer matching shortcuts before shorter ones", () => {
    const result = expandAbbreviations("ból w klp i klp bez urazu", [
      { shortcut: "klp", expansion: "klatka piersiowa" },
      { shortcut: "ból w klp", expansion: "ból w klatce piersiowej" },
    ]);

    expect(result).toBe("ból w klatce piersiowej i klatka piersiowa bez urazu");
  });
});