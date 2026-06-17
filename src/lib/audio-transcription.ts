import OpenAI from "openai";

import { getOpenAITranscriptionConfig } from "@/lib/env";

let openAiClient: OpenAI | null = null;

function getOpenAiClient() {
  const config = getOpenAITranscriptionConfig();

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

export async function transcribeAudioNote(file: File) {
  const context = getOpenAiClient();

  if (!context) {
    return null;
  }

  const transcription = await context.client.audio.transcriptions.create({
    file,
    model: context.model,
    language: "pl",
  });

  return transcription.text.trim();
}
