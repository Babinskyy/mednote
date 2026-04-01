import { describe, expect, it } from "vitest";

import {
  appendConversationHistory,
  buildInitialConversationHistory,
  getConversationHistoryFromUnknown,
} from "@/lib/note-history";

describe("note history", () => {
  it("creates the first message as the main note entry", () => {
    const history = buildInitialConversationHistory(
      "Pacjent zgłasza suchy kaszel od 3 dni.",
      "2026-04-01T08:00:00.000Z",
    );

    expect(history).toEqual([
      {
        kind: "initial",
        content: "Pacjent zgłasza suchy kaszel od 3 dni.",
        created_at: "2026-04-01T08:00:00.000Z",
      },
    ]);
  });

  it("stores later user messages as appended information", () => {
    const history = appendConversationHistory(
      buildInitialConversationHistory(
        "Pacjent zgłasza suchy kaszel od 3 dni.",
        "2026-04-01T08:00:00.000Z",
      ),
      "Dziś dołączyła gorączka 38,5.",
      "2026-04-01T09:15:00.000Z",
    );

    expect(history).toEqual([
      {
        kind: "initial",
        content: "Pacjent zgłasza suchy kaszel od 3 dni.",
        created_at: "2026-04-01T08:00:00.000Z",
      },
      {
        kind: "append",
        content: "Dziś dołączyła gorączka 38,5.",
        created_at: "2026-04-01T09:15:00.000Z",
      },
    ]);
  });

  it("falls back to the raw note for older records without stored history", () => {
    const history = getConversationHistoryFromUnknown(
      [],
      "Pacjent zgłasza suchy kaszel od 3 dni.",
      "2026-04-01T08:00:00.000Z",
    );

    expect(history).toEqual([
      {
        kind: "initial",
        content: "Pacjent zgłasza suchy kaszel od 3 dni.",
        created_at: "2026-04-01T08:00:00.000Z",
      },
    ]);
  });
});