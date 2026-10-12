// SPDX-License-Identifier: MIT OR Apache-2.0

export type PublishedAttitudeResult = Readonly<{
  sourceUrl: string;
  methodologyUrl: string;
  publishedDate: string;
  fieldworkStart: string;
  fieldworkEnd: string;
  geography: "Arizona" | "United States";
  minimumAge: number;
  maximumAge: number | null;
  sampleSize: number;
  populationRepresentative: boolean;
  construct:
    | "casual_sex_between_consenting_adults"
    | "premarital_sex"
    | "other";
  questionText: string;
  responseDefinition: string;
  estimatePercent: number;
  intervalPercent: readonly [number, number] | null;
}>;

export type CatalogDecision = Readonly<{
  status: "eligible_for_arizona_30_plus_review" | "context_only";
  reasons: readonly string[];
  result: PublishedAttitudeResult;
}>;

function requireHttps(value: string): void {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== ""
  ) {
    throw new TypeError("Expected an HTTPS source without credentials");
  }
}

function dateValue(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError("Expected YYYY-MM-DD");
  }
  const time = Date.parse(`${value}T00:00:00Z`);
  if (
    !Number.isFinite(time) ||
    new Date(time).toISOString().slice(0, 10) !== value
  ) {
    throw new TypeError("Invalid calendar date");
  }
  return time;
}

export function classifyPublishedResult(
  input: PublishedAttitudeResult,
): CatalogDecision {
  requireHttps(input.sourceUrl);
  requireHttps(input.methodologyUrl);

  const start = dateValue(input.fieldworkStart);
  const end = dateValue(input.fieldworkEnd);
  const published = dateValue(input.publishedDate);

  if (start > end || published < end) {
    throw new RangeError("Inconsistent research dates");
  }
  if (
    !Number.isSafeInteger(input.sampleSize) ||
    input.sampleSize <= 0
  ) {
    throw new RangeError("sampleSize must be positive");
  }
  if (
    !Number.isSafeInteger(input.minimumAge) ||
    input.minimumAge < 18 ||
    (
      input.maximumAge !== null &&
      (
        !Number.isSafeInteger(input.maximumAge) ||
        input.maximumAge < input.minimumAge
      )
    )
  ) {
    throw new RangeError("Invalid adult population age coverage");
  }
  if (
    !Number.isFinite(input.estimatePercent) ||
    input.estimatePercent < 0 ||
    input.estimatePercent > 100
  ) {
    throw new RangeError("Invalid percentage");
  }
  if (
    input.questionText.trim() === "" ||
    input.responseDefinition.trim() === ""
  ) {
    throw new TypeError("Question and response definition are required");
  }
  if (typeof input.populationRepresentative !== "boolean") {
    throw new TypeError("Representativeness declaration is required");
  }

  const interval = input.intervalPercent;
  if (interval !== null) {
    const [low, high] = interval;
    if (
      interval.length !== 2 ||
      !Number.isFinite(low) ||
      !Number.isFinite(high) ||
      low < 0 ||
      high > 100 ||
      low > input.estimatePercent ||
      high < input.estimatePercent
    ) {
      throw new RangeError("Invalid uncertainty interval");
    }
  }

  const reasons: string[] = [];
  if (input.geography !== "Arizona") {
    reasons.push("Not an Arizona population estimate");
  }
  if (input.minimumAge !== 30 || input.maximumAge !== null) {
    reasons.push("Does not cover the complete intended 30+ population");
  }
  if (!input.populationRepresentative) {
    reasons.push("Population representativeness is not established");
  }
  if (input.construct !== "casual_sex_between_consenting_adults") {
    reasons.push("Measures a different attitude construct");
  }
  if (interval === null) {
    reasons.push("No published uncertainty interval supplied");
  }

  const result: PublishedAttitudeResult = Object.freeze({
    sourceUrl: input.sourceUrl,
    methodologyUrl: input.methodologyUrl,
    publishedDate: input.publishedDate,
    fieldworkStart: input.fieldworkStart,
    fieldworkEnd: input.fieldworkEnd,
    geography: input.geography,
    minimumAge: input.minimumAge,
    maximumAge: input.maximumAge,
    sampleSize: input.sampleSize,
    populationRepresentative: input.populationRepresentative,
    construct: input.construct,
    questionText: input.questionText,
    responseDefinition: input.responseDefinition,
    estimatePercent: input.estimatePercent,
    intervalPercent: interval === null
      ? null
      : Object.freeze([interval[0], interval[1]] as [number, number]),
  });

  return Object.freeze({
    status: reasons.length === 0
      ? "eligible_for_arizona_30_plus_review"
      : "context_only",
    reasons: Object.freeze(reasons),
    result,
  });
}
