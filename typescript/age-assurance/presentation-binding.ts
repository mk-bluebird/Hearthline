// SPDX-License-Identifier: MIT OR Apache-2.0

export type VerifiedThresholdResult = Readonly<{
  thresholdYears: number;
  thresholdSatisfied: boolean;
  audience: string;
  challengeRef: string;
  holderBindingRef: string;
  issuedAt: number;
  expiresAt: number;
}>;

export type PresentationContext = Readonly<{
  thresholdYears: number;
  audience: string;
  challengeRef: string;
  holderBindingRef: string;
  now: number;
}>;

export function presentationMatches(
  result: VerifiedThresholdResult,
  context: PresentationContext,
): boolean {
  for (const value of [
    result.thresholdYears,
    context.thresholdYears,
  ]) {
    if (!Number.isSafeInteger(value) || value < 18) {
      throw new TypeError("Invalid threshold");
    }
  }

  for (const value of [
    result.audience,
    result.challengeRef,
    result.holderBindingRef,
    context.audience,
    context.challengeRef,
    context.holderBindingRef,
  ]) {
    if (typeof value !== "string" || !value.trim()) {
      throw new TypeError("Invalid presentation reference");
    }
  }

  if (
    typeof result.thresholdSatisfied !== "boolean" ||
    !Number.isSafeInteger(result.issuedAt) ||
    !Number.isSafeInteger(result.expiresAt) ||
    !Number.isSafeInteger(context.now) ||
    result.issuedAt < 0 ||
    context.now < 0 ||
    result.expiresAt <= result.issuedAt
  ) {
    throw new TypeError("Invalid presentation validity");
  }

  return result.thresholdSatisfied &&
    result.thresholdYears === context.thresholdYears &&
    result.audience === context.audience &&
    result.challengeRef === context.challengeRef &&
    result.holderBindingRef === context.holderBindingRef &&
    context.now >= result.issuedAt &&
    context.now < result.expiresAt;
}
