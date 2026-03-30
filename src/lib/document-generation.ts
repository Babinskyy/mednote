import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { expandAbbreviations } from "@/lib/abbreviations";
import { getOpenAIConfig } from "@/lib/env";
import type { AbbreviationRecord, GeneratedDocumentPayload, VisitSections } from "@/lib/types";
import { dedupeStrings } from "@/lib/utils";
import { generatedDocumentSchema } from "@/lib/validation";

const openAiSectionsSchema = generatedDocumentSchema.pick({ sections: true }).extend({
  expandedNote: z.string(),
});
const openAiSuggestionsSchema = generatedDocumentSchema.pick({ suggestions: true });

const diagnosisKeywords = [
  "rozpozn",
  "diag",
  "podejrzenie",
  "zapalen",
  "infek",
  "angina",
  "nadciś",
  "gryp",
  "covid",
];

const examinationKeywords = [
  "bad",
  "osłuch",
  "palp",
  "temp",
  "rr",
  "tętno",
  "sat",
  "spo2",
  "brzuch",
  "gardło",
  "węzł",
  "płuca",
  "serce",
];

const recommendationsKeywords = [
  "zalec",
  "kontrol",
  "recept",
  "dawk",
  "skier",
  "odpoczy",
  "nawod",
  "badania",
  "l4",
  "obserw",
];

const conditionsAndOperationsKeywords = [
  "chor",
  "nadciś",
  "cukr",
  "astm",
  "pochp",
  "oper",
  "zabieg",
  "append",
  "wyrost",
  "chole",
  "leczy",
  "w wywiadzie",
];

const allergyKeywords = [
  "alerg",
  "uczulen",
  "penic",
  "amoks",
  "nkl",
  "nsaid",
  "pyłk",
];

const familyHistoryKeywords = [
  "rodzin",
  "ojciec",
  "matka",
  "siostra",
  "brat",
  "babcia",
  "dziadek",
  "obciąż",
];

const prescriptionCodeKeywords = ["kod recept", "erecept", "e-recept", "recepta", "rp:"];

let openAiClient: OpenAI | null = null;

function getOpenAiClient() {
  const config = getOpenAIConfig();

  if (!config) {
    return null;
  }

  if (!openAiClient) {
    openAiClient = new OpenAI({ apiKey: config.apiKey });
  }

  return {
    client: openAiClient,
    model: config.model,
  };
}

function toSentences(note: string) {
  return note
    .replace(/\r/g, "")
    .split(/\n+|(?<=[.;!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function includesKeyword(sentence: string, keywords: string[]) {
  const lowered = sentence.toLowerCase();

  return keywords.some((keyword) => lowered.includes(keyword));
}

function appendSection(sections: VisitSections, key: keyof VisitSections, sentence: string) {
  sections[key] = sections[key] ? `${sections[key]} ${sentence}`.trim() : sentence;
}

function formatSectionsForPrompt(sections: VisitSections) {
  return [
    `Wywiad: ${sections.interview || "[brak]"}`,
    `Choroby i operacje: ${sections.conditionsAndOperations || "[brak]"}`,
    `Alergie: ${sections.allergies || "[brak]"}`,
    `Wywiad rodzinny: ${sections.familyHistory || "[brak]"}`,
    `Badanie: ${sections.examination || "[brak]"}`,
    `Rozpoznanie: ${sections.diagnosis || "[brak]"}`,
    `Zalecenia: ${sections.recommendations || "[brak]"}`,
    `Kod recepty: ${sections.prescriptionCode || "[brak]"}`,
  ].join("\n");
}

function containsAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function formatAbbreviationsForPrompt(
  abbreviations: Pick<AbbreviationRecord, "shortcut" | "expansion">[],
) {
  const entries = abbreviations
    .map(({ shortcut, expansion }) => ({
      shortcut: shortcut.trim(),
      expansion: expansion.trim(),
    }))
    .filter(({ shortcut, expansion }) => Boolean(shortcut) && Boolean(expansion))
    .sort((left, right) => right.shortcut.length - left.shortcut.length);

  if (!entries.length) {
    return "brak";
  }

  return entries
    .map(({ shortcut, expansion }) => `- ${shortcut} => ${expansion}`)
    .join("\n");
}

function buildSuggestions(note: string, sections: VisitSections) {
  const suggestions: string[] = [];
  const interview = sections.interview.trim();
  const examination = sections.examination.trim();
  const diagnosis = sections.diagnosis.trim();
  const recommendations = sections.recommendations.trim();
  const combinedText = [
    interview,
    sections.conditionsAndOperations.trim(),
    sections.allergies.trim(),
    sections.familyHistory.trim(),
    examination,
    diagnosis,
    recommendations,
    sections.prescriptionCode.trim(),
  ]
    .join(" ")
    .toLowerCase();

  if (!interview) {
    suggestions.push("Dopytaj o główny problem pacjenta i czas trwania objawów.");
  } else if (!containsAny(note.toLowerCase(), [/\b\d+\s*(dni|dzien|tyg|tygod|mies|miesi)/i, /od\s+wczoraj/i, /od\s+kilku/i, /od\s+rano/i])) {
    suggestions.push("Dopytaj od kiedy trwają objawy i jak zmieniały się w czasie.");
  }

  if (!examination) {
    suggestions.push("Dopytaj o wynik badania przedmiotowego albo uzupełnij, że badania nie wykonywano.");
  }

  if (!diagnosis) {
    suggestions.push("Dopytaj o najbardziej prawdopodobne rozpoznanie lub podejrzenie kliniczne do wpisania.");
  }

  if (!recommendations) {
    suggestions.push("Dopytaj o zalecenia po wizycie: leczenie, kontrolę lub badania dodatkowe.");
  } else if (!containsAny(combinedText, [/kontrol/i, /w razie/i, /piln/i, /ponownie/i])) {
    suggestions.push("Dopytaj, kiedy pacjent powinien zgłosić się do kontroli lub ponownie w razie pogorszenia.");
  }

  if (
    containsAny(combinedText, [/ból/i, /kaszel/i, /gorącz/i, /duszno/i, /biegun/i, /wymiot/i]) &&
    !containsAny(combinedText, [/od\s+/i, /od kilku/i, /\b\d+\s*(dni|dzien|tyg|tygod|mies|miesi)/i])
  ) {
    suggestions.push("Dopytaj o czas trwania i nasilenie głównych objawów, jeśli ma to znaczenie dla decyzji klinicznej.");
  }

  return dedupeStrings(suggestions).slice(0, 5);
}

function generateHeuristicDocument(note: string) {
  const sections: VisitSections = {
    interview: "",
    conditionsAndOperations: "",
    allergies: "",
    familyHistory: "",
    examination: "",
    diagnosis: "",
    recommendations: "",
    prescriptionCode: "",
  };

  for (const sentence of toSentences(note)) {
    if (includesKeyword(sentence, prescriptionCodeKeywords)) {
      appendSection(sections, "prescriptionCode", sentence);
      continue;
    }

    if (includesKeyword(sentence, allergyKeywords)) {
      appendSection(sections, "allergies", sentence);
      continue;
    }

    if (includesKeyword(sentence, familyHistoryKeywords)) {
      appendSection(sections, "familyHistory", sentence);
      continue;
    }

    if (includesKeyword(sentence, conditionsAndOperationsKeywords)) {
      appendSection(sections, "conditionsAndOperations", sentence);
      continue;
    }

    if (includesKeyword(sentence, diagnosisKeywords)) {
      appendSection(sections, "diagnosis", sentence);
      continue;
    }

    if (includesKeyword(sentence, recommendationsKeywords)) {
      appendSection(sections, "recommendations", sentence);
      continue;
    }

    if (includesKeyword(sentence, examinationKeywords)) {
      appendSection(sections, "examination", sentence);
      continue;
    }

    appendSection(sections, "interview", sentence);
  }

  if (!sections.interview.trim()) {
    sections.interview = note.trim();
  }

  return generatedDocumentSchema.parse({
    sections,
    suggestions: buildSuggestions(note, sections),
  });
}

export function appendToRawNote(rawNote: string, addition: string) {
  const baseNote = rawNote.trim();
  const additionalNote = addition.trim();

  if (!baseNote) {
    return additionalNote;
  }

  if (!additionalNote) {
    return baseNote;
  }

  return `${baseNote}\n${additionalNote}`;
}

async function generateSectionsWithOpenAi(
  note: string,
  abbreviations: Pick<AbbreviationRecord, "shortcut" | "expansion">[],
) {
  const context = getOpenAiClient();

  if (!context) {
    return null;
  }

  const completion = await context.client.chat.completions.parse({
    model: context.model,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: `Jesteś asystentem redagującym dokumentację medyczną na podstawie surowych notatek z wizyt POZ.

Twoim zadaniem jest przekształcenie skrótowej, nieuporządkowanej notatki lekarza w sformalizowaną, uporządkowaną i gotową do wpisania do dokumentacji medycznej treść. Masz wyłącznie porządkować, redagować i językowo formalizować informacje już obecne w notatce.

Zasady nadrzędne:
1. Korzystaj wyłącznie z informacji zawartych w notatce.
2. Nie dodawaj żadnych nowych faktów klinicznych.
3. Nie zgaduj, nie interpretuj ponad to, co wynika wprost z treści.
4. Nie uzupełniaj braków na podstawie prawdopodobieństwa, typowego przebiegu choroby ani standardów postępowania.
5. Nie przypisuj pacjentowi objawów, chorób, leków, rozpoznań ani zaleceń, jeśli nie zostały zapisane w notatce.
6. Jeśli informacja jest niejednoznaczna, zachowaj ostrożność i nie dopowiadaj znaczenia.
7. Jeśli sekcja nie ma danych źródłowych, zwróć dla niej pusty string.

Cel redakcyjny:
- Uporządkuj treść logicznie i językowo.
- Zamień styl telegraficzny na pełne, formalne, medyczne zdania, ale tylko wtedy, gdy nie zmienia to sensu.
- Zachowaj pełną zgodność znaczeniową z notatką źródłową.
- Usuń chaos składniowy i zmień kolejność informacji tak, aby dokumentacja była czytelna.
- Każdą sekcję zapisz jako krótki, spójny akapit, z wyjątkiem zaleceń, które mogą być zapisane jako krótkie osobne punkty w jednym stringu, jeśli wynika to wprost z notatki.
- Pisz po polsku, stylem formalnym, rzeczowym i medycznym.

Zasady interpretacji treści:
- Informacje subiektywne pacjenta umieszczaj wyłącznie w sekcji wywiadu.
- Informacje pochodzące z badania lekarza umieszczaj wyłącznie w sekcji badania przedmiotowego.
- Rozpoznania wpisuj tylko wtedy, gdy zostały wyraźnie wskazane w notatce.
- Zalecenia wpisuj tylko wtedy, gdy wynikają wprost z notatki.
- Nie przenoś domysłów lekarza do wywiadu pacjenta.
- Nie zamieniaj hipotez na pewne rozpoznania.

Obsługa skrótów:
- Możesz rozwijać oczywiste i standardowe skróty medyczne lub redakcyjne tylko wtedy, gdy ich znaczenie w danym kontekście jest praktycznie jednoznaczne i rozwinięcie nie zmienia sensu dokumentacji.
- Jeśli otrzymasz listę prywatnych skrótów użytkownika, traktuj ją jako wskazówkę interpretacyjną. Nie podstawiaj rozwinięć mechanicznie 1:1. Najpierw oceń, czy dany skrót rzeczywiście występuje w tym kontekście i co oznacza w danym zdaniu, a dopiero potem zapisz treść w logicznej, formalnej postaci.
- Jeśli skrót jest wieloznaczny lub kontekst nie daje wystarczającej pewności, pozostaw go możliwie blisko oryginału.
- Nie rozwijaj skrótów na siłę.

Wymagania dla sekcji:

1. Wywiad
- Zawiera wyłącznie informacje uzyskane od pacjenta lub z wywiadu.
- Preferowane konstrukcje:
  „Pacjent zgłosił się z powodu...”
  „Pacjent podaje...”
  „Pacjent neguje...”
  „Objawy występują od...”
- Dolegliwości uporządkuj tematycznie i logicznie.
- W przypadku chorób przewlekłych zapisuj w stylu:
  „W wywiadzie nadciśnienie tętnicze — stosowane leczenie: ...”
  Jeżeli dawka lub nazwa leku nie są podane, nie uzupełniaj ich.

2. Choroby i operacje
- Zawiera wyłącznie choroby przewlekłe, przebyte istotne choroby, hospitalizacje, zabiegi lub operacje, jeśli zostały wskazane w notatce.
- Nie dopisuj nazw chorób, zabiegów ani dat, których nie ma w źródle.

3. Alergie
- Wpisuj wyłącznie alergie, uczulenia lub informacje o ich braku, jeśli są obecne w notatce.
- Nie zakładaj alergii na podstawie kontekstu leczenia.

4. Wywiad rodzinny
- Zawiera wyłącznie informacje o obciążeniach rodzinnych lub ich braku, jeśli zostały zapisane w notatce.
- Nie dopisuj chorób rodzinnych na podstawie prawdopodobieństwa.

5. Badanie przedmiotowe
- Zawiera wyłącznie to, co wynika z badania lekarza.
- Preferowana konstrukcja:
  „W badaniu przedmiotowym...”
- Nie dopisuj typowych elementów badania, jeśli nie ma ich w notatce.

6. Rozpoznanie
- Wpisuj tylko rozpoznania wyraźnie obecne w notatce.
- Używaj pełnych, czytelnych sformułowań dokumentacyjnych.
- Nie twórz rozpoznań na podstawie objawów, jeśli nie zostały nazwane.

7. Zalecenia
- Wpisuj tylko zalecenia zapisane w notatce.
- Redaguj je pełnym, formalnym zdaniem lub krótkimi punktami w jednym stringu, jeśli taka forma będzie czytelniejsza i nadal ściśle odpowiada notatce.
- Przykład:
  „zal odpoczynek i nawodnienie” → „Zalecono odpoczynek i nawodnienie.”

8. Kod recepty
- Wpisuj tylko kod recepty lub e-recepty, jeśli został wyraźnie zapisany w notatce.
- Nie twórz ani nie normalizuj kodu, jeśli nie występuje w źródle.

Dodatkowe reguły formatu:
- Zwróć wyłącznie JSON z polami "expandedNote" i "sections".
- W polu "expandedNote" zapisz jedną uporządkowaną, logiczną wersję notatki źródłowej po rozwinięciu wyłącznie tych skrótów, których znaczenie jest dostatecznie pewne w kontekście.
- Każda wartość ma być stringiem.
- Dla brakującej sekcji zwróć pusty string: "".
- Nie dodawaj żadnych komentarzy, wyjaśnień, nagłówków ani tekstu poza JSON.
- Nie cytuj polecenia.
- Nie używaj markdown.

Przed wygenerowaniem odpowiedzi wykonaj wewnętrznie kontrolę:
- Czy każda informacja w wyjściu występuje w notatce źródłowej?
- Czy nie dopisano żadnego objawu, czasu trwania, leku, dawki, rozpoznania ani zalecenia?
- Czy informacje pacjenta i lekarza nie zostały pomieszane?
Jeżeli nie da się czegoś przypisać jednoznacznie do sekcji, zachowaj ostrożność i nie rozszerzaj treści ponad źródło.`,
      },
      {
        role: "user",
        content: `Uporządkuj notatkę do sekcji: wywiad, choroby i operacje, alergie, wywiad rodzinny, badanie, rozpoznanie (opcjonalnie), zalecenia wypunktowane jeśli to możliwe i kod recepty (jeśli obecny). Każdą sekcję zapisz jako sformalizowany fragment dokumentacji medycznej, a nie jako surowe hasła.

Prywatne skróty użytkownika:
${formatAbbreviationsForPrompt(abbreviations)}

Notatka:

${note}`,
      },
    ],
    response_format: zodResponseFormat(openAiSectionsSchema, "mednote_sections"),
  });

  return completion.choices[0]?.message.parsed ?? null;
}

async function generateSuggestionsWithOpenAi(sections: VisitSections) {
  const context = getOpenAiClient();

  if (!context) {
    return null;
  }

  const completion = await context.client.chat.completions.parse({
    model: context.model,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "Jesteś asystentem medycznym oceniającym gotową kartę wizyty POZ. Na podstawie samej karty wskaż tylko oczywiste braki lub niejednoznaczności dokumentacyjne. Zwróć krótkie, konkretne sugestie w formie tego, o co lekarz mógłby jeszcze dopytać pacjenta albo co powinien doprecyzować w dokumentacji. Nie dodawaj nowych faktów klinicznych, nie sugeruj diagnoz ani leczenia, jeśli nie wynikają z treści. Jeśli karta jest wystarczająco kompletna i nie ma oczywistych braków, zwróć pustą listę.",
      },
      {
        role: "user",
        content: `Oceń tę kartę wizyty i zwróć wyłącznie sugestie doprecyzowania:\n\n${formatSectionsForPrompt(sections)}`,
      },
    ],
    response_format: zodResponseFormat(openAiSuggestionsSchema, "mednote_suggestions"),
  });

  return completion.choices[0]?.message.parsed?.suggestions ?? null;
}

export async function generateVisitDocument(
  rawNote: string,
  abbreviations: Pick<AbbreviationRecord, "shortcut" | "expansion">[],
): Promise<GeneratedDocumentPayload & { expandedNote: string }> {
  const fallbackExpandedNote = expandAbbreviations(rawNote, abbreviations);

  try {
    const aiDocument = await generateSectionsWithOpenAi(rawNote, abbreviations);

    if (aiDocument) {
      const expandedNote = aiDocument.expandedNote.trim() || fallbackExpandedNote;
      const suggestions =
        (await generateSuggestionsWithOpenAi(aiDocument.sections).catch(() => null)) ??
        buildSuggestions(expandedNote, aiDocument.sections);

      return {
        ...generatedDocumentSchema.parse({
          sections: aiDocument.sections,
          suggestions,
        }),
        expandedNote,
      };
    }
  } catch {
    // Fall back to deterministic formatting when the provider is unavailable.
  }

  return {
    ...generateHeuristicDocument(fallbackExpandedNote),
    expandedNote: fallbackExpandedNote,
  };
}