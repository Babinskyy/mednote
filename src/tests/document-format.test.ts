import { describe, expect, it } from "vitest";

import { formatDocumentForClipboard } from "@/lib/document-format";

describe("formatDocumentForClipboard", () => {
  it("renders all sections in copy-friendly order", () => {
    const result = formatDocumentForClipboard({
      interview: "Kaszel od 3 dni.",
      conditionsAndOperations: "Po appendektomii, w wywiadzie nadciśnienie tętnicze.",
      allergies: "Alergia na penicylinę.",
      familyHistory: "Ojciec chorował na cukrzycę typu 2.",
      examination: "Osłuchowo bez zmian.",
      diagnosis: "Podejrzenie infekcji wirusowej.",
      recommendations: "Odpoczynek, nawodnienie.",
      prescriptionCode: "Kod e-recepty 1234.",
    });

    expect(result).toContain("Wywiad:\nKaszel od 3 dni.");
    expect(result).toContain("Choroby i operacje:\nPo appendektomii, w wywiadzie nadciśnienie tętnicze.");
    expect(result).toContain("Alergie:\nAlergia na penicylinę.");
    expect(result).toContain("Wywiad rodzinny:\nOjciec chorował na cukrzycę typu 2.");
    expect(result).toContain("Badanie:\nOsłuchowo bez zmian.");
    expect(result).toContain("Rozpoznanie:\nPodejrzenie infekcji wirusowej.");
    expect(result).toContain("Zalecenia:\nOdpoczynek, nawodnienie.");
    expect(result).toContain("Kod recepty:\nKod e-recepty 1234.");
  });

  it("fills missing sections with brak danych", () => {
    const result = formatDocumentForClipboard({
      interview: "",
      conditionsAndOperations: "",
      allergies: "",
      familyHistory: "",
      examination: "",
      diagnosis: "",
      recommendations: "",
      prescriptionCode: "",
    });

    expect(result).toContain("Wywiad:\nbrak danych");
    expect(result).toContain("Zalecenia:\nbrak danych");
    expect(result).toContain("Kod recepty:\nbrak danych");
  });
});