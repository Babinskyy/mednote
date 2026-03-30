import type { AbbreviationRecord } from "@/lib/types";

const tokenPattern = /^([^\p{L}\p{N}]*)((?:[\p{L}\p{N}][\p{L}\p{N}_/-]*))([^\p{L}\p{N}]*)$/u;

export function expandAbbreviations(note: string, abbreviations: Pick<AbbreviationRecord, "shortcut" | "expansion">[]) {
  if (!abbreviations.length) {
    return note;
  }

  const dictionary = new Map(
    abbreviations.map((entry) => [entry.shortcut, entry.expansion]),
  );

  return note
    .split(/(\s+)/)
    .map((chunk) => {
      if (!chunk.trim()) {
        return chunk;
      }

      const match = chunk.match(tokenPattern);

      if (!match) {
        return dictionary.get(chunk) ?? chunk;
      }

      const [, prefix, core, suffix] = match;
      const expansion = dictionary.get(core);

      if (!expansion) {
        return chunk;
      }

      return `${prefix}${expansion}${suffix}`;
    })
    .join("");
}