import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { expandAbbreviations } from "@/lib/abbreviations";
import { getOpenAIConfig } from "@/lib/env";
import { defaultUserPromptTemplates, promptTemplateTokens, renderPromptTemplate } from "@/lib/prompt-templates";
import type {
  AbbreviationRecord,
  GeneratedDocumentPayload,
  UserPromptTemplates,
  VisitSections,
} from "@/lib/types";
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
  promptTemplates: UserPromptTemplates,
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
        content: promptTemplates.sectionsSystemPrompt,
      },
      {
        role: "user",
        content: renderPromptTemplate(promptTemplates.sectionsUserPrompt, {
          [promptTemplateTokens.abbreviations]: formatAbbreviationsForPrompt(abbreviations),
          [promptTemplateTokens.note]: note,
        }),
      },
    ],
    response_format: zodResponseFormat(openAiSectionsSchema, "sections"),
  });

  return completion.choices[0]?.message.parsed ?? null;
}

async function generateSuggestionsWithOpenAi(
  sections: VisitSections,
  promptTemplates: UserPromptTemplates,
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
        content: promptTemplates.suggestionsSystemPrompt,
      },
      {
        role: "user",
        content: renderPromptTemplate(promptTemplates.suggestionsUserPrompt, {
          [promptTemplateTokens.sections]: formatSectionsForPrompt(sections),
        }),
      },
    ],
    response_format: zodResponseFormat(openAiSuggestionsSchema, "suggestions"),
  });

  return completion.choices[0]?.message.parsed?.suggestions ?? null;
}

export async function generateVisitDocument(
  rawNote: string,
  abbreviations: Pick<AbbreviationRecord, "shortcut" | "expansion">[],
  promptTemplates: UserPromptTemplates = defaultUserPromptTemplates,
): Promise<GeneratedDocumentPayload & { expandedNote: string }> {
  const fallbackExpandedNote = expandAbbreviations(rawNote, abbreviations);

  try {
    const aiDocument = await generateSectionsWithOpenAi(rawNote, abbreviations, promptTemplates);

    if (aiDocument) {
      const expandedNote = aiDocument.expandedNote.trim() || fallbackExpandedNote;
      const suggestions =
        (await generateSuggestionsWithOpenAi(aiDocument.sections, promptTemplates).catch(() => null)) ??
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