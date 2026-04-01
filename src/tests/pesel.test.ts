import { describe, expect, it } from "vitest";

import {
  isValidPesel,
  replacePeselsWithTokens,
  restorePeselsInText,
  splitTextByPesels,
} from "@/lib/pesel";

describe("PESEL helpers", () => {
  it("replaces all recognized PESELs with placeholders and restores exact source values", () => {
    const source = "Pacjent 1: 02211312372. Pacjent 2: 022113-12372. Numer 12345678901 zostaje bez zmian.";
    const { text, pesels } = replacePeselsWithTokens(source);

    expect(pesels).toHaveLength(2);
    expect(text).toContain("__PESEL_1__");
    expect(text).toContain("__PESEL_2__");
    expect(text).toContain("12345678901");
    expect(restorePeselsInText(text, pesels)).toBe(source);
  });

  it("validates PESEL checksum", () => {
    expect(isValidPesel("02211312372")).toBe(true);
    expect(isValidPesel("02211312373")).toBe(false);
  });

  it("splits detected PESELs into visible and blurred parts", () => {
    const segments = splitTextByPesels("PESEL: 022113-12372");
    const peselSegment = segments.find((segment) => segment.type === "pesel");

    expect(peselSegment).toMatchObject({
      type: "pesel",
      value: "022113-12372",
      maskedVisible: "022113",
      maskedHidden: "-12372",
    });
  });
});