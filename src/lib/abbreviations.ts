import type { AbbreviationRecord } from "@/lib/types";

const shortcutBoundaryPattern = String.raw`[\p{L}\p{N}_/\-]`;

function escapeForRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildShortcutPattern(shortcut: string) {
  const escapedShortcut = escapeForRegex(shortcut.trim()).replace(/\s+/g, String.raw`\s+`);

  return new RegExp(
    `(?<!${shortcutBoundaryPattern})${escapedShortcut}(?!${shortcutBoundaryPattern})`,
    "gu",
  );
}

export function expandAbbreviations(note: string, abbreviations: Pick<AbbreviationRecord, "shortcut" | "expansion">[]) {
  if (!abbreviations.length) {
    return note;
  }

  return [...abbreviations]
    .map(({ shortcut, expansion }) => ({
      shortcut: shortcut.trim(),
      expansion: expansion.trim(),
    }))
    .filter(({ shortcut, expansion }) => Boolean(shortcut) && Boolean(expansion))
    .sort((left, right) => right.shortcut.length - left.shortcut.length)
    .reduce((expandedNote, { shortcut, expansion }) => {
      return expandedNote.replace(buildShortcutPattern(shortcut), expansion);
    }, note);
}