import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";

import { expandAbbreviations } from "@/lib/abbreviations";
import { getOpenAIConfig } from "@/lib/env";
import type { AbbreviationRecord, GeneratedDocumentPayload, VisitSections } from "@/lib/types";
import { dedupeStrings } from "@/lib/utils";
import { generatedDocumentSchema } from "@/lib/validation";

const openAiSchema = generatedDocumentSchema;

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

function buildSuggestions(note: string, sections: VisitSections) {
  const suggestions: string[] = [];
  const lowered = note.toLowerCase();

  if (!sections.examination.trim()) {
    suggestions.push("Brakuje jednoznacznego opisu badania przedmiotowego.");
  }

  if (!sections.diagnosis.trim()) {
    suggestions.push("Brakuje jednoznacznie zapisanego rozpoznania w treści notatki.");
  }

  if (!sections.recommendations.trim()) {
    suggestions.push("Brakuje zaleceń możliwych do przepisania do dokumentacji.");
  }

  if (!/uczul|alerg/i.test(lowered)) {
    suggestions.push("Rozważ doprecyzowanie informacji o uczuleniach, jeśli były istotne dla wizyty.");
  }

  if (!/rr|tętno|temp|sat|spo2/i.test(lowered)) {
    suggestions.push("Jeśli wykonano pomiary, wpisz parametry życiowe wprost do notatki.");
  }

  return dedupeStrings(suggestions).slice(0, 5);
}

function generateHeuristicDocument(note: string) {
  const sections: VisitSections = {
    interview: "",
    examination: "",
    diagnosis: "",
    recommendations: "",
  };

  for (const sentence of toSentences(note)) {
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

async function generateWithOpenAi(note: string) {
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
          "Jesteś asystentem do porządkowania notatek z wizyt POZ. Zwracaj wyłącznie informacje wynikające z notatki lekarza. Nie dodawaj nowych faktów klinicznych, nie zgaduj, nie uzupełniaj braków. Możesz rozwijać oczywiste, standardowe skróty medyczne lub redakcyjne nawet wtedy, gdy nie zostały wcześniej rozwinięte w prywatnym słowniku, ale tylko wtedy, gdy ich znaczenie w danym kontekście jest praktycznie jednoznaczne i nie zmienia sensu dokumentacji. Przykład: \"zal odpoczynek i nawodnienie\" zapisz jako pełne zalecenie bez skrótu. Jeśli skrót może mieć kilka sensownych znaczeń albo kontekst nie rozstrzyga go wystarczająco pewnie, zachowaj możliwie oryginalne brzmienie. Zwróć pusty string dla brakującej sekcji. Sugestie mają dotyczyć tylko braków formalnych lub danych, które warto doprecyzować, bez dopisywania treści medycznej.",
      },
      {
        role: "user",
        content: `Uporządkuj notatkę do sekcji: wywiad, badanie, rozpoznanie, zalecenia. Notatka:\n\n${note}`,
      },
    ],
    response_format: zodResponseFormat(openAiSchema, "mednote_document"),
  });

  return completion.choices[0]?.message.parsed ?? null;
}

export async function generateVisitDocument(
  rawNote: string,
  abbreviations: Pick<AbbreviationRecord, "shortcut" | "expansion">[],
): Promise<GeneratedDocumentPayload & { expandedNote: string }> {
  const expandedNote = expandAbbreviations(rawNote, abbreviations);

  try {
    const aiDocument = await generateWithOpenAi(expandedNote);

    if (aiDocument) {
      return {
        ...generatedDocumentSchema.parse(aiDocument),
        expandedNote,
      };
    }
  } catch {
    // Fall back to deterministic formatting when the provider is unavailable.
  }

  return {
    ...generateHeuristicDocument(expandedNote),
    expandedNote,
  };
}