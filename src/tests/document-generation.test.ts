import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { appendToRawNote, generateVisitDocument } from "@/lib/document-generation";

const originalOpenAiApiKey = process.env.OPENAI_API_KEY;

describe("generateVisitDocument", () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    if (originalOpenAiApiKey) {
      process.env.OPENAI_API_KEY = originalOpenAiApiKey;
      return;
    }

    delete process.env.OPENAI_API_KEY;
  });

  it("returns follow-up suggestions when the generated card has obvious gaps", async () => {
    const result = await generateVisitDocument("3 dni kaszel suchy, osłuchowo bez zmian.", []);

    expect(result.sections.interview).toContain("3 dni kaszel suchy");
    expect(result.sections.examination).toContain("osłuchowo bez zmian");
    expect(result.sections.conditionsAndOperations).toBe("");
    expect(result.sections.allergies).toBe("");
    expect(result.sections.familyHistory).toBe("");
    expect(result.sections.prescriptionCode).toBe("");
    expect(result.suggestions).toEqual(
      expect.arrayContaining([
        "Dopytaj o najbardziej prawdopodobne rozpoznanie lub podejrzenie kliniczne do wpisania.",
        "Dopytaj o zalecenia po wizycie: leczenie, kontrolę lub badania dodatkowe.",
      ]),
    );
  });

  it("returns no suggestions when the generated card is already complete", async () => {
    const result = await generateVisitDocument(
      "3 dni kaszel suchy i stan podgorączkowy. Osłuchowo bez zmian, temp 37,8. Rozpoznanie: infekcja wirusowa górnych dróg oddechowych. Zalecenia: odpoczynek, nawodnienie, paracetamol doraźnie, kontrola w razie nasilenia objawów.",
      [],
    );

    expect(result.suggestions).toEqual([]);
  });

  it("merges the previous note with appended details before regeneration", async () => {
    const combinedNote = appendToRawNote(
      "3 dni kaszel suchy i stan podgorączkowy. Osłuchowo bez zmian.",
      "Rozpoznanie: infekcja wirusowa górnych dróg oddechowych. Zalecenia: odpoczynek, nawodnienie, kontrola w razie nasilenia objawów.",
    );

    const result = await generateVisitDocument(combinedNote, []);

    expect(combinedNote).toBe(
      "3 dni kaszel suchy i stan podgorączkowy. Osłuchowo bez zmian.\nRozpoznanie: infekcja wirusowa górnych dróg oddechowych. Zalecenia: odpoczynek, nawodnienie, kontrola w razie nasilenia objawów.",
    );
    expect(result.sections.diagnosis).toContain("Rozpoznanie: infekcja wirusowa górnych dróg oddechowych.");
    expect(result.sections.recommendations).toContain(
      "Zalecenia: odpoczynek, nawodnienie, kontrola w razie nasilenia objawów.",
    );
    expect(result.suggestions).toEqual([]);
  });

  it("classifies additional sections in heuristic mode", async () => {
    const result = await generateVisitDocument(
      "W wywiadzie nadciśnienie tętnicze, po operacji wyrostka. Alergia na penicylinę. Wywiad rodzinny dodatni w kierunku cukrzycy u matki. Kod recepty 1234 5678. Osłuchowo bez zmian.",
      [],
    );

    expect(result.sections.conditionsAndOperations).toContain("W wywiadzie nadciśnienie tętnicze, po operacji wyrostka.");
    expect(result.sections.allergies).toContain("Alergia na penicylinę.");
    expect(result.sections.familyHistory).toContain("Wywiad rodzinny dodatni w kierunku cukrzycy u matki.");
    expect(result.sections.prescriptionCode).toContain("Kod recepty 1234 5678.");
  });

  it("restores PESEL values after tokenized processing", async () => {
    const result = await generateVisitDocument(
      "Pacjent zgłasza kaszel od 3 dni. PESEL 02211312372. Rozpoznanie: infekcja wirusowa. Zalecenia: odpoczynek.",
      [],
    );

    expect(result.expandedNote).toContain("02211312372");
    expect(result.sections.interview).toContain("02211312372");
    expect(result.sections.diagnosis).toContain("Rozpoznanie: infekcja wirusowa.");
    expect(result.sections.recommendations).toContain("Zalecenia: odpoczynek.");
    expect(result.suggestions.join(" ")).not.toContain("__PESEL_");
  });
});