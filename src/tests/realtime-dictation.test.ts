import { describe, expect, it } from "vitest";

import {
  appendDictationText,
  formatRecordingDuration,
} from "@/components/forms/use-realtime-dictation";

describe("realtime dictation helpers", () => {
  it("appends transcripts with a single separator", () => {
    expect(appendDictationText("", " Pacjent kaszle ")).toBe("Pacjent kaszle");
    expect(appendDictationText("Pacjent kaszle", "od 3 dni")).toBe(
      "Pacjent kaszle od 3 dni",
    );
    expect(appendDictationText("Pacjent kaszle ", "od 3 dni")).toBe(
      "Pacjent kaszle od 3 dni",
    );
  });

  it("formats recording duration as mm:ss", () => {
    expect(formatRecordingDuration(0)).toBe("00:00");
    expect(formatRecordingDuration(9)).toBe("00:09");
    expect(formatRecordingDuration(65)).toBe("01:05");
  });
});
