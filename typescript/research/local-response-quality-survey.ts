// SPDX-License-Identifier: MIT OR Apache-2.0

export const QUALITY_QUESTIONS = [
  "choices_clear",
  "pace_control_available",
  "participation_without_pressure",
] as const;

export type QualityQuestion =
  (typeof QUALITY_QUESTIONS)[number];

export type VoluntaryAnswer = "yes" | "no";

export type PrivateResponse = Readonly<{
  protocolRef: string;
  question: QualityQuestion;
  randomizedYes: boolean;
}>;

export type AggregateResponseEstimate = Readonly<{
  status: "reported" | "insufficient_responses";
  responseCount: number;
  estimatedYesFraction?: number;
  rawDebiasedEstimate?: number;
  perResponseEpsilon: number;
  interpretation: "voluntary_response_estimate_not_wellness_score";
}>;

export const PER_RESPONSE_EPSILON = Math.log(3);

const QUESTIONS = new Set<string>(QUALITY_QUESTIONS);

function reference(value: string): void {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("Nonempty protocol reference required");
  }
}

function secureQuarterDraw(): 0 | 1 | 2 | 3 {
  const bytes = new Uint8Array(1);
  globalThis.crypto.getRandomValues(bytes);

  // Four equally sized classes across all 256 byte values.
  return (bytes[0] & 3) as 0 | 1 | 2 | 3;
}

export function randomizeVoluntaryAnswer(
  protocolRef: string,
  question: QualityQuestion,
  answer: VoluntaryAnswer,
): PrivateResponse {
  reference(protocolRef);

  if (
    !QUESTIONS.has(question) ||
    (answer !== "yes" && answer !== "no")
  ) {
    throw new TypeError("Unsupported question or answer");
  }

  const truthful = secureQuarterDraw() !== 3;
  const actualYes = answer === "yes";

  return Object.freeze({
    protocolRef,
    question,
    randomizedYes: truthful ? actualYes : !actualYes,
  });
}

export function estimateVoluntaryYesFraction(
  responses: readonly PrivateResponse[],
  protocolRef: string,
  question: QualityQuestion,
  minimumResponses: number,
): AggregateResponseEstimate {
  reference(protocolRef);

  if (
    !QUESTIONS.has(question) ||
    !Number.isSafeInteger(minimumResponses) ||
    minimumResponses <= 0
  ) {
    throw new TypeError("Invalid aggregation policy");
  }

  let randomizedYesCount = 0;

  for (const response of responses) {
    if (
      response.protocolRef !== protocolRef ||
      response.question !== question ||
      typeof response.randomizedYes !== "boolean"
    ) {
      throw new TypeError("Response does not match this release");
    }

    if (response.randomizedYes) randomizedYesCount += 1;
  }

  const base = {
    responseCount: responses.length,
    perResponseEpsilon: PER_RESPONSE_EPSILON,
    interpretation:
      "voluntary_response_estimate_not_wellness_score" as const,
  };

  if (responses.length < minimumResponses) {
    return Object.freeze({
      ...base,
      status: "insufficient_responses",
    });
  }

  // E[randomizedYes] = 1/4 + (1/2) * originalYesFraction.
  const reportedFraction = randomizedYesCount / responses.length;
  const rawDebiasedEstimate = 2 * reportedFraction - 0.5;

  return Object.freeze({
    ...base,
    status: "reported",
    rawDebiasedEstimate,
    estimatedYesFraction: Math.max(
      0,
      Math.min(1, rawDebiasedEstimate),
    ),
  });
}
