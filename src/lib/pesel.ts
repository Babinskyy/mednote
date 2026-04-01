import type { VisitSections } from "@/lib/types";

const peselCandidatePattern = /(?<!\d)(?:\d[\s-]?){10}\d(?!\d)/g;
const peselChecksumWeights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3] as const;
const peselTokenPrefix = "__PESEL_";

export type RecognizedPesel = {
  token: string;
  original: string;
  digits: string;
};

export type PeselTextSegment =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "pesel";
      value: string;
      maskedVisible: string;
      maskedHidden: string;
    };

function getPeselPattern() {
  return new RegExp(peselCandidatePattern.source, peselCandidatePattern.flags);
}

function normalizePeselCandidate(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidPesel(value: string) {
  const digits = normalizePeselCandidate(value);

  if (digits.length !== 11) {
    return false;
  }

  const checksumBase = digits
    .slice(0, 10)
    .split("")
    .reduce(
      (sum, digit, index) => sum + Number(digit) * peselChecksumWeights[index],
      0,
    );
  const checksum = (10 - (checksumBase % 10)) % 10;

  return checksum === Number(digits[10]);
}

export function replacePeselsWithTokens(text: string): {
  text: string;
  pesels: RecognizedPesel[];
} {
  let matchIndex = 0;
  const pesels: RecognizedPesel[] = [];

  const sanitizedText = text.replace(getPeselPattern(), (match) => {
    if (!isValidPesel(match)) {
      return match;
    }

    matchIndex += 1;

    const token = `${peselTokenPrefix}${matchIndex}__`;

    pesels.push({
      token,
      original: match,
      digits: normalizePeselCandidate(match),
    });

    return token;
  });

  return {
    text: sanitizedText,
    pesels,
  };
}

export function restorePeselsInText(text: string, pesels: RecognizedPesel[]) {
  return pesels.reduce(
    (result, pesel) => result.replaceAll(pesel.token, pesel.original),
    text,
  );
}

export function restorePeselsInStringList(values: string[], pesels: RecognizedPesel[]) {
  return values.map((value) => restorePeselsInText(value, pesels));
}

export function restorePeselsInSections(
  sections: VisitSections,
  pesels: RecognizedPesel[],
): VisitSections {
  return {
    interview: restorePeselsInText(sections.interview, pesels),
    conditionsAndOperations: restorePeselsInText(
      sections.conditionsAndOperations,
      pesels,
    ),
    allergies: restorePeselsInText(sections.allergies, pesels),
    familyHistory: restorePeselsInText(sections.familyHistory, pesels),
    examination: restorePeselsInText(sections.examination, pesels),
    diagnosis: restorePeselsInText(sections.diagnosis, pesels),
    recommendations: restorePeselsInText(sections.recommendations, pesels),
    prescriptionCode: restorePeselsInText(sections.prescriptionCode, pesels),
  };
}

export function maskPeselValue(value: string) {
  let digitCount = 0;
  let splitIndex = value.length;

  for (const [index, character] of Array.from(value).entries()) {
    if (!/\d/.test(character)) {
      continue;
    }

    digitCount += 1;

    if (digitCount === 6) {
      splitIndex = index + 1;
      break;
    }
  }

  return {
    maskedVisible: value.slice(0, splitIndex),
    maskedHidden: value.slice(splitIndex),
  };
}

export function splitTextByPesels(text: string): PeselTextSegment[] {
  const segments: PeselTextSegment[] = [];
  const pattern = getPeselPattern();
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const matchedValue = match[0];
    const startIndex = match.index;
    const endIndex = startIndex + matchedValue.length;

    if (startIndex > lastIndex) {
      segments.push({
        type: "text",
        value: text.slice(lastIndex, startIndex),
      });
    }

    if (isValidPesel(matchedValue)) {
      const { maskedVisible, maskedHidden } = maskPeselValue(matchedValue);

      segments.push({
        type: "pesel",
        value: matchedValue,
        maskedVisible,
        maskedHidden,
      });
    } else {
      segments.push({
        type: "text",
        value: matchedValue,
      });
    }

    lastIndex = endIndex;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: "text",
      value: text.slice(lastIndex),
    });
  }

  return segments.filter((segment) => segment.value.length > 0);
}

export function truncatePeselTextSegments(
  segments: PeselTextSegment[],
  maxLength: number,
) {
  if (maxLength < 1) {
    return {
      segments: [] as PeselTextSegment[],
      truncated: segments.length > 0,
    };
  }

  let remainingLength = maxLength;
  const truncatedSegments: PeselTextSegment[] = [];

  for (const segment of segments) {
    const segmentLength = segment.value.length;

    if (segmentLength <= remainingLength) {
      truncatedSegments.push(segment);
      remainingLength -= segmentLength;
      continue;
    }

    if (segment.type === "text" && remainingLength > 0) {
      truncatedSegments.push({
        type: "text",
        value: segment.value.slice(0, remainingLength),
      });
    }

    return {
      segments: truncatedSegments,
      truncated: true,
    };
  }

  return {
    segments: truncatedSegments,
    truncated: false,
  };
}