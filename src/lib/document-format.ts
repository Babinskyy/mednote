import type { VisitSections } from "@/lib/types";

const labels: Record<keyof VisitSections, string> = {
  interview: "Wywiad",
  examination: "Badanie",
  diagnosis: "Rozpoznanie",
  recommendations: "Zalecenia",
};

export function formatSectionValue(value: string) {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : "brak danych";
}

export function formatDocumentForClipboard(sections: VisitSections) {
  return (Object.keys(labels) as Array<keyof VisitSections>)
    .map((key) => `${labels[key]}:\n${formatSectionValue(sections[key])}`)
    .join("\n\n");
}