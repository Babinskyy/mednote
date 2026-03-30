import { describe, expect, it } from "vitest";

import { formatDocumentForClipboard } from "@/lib/document-format";

describe("formatDocumentForClipboard", () => {
  it("renders all sections in copy-friendly order", () => {
    const result = formatDocumentForClipboard({
      interview: "Kaszel od 3 dni.",
      examination: "Osłuchowo bez zmian.",
      diagnosis: "Podejrzenie infekcji wirusowej.",
      recommendations: "Odpoczynek, nawodnienie.",
    });

    expect(result).toContain("Wywiad:\nKaszel od 3 dni.");
    expect(result).toContain("Badanie:\nOsłuchowo bez zmian.");
    expect(result).toContain("Rozpoznanie:\nPodejrzenie infekcji wirusowej.");
    expect(result).toContain("Zalecenia:\nOdpoczynek, nawodnienie.");
  });

  it("fills missing sections with brak danych", () => {
    const result = formatDocumentForClipboard({
      interview: "",
      examination: "",
      diagnosis: "",
      recommendations: "",
    });

    expect(result).toContain("Wywiad:\nbrak danych");
    expect(result).toContain("Zalecenia:\nbrak danych");
  });
});