// SPDX-License-Identifier: MIT OR Apache-2.0

export type PredicateTruth = "satisfied" | "unsatisfied" | "unknown";

export type PrivacyLevel =
  | "selective_disclosure"
  | "cross_verifier_unlinkability";

export type EvidenceProfile = Readonly<{
  profileRef: string;
  configurationRef: string;
  reviewExpiresAt: number;
  supportedThresholds: readonly number[];
  maximumStatusAgeMs: number;
  acceptedPrivacyLevel: PrivacyLevel;
  privacyAssessmentRef: string;
  prohibitedStableIdentifiersAbsent: boolean;
}>;

export type AgeClaim = Readonly<{
  minimumCompletedYears: number;
  satisfied: boolean;
}>;

export type VerifiedPresentation = Readonly<{
  evidenceProfileRef: string;
  audience: string;
  challengeRef: string;
  holderBindingRef: string;
  evaluationContextRef: string;
  validFrom: number;
  validUntil: number;
  status: "valid" | "revoked" | "unknown";
  statusCheckedAt: number;
  claims: readonly AgeClaim[];
}>;

export type AgeRequirement = Readonly<{
  requirementRef: string;
  minimumCompletedYears: number;
  acceptedEvidenceProfileRefs: readonly string[];
}>;

export type AdmissionPolicy = Readonly<{
  policyRef: string;
  configurationRef: string;
  reviewExpiresAt: number;
  jurisdictionResolution: "resolved" | "unresolved";
  requiredPrivacyLevel: PrivacyLevel;
  requirements: readonly AgeRequirement[];
}>;

export type EvaluationContext = Readonly<{
  audience: string;
  challengeRef: string;
  holderBindingRef: string;
  evaluationContextRef: string;
  now: number;
}>;

export type AdmissionDecision = Readonly<{
  outcome: "admit" | "deny" | "more_evidence" | "review_required";
  policyRef: string;
  requirements: readonly Readonly<{
    requirementRef: string;
    truth: PredicateTruth;
  }>[];
}>;

const PRIVACY_LEVELS = new Set<string>([
  "selective_disclosure",
  "cross_verifier_unlinkability",
]);

function ref(value: string): void {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("Nonempty reference required");
  }
}

function time(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("Invalid timestamp");
  }
}

function threshold(value: number): void {
  if (!Number.isSafeInteger(value) || value < 18) {
    throw new TypeError("Invalid adult threshold");
  }
}

function uniqueReferences(values: readonly string[]): void {
  values.forEach(ref);
  if (new Set(values).size !== values.length) {
    throw new TypeError("Duplicate reference");
  }
}

function supportsPrivacy(
  offered: PrivacyLevel,
  required: PrivacyLevel,
): boolean {
  return required === "selective_disclosure" ||
    offered === "cross_verifier_unlinkability";
}

export function evaluateAdmission(
  policy: AdmissionPolicy,
  profiles: readonly EvidenceProfile[],
  presentations: readonly VerifiedPresentation[],
  context: EvaluationContext,
): AdmissionDecision {
  ref(policy.policyRef);
  ref(policy.configurationRef);
  time(policy.reviewExpiresAt);
  time(context.now);

  for (const value of [
    context.audience,
    context.challengeRef,
    context.holderBindingRef,
    context.evaluationContextRef,
  ]) ref(value);

  if (
    !PRIVACY_LEVELS.has(policy.requiredPrivacyLevel) ||
    !["resolved", "unresolved"].includes(policy.jurisdictionResolution) ||
    policy.requirements.length === 0
  ) {
    throw new TypeError("Invalid admission policy");
  }

  const requirementRefs = new Set<string>();
  for (const requirement of policy.requirements) {
    ref(requirement.requirementRef);
    threshold(requirement.minimumCompletedYears);
    uniqueReferences(requirement.acceptedEvidenceProfileRefs);

    if (
      requirement.acceptedEvidenceProfileRefs.length === 0 ||
      requirementRefs.has(requirement.requirementRef)
    ) {
      throw new TypeError("Invalid or duplicate requirement");
    }
    requirementRefs.add(requirement.requirementRef);
  }

  const profileMap = new Map<string, EvidenceProfile>();
  for (const profile of profiles) {
    ref(profile.profileRef);
    ref(profile.configurationRef);
    ref(profile.privacyAssessmentRef);
    time(profile.reviewExpiresAt);

    if (
      profileMap.has(profile.profileRef) ||
      !Number.isSafeInteger(profile.maximumStatusAgeMs) ||
      profile.maximumStatusAgeMs < 0 ||
      !PRIVACY_LEVELS.has(profile.acceptedPrivacyLevel) ||
      typeof profile.prohibitedStableIdentifiersAbsent !== "boolean" ||
      profile.supportedThresholds.length === 0
    ) {
      throw new TypeError("Invalid evidence profile");
    }

    profile.supportedThresholds.forEach(threshold);
    if (
      new Set(profile.supportedThresholds).size !==
      profile.supportedThresholds.length
    ) {
      throw new TypeError("Duplicate supported threshold");
    }

    profileMap.set(profile.profileRef, profile);
  }

  const makeDecision = (
    outcome: AdmissionDecision["outcome"],
    results: AdmissionDecision["requirements"],
  ): AdmissionDecision => Object.freeze({
    outcome,
    policyRef: policy.policyRef,
    requirements: Object.freeze([...results]),
  });

  if (
    policy.jurisdictionResolution !== "resolved" ||
    context.now >= policy.reviewExpiresAt
  ) {
    return makeDecision("review_required", []);
  }

  for (const requirement of policy.requirements) {
    if (
      requirement.acceptedEvidenceProfileRefs.some(
        (profileRef) => !profileMap.has(profileRef),
      )
    ) {
      return makeDecision("review_required", []);
    }
  }

  const usable: VerifiedPresentation[] = [];

  for (const presentation of presentations) {
    for (const value of [
      presentation.evidenceProfileRef,
      presentation.audience,
      presentation.challengeRef,
      presentation.holderBindingRef,
      presentation.evaluationContextRef,
    ]) ref(value);

    time(presentation.validFrom);
    time(presentation.validUntil);
    time(presentation.statusCheckedAt);

    if (
      presentation.validUntil <= presentation.validFrom ||
      !["valid", "revoked", "unknown"].includes(presentation.status)
    ) {
      throw new TypeError("Invalid presentation");
    }

    const seenThresholds = new Set<number>();
    for (const claim of presentation.claims) {
      threshold(claim.minimumCompletedYears);
      if (
        typeof claim.satisfied !== "boolean" ||
        seenThresholds.has(claim.minimumCompletedYears)
      ) {
        throw new TypeError("Invalid or duplicate age claim");
      }
      seenThresholds.add(claim.minimumCompletedYears);
    }

    const profile = profileMap.get(presentation.evidenceProfileRef);
    if (!profile) continue;

    const bound =
      presentation.audience === context.audience &&
      presentation.challengeRef === context.challengeRef &&
      presentation.holderBindingRef === context.holderBindingRef &&
      presentation.evaluationContextRef === context.evaluationContextRef;

    const current =
      context.now >= presentation.validFrom &&
      context.now < presentation.validUntil &&
      presentation.statusCheckedAt <= context.now &&
      context.now - presentation.statusCheckedAt <=
        profile.maximumStatusAgeMs;

    const reviewed =
      profile.configurationRef === policy.configurationRef &&
      context.now < profile.reviewExpiresAt &&
      profile.prohibitedStableIdentifiersAbsent &&
      supportsPrivacy(
        profile.acceptedPrivacyLevel,
        policy.requiredPrivacyLevel,
      );

    const supported = presentation.claims.every(
      (claim) => profile.supportedThresholds.includes(
        claim.minimumCompletedYears,
      ),
    );

    if (
      bound &&
      current &&
      reviewed &&
      supported &&
      presentation.status === "valid"
    ) {
      usable.push(presentation);
    }
  }

  // Only evidence relevant to at least one requirement participates
  // in contradiction detection.
  const relevantProfileRefs = new Set(
    policy.requirements.flatMap(
      (requirement) => requirement.acceptedEvidenceProfileRefs,
    ),
  );

  const relevantClaims = usable
    .filter((presentation) =>
      relevantProfileRefs.has(presentation.evidenceProfileRef))
    .flatMap((presentation) => presentation.claims);

  const positive = relevantClaims.filter((claim) => claim.satisfied);
  const negative = relevantClaims.filter((claim) => !claim.satisfied);

  const contradictory = positive.some((yes) =>
    negative.some((no) =>
      yes.minimumCompletedYears >= no.minimumCompletedYears));

  if (contradictory) {
    return makeDecision("review_required", []);
  }

  const results = policy.requirements.map((requirement) => {
    const accepted = new Set(
      requirement.acceptedEvidenceProfileRefs,
    );

    const claims = usable
      .filter((presentation) =>
        accepted.has(presentation.evidenceProfileRef))
      .flatMap((presentation) => presentation.claims);

    const established = claims.some(
      (claim) =>
        claim.satisfied &&
        claim.minimumCompletedYears >=
          requirement.minimumCompletedYears,
    );

    const refuted = claims.some(
      (claim) =>
        !claim.satisfied &&
        claim.minimumCompletedYears <=
          requirement.minimumCompletedYears,
    );

    const truth: PredicateTruth = established
      ? "satisfied"
      : refuted
        ? "unsatisfied"
        : "unknown";

    return Object.freeze({
      requirementRef: requirement.requirementRef,
      truth,
    });
  });

  if (results.some((result) => result.truth === "unsatisfied")) {
    return makeDecision("deny", results);
  }
  if (results.some((result) => result.truth === "unknown")) {
    return makeDecision("more_evidence", results);
  }

  return makeDecision("admit", results);
}
