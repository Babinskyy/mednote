import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getOpenAIRealtimeConfig } from "@/lib/env";

export const runtime = "nodejs";

function hashSafetyIdentifier(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function buildRealtimeTranscriptionSession(model: string) {
  return {
    type: "transcription",
    audio: {
      input: {
        transcription: {
          model,
          language: "pl",
          delay: "low",
        },
        turn_detection: null,
      },
    },
  };
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const config = getOpenAIRealtimeConfig();

  if (!config) {
    return new NextResponse("Missing OpenAI configuration", { status: 500 });
  }

  const offerSdp = await request.text();

  if (!offerSdp.trim()) {
    return new NextResponse("Missing SDP offer", { status: 400 });
  }

  const formData = new FormData();
  formData.set("sdp", offerSdp);
  formData.set("session", JSON.stringify(buildRealtimeTranscriptionSession(config.model)));

  const response = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "OpenAI-Safety-Identifier": hashSafetyIdentifier(user.id),
    },
    body: formData,
  });

  const responseText = await response.text();

  if (!response.ok) {
    return new NextResponse(responseText || "Realtime session failed", {
      status: response.status,
    });
  }

  return new NextResponse(responseText, {
    headers: {
      "Content-Type": "application/sdp",
    },
  });
}
