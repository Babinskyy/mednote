"use client";

import { Fragment } from "react";

import { splitTextByPesels, truncatePeselTextSegments } from "@/lib/pesel";

type MaskedPeselTextProps = {
  text: string;
  maxLength?: number;
};

export function MaskedPeselText({ text, maxLength }: MaskedPeselTextProps) {
  const segmentedText = splitTextByPesels(text);
  const { segments, truncated } =
    typeof maxLength === "number"
      ? truncatePeselTextSegments(segmentedText, maxLength)
      : { segments: segmentedText, truncated: false };

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <Fragment key={`text-${index}`}>{segment.value}</Fragment>;
        }

        return (
          <span className="inline" key={`pesel-${index}`}>
            {segment.maskedVisible}
            <span className="select-text blur-[6px]">{segment.maskedHidden}</span>
          </span>
        );
      })}
      {truncated ? "..." : null}
    </>
  );
}