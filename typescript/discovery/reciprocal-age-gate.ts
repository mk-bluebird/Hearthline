// SPDX-License-Identifier: MIT OR Apache-2.0

export type ConditionResult = "satisfied" | "not_satisfied" | "unknown";

export type ReciprocalAgeEvidence = Readonly<{
  pairContextRef: string;
  discoveryPolicyRef: string;
  firstPreferenceRevision: number;
  secondPreferenceRevision: number;
  firstConditionOnSecond: ConditionResult;
  secondConditionOnFirst: ConditionResult;
  validUntil: number;
}>;

export type DiscoveryContext = Readonly<{
  pairContextRef: string;
  discoveryPolicyRef: string;
  firstPreferenceRevision: number;
  secondPreferenceRevision: number;
  bothMembershipEligible: boolean;
  bothDiscoveryPermissionsCurrent: boolean;
  neitherPausedOrBlocked: boolean;
  now: number;
}>;

export type AgeGateDecision =
  | "eligible_in_this_context"
  | "not_presentable";

const RESULTS = new Set<string>([
  "satisfied",
  "not_satisfied",
  "unknown",
]);

function reference(value: string): void {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError("Nonempty reference required");
  }
}

function revision(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("Invalid preference revision");
  }
}

export function reciprocalAgeGate(
  context: DiscoveryContext,
  evidence: ReciprocalAgeEvidence | null,
): AgeGateDecision {
  reference(context.pairContextRef);
  reference(context.discoveryPolicyRef);
  revision(context.firstPreferenceRevision);
  revision(context.secondPreferenceRevision);

  if (
    !Number.isSafeInteger(context.now) ||
    context.now < 0 ||
    typeof context.bothMembershipEligible !== "boolean" ||
    typeof context.bothDiscoveryPermissionsCurrent !== "boolean" ||
    typeof context.neitherPausedOrBlocked !== "boolean"
  ) {
    throw new TypeError("Invalid discovery context");
  }

  if (
    !context.bothMembershipEligible ||
    !context.bothDiscoveryPermissionsCurrent ||
    !context.neitherPausedOrBlocked ||
    evidence === null
  ) {
    return "not_presentable";
  }

  reference(evidence.pairContextRef);
  reference(evidence.discoveryPolicyRef);
  revision(evidence.firstPreferenceRevision);
  revision(evidence.secondPreferenceRevision);

  if (
    !RESULTS.has(evidence.firstConditionOnSecond) ||
    !RESULTS.has(evidence.secondConditionOnFirst) ||
    !Number.isSafeInteger(evidence.validUntil) ||
    evidence.validUntil < 0
  ) {
    throw new TypeError("Invalid reciprocal evidence");
  }

  const current =
    evidence.pairContextRef === context.pairContextRef &&
    evidence.discoveryPolicyRef === context.discoveryPolicyRef &&
    evidence.firstPreferenceRevision ===
      context.firstPreferenceRevision &&
    evidence.secondPreferenceRevision ===
      context.secondPreferenceRevision &&
    context.now < evidence.validUntil;

  return current &&
    evidence.firstConditionOnSecond === "satisfied" &&
    evidence.secondConditionOnFirst === "satisfied"
      ? "eligible_in_this_context"
      : "not_presentable";
}
