// SPDX-License-Identifier: MIT OR Apache-2.0

export type ReciprocalCondition =
  | "satisfied"
  | "not_satisfied"
  | "unknown"
  | "not_used";

export type CandidateContext = Readonly<{
  candidateRef: string;
  membershipEligible: boolean;
  disclosurePermitted: boolean;
  participationPermitted: boolean;
  reciprocalAgeCondition: ReciprocalCondition;
}>;

export function ageAffirmingPresentation(
  approvedOrder: readonly CandidateContext[],
  reciprocalFilteringApproved: boolean,
): readonly string[] {
  if (typeof reciprocalFilteringApproved !== "boolean") {
    throw new TypeError("Explicit discovery policy required");
  }

  const seen = new Set<string>();
  const visible: string[] = [];

  for (const candidate of approvedOrder) {
    if (
      typeof candidate.candidateRef !== "string" ||
      !candidate.candidateRef.trim() ||
      seen.has(candidate.candidateRef) ||
      typeof candidate.membershipEligible !== "boolean" ||
      typeof candidate.disclosurePermitted !== "boolean" ||
      typeof candidate.participationPermitted !== "boolean" ||
      ![
        "satisfied",
        "not_satisfied",
        "unknown",
        "not_used",
      ].includes(candidate.reciprocalAgeCondition)
    ) {
      throw new TypeError("Invalid candidate context");
    }
    seen.add(candidate.candidateRef);

    if (
      !reciprocalFilteringApproved &&
      candidate.reciprocalAgeCondition !== "not_used"
    ) {
      throw new Error("Age filtering is not approved in this context");
    }

    const conditionPermits = reciprocalFilteringApproved
      ? candidate.reciprocalAgeCondition === "satisfied" ||
        candidate.reciprocalAgeCondition === "not_used"
      : true;

    if (
      candidate.membershipEligible &&
      candidate.disclosurePermitted &&
      candidate.participationPermitted &&
      conditionPermits
    ) {
      visible.push(candidate.candidateRef);
    }
  }

  return Object.freeze(visible);
}

export type ReuseReview = Readonly<{
  routeRef: string;
  configurationRef: string;
  reviewExpiresAt: number;
  requiredThreshold: number;
  originalSourceValidated: boolean;
  originalMethodAccepted: boolean;
  originalEffectivenessAccepted: boolean;
  holderBindingValidated: boolean;
  presentationIntegrityValidated: boolean;
  statusCurrent: boolean;
}>;

export type ReusableResult = Readonly<{
  routeRef: string;
  configurationRef: string;
  thresholdYears: number;
  thresholdSatisfied: boolean;
  audienceBound: boolean;
  challengeBound: boolean;
  validUntil: number;
}>;

export function reusableEvidenceAccepted(
  review: ReuseReview,
  result: ReusableResult,
  now: number,
): boolean {
  for (const ref of [
    review.routeRef,
    review.configurationRef,
    result.routeRef,
    result.configurationRef,
  ]) {
    if (typeof ref !== "string" || !ref.trim()) {
      throw new TypeError("Nonempty route references required");
    }
  }

  for (const time of [
    review.reviewExpiresAt,
    result.validUntil,
    now,
  ]) {
    if (!Number.isSafeInteger(time) || time < 0) {
      throw new TypeError("Invalid validity time");
    }
  }

  for (const threshold of [
    review.requiredThreshold,
    result.thresholdYears,
  ]) {
    if (!Number.isSafeInteger(threshold) || threshold < 18) {
      throw new TypeError("Invalid adult threshold");
    }
  }

  const findings = [
    review.originalSourceValidated,
    review.originalMethodAccepted,
    review.originalEffectivenessAccepted,
    review.holderBindingValidated,
    review.presentationIntegrityValidated,
    review.statusCurrent,
    result.thresholdSatisfied,
    result.audienceBound,
    result.challengeBound,
  ];

  if (findings.some((value) => typeof value !== "boolean")) {
    throw new TypeError("Explicit verification findings required");
  }

  return findings.every((value) => value) &&
    review.routeRef === result.routeRef &&
    review.configurationRef === result.configurationRef &&
    result.thresholdYears >= review.requiredThreshold &&
    now < review.reviewExpiresAt &&
    now < result.validUntil;
}

export type HearthChatConfiguration = Readonly<{
  mode: "drafting" | "companion";
  memberInvoked: boolean;
  autonomousSocialActions: boolean;
  emotionalInference: boolean;
  adaptiveRelationshipSimulation: boolean;
  persistentIntimateMemory: boolean;
  parentalConsentAdmissionOverride: boolean;
}>;

export function hearthChatWithinCurrentScope(
  configuration: HearthChatConfiguration,
): boolean {
  if (
    configuration.mode !== "drafting" &&
    configuration.mode !== "companion"
  ) {
    throw new TypeError("Invalid HearthChat mode");
  }

  const flags = [
    configuration.memberInvoked,
    configuration.autonomousSocialActions,
    configuration.emotionalInference,
    configuration.adaptiveRelationshipSimulation,
    configuration.persistentIntimateMemory,
    configuration.parentalConsentAdmissionOverride,
  ];

  if (flags.some((value) => typeof value !== "boolean")) {
    throw new TypeError("Explicit functional configuration required");
  }

  return configuration.mode === "drafting" &&
    configuration.memberInvoked &&
    !configuration.autonomousSocialActions &&
    !configuration.emotionalInference &&
    !configuration.adaptiveRelationshipSimulation &&
    !configuration.persistentIntimateMemory &&
    !configuration.parentalConsentAdmissionOverride;
}
