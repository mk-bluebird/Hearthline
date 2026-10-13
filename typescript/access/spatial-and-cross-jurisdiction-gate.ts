// SPDX-License-Identifier: MIT OR Apache-2.0

export type Feature = "core_connection" | "optional_xr";

export type AgeRequirement = Readonly<{
  ruleRef: string;
  minimumCompletedYears: number;
  acceptedEvidenceProfileRefs: readonly string[];
}>;

export type ReviewedContext = Readonly<{
  policyRef: string;
  configurationRef: string;
  contextRevision: number;
  applicabilityResolved: boolean;
  reviewExpiresAt: number;
  requirements: readonly AgeRequirement[];
  xrConfigurationApproved: boolean;
}>;

export type CurrentAgeEvidence = Readonly<{
  evidenceProfileRef: string;
  holderBindingRef: string;
  minimumCompletedYears: number;
  thresholdSatisfied: boolean;
  status: "valid" | "revoked" | "unknown";
  validUntil: number;
}>;

export type CurrentAccountAuthority = Readonly<{
  holderBindingRef: string;
  authorizationRevision: number;
  authenticationCurrent: boolean;
  participationPermitted: boolean;
  xrPermissionCurrent: boolean;
}>;

export type FeatureLease = Readonly<{
  feature: Feature;
  policyRef: string;
  configurationRef: string;
  contextRevision: number;
  authorizationRevision: number;
  expiresAt: number;
}>;

export type AccessDecision =
  | Readonly<{ outcome: "review_required" }>
  | Readonly<{ outcome: "evidence_required" }>
  | Readonly<{ outcome: "not_available" }>
  | Readonly<{ outcome: "authorized"; lease: FeatureLease }>;

function ref(value: string): void {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("Nonempty reference required");
  }
}

function integer(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("Nonnegative safe integer required");
  }
}

export function authorizeFeature(
  feature: Feature,
  context: ReviewedContext,
  account: CurrentAccountAuthority,
  evidence: readonly CurrentAgeEvidence[],
  now: number,
  maximumLeaseMs: number,
): AccessDecision {
  if (feature !== "core_connection" && feature !== "optional_xr") {
    throw new TypeError("Unsupported feature");
  }

  ref(context.policyRef);
  ref(context.configurationRef);
  ref(account.holderBindingRef);

  for (const value of [
    context.contextRevision,
    context.reviewExpiresAt,
    account.authorizationRevision,
    now,
    maximumLeaseMs,
  ]) integer(value);

  if (
    maximumLeaseMs <= 0 ||
    context.requirements.length === 0 ||
    !Number.isSafeInteger(now + maximumLeaseMs)
  ) {
    throw new TypeError("Invalid policy scope or lease lifetime");
  }

  for (const value of [
    context.applicabilityResolved,
    context.xrConfigurationApproved,
    account.authenticationCurrent,
    account.participationPermitted,
    account.xrPermissionCurrent,
  ]) {
    if (typeof value !== "boolean") {
      throw new TypeError("Explicit authority findings required");
    }
  }

  const rules = new Set<string>();
  for (const requirement of context.requirements) {
    ref(requirement.ruleRef);
    integer(requirement.minimumCompletedYears);
    requirement.acceptedEvidenceProfileRefs.forEach(ref);

    if (
      requirement.minimumCompletedYears < 18 ||
      requirement.acceptedEvidenceProfileRefs.length === 0 ||
      new Set(requirement.acceptedEvidenceProfileRefs).size !==
        requirement.acceptedEvidenceProfileRefs.length ||
      rules.has(requirement.ruleRef)
    ) {
      throw new TypeError("Invalid or duplicate age requirement");
    }
    rules.add(requirement.ruleRef);
  }

  for (const item of evidence) {
    ref(item.evidenceProfileRef);
    ref(item.holderBindingRef);
    integer(item.minimumCompletedYears);
    integer(item.validUntil);

    if (
      item.minimumCompletedYears < 18 ||
      typeof item.thresholdSatisfied !== "boolean" ||
      !["valid", "revoked", "unknown"].includes(item.status)
    ) {
      throw new TypeError("Invalid normalized evidence");
    }
  }

  if (
    !context.applicabilityResolved ||
    now >= context.reviewExpiresAt
  ) {
    return Object.freeze({ outcome: "review_required" });
  }

  if (
    !account.authenticationCurrent ||
    !account.participationPermitted ||
    (
      feature === "optional_xr" &&
      (
        !context.xrConfigurationApproved ||
        !account.xrPermissionCurrent
      )
    )
  ) {
    return Object.freeze({ outcome: "not_available" });
  }

  let expiresAt = Math.min(
    now + maximumLeaseMs,
    context.reviewExpiresAt,
  );

  for (const requirement of context.requirements) {
    const candidates = evidence.filter((item) =>
      item.status === "valid" &&
      item.thresholdSatisfied &&
      item.holderBindingRef === account.holderBindingRef &&
      item.minimumCompletedYears >= requirement.minimumCompletedYears &&
      now < item.validUntil &&
      requirement.acceptedEvidenceProfileRefs.includes(
        item.evidenceProfileRef,
      ));

    if (candidates.length === 0) {
      return Object.freeze({ outcome: "evidence_required" });
    }

    // Choose an accepted proof with the longest usable validity.
    const selected = candidates.reduce((first, second) =>
      second.validUntil > first.validUntil ? second : first);

    expiresAt = Math.min(expiresAt, selected.validUntil);
  }

  return Object.freeze({
    outcome: "authorized",
    lease: Object.freeze({
      feature,
      policyRef: context.policyRef,
      configurationRef: context.configurationRef,
      contextRevision: context.contextRevision,
      authorizationRevision: account.authorizationRevision,
      expiresAt,
    }),
  });
}

export function leaseMatchesCurrentAuthority(
  lease: FeatureLease,
  context: ReviewedContext,
  account: CurrentAccountAuthority,
  now: number,
): boolean {
  integer(now);
  integer(lease.expiresAt);

  return now < lease.expiresAt &&
    now < context.reviewExpiresAt &&
    context.applicabilityResolved === true &&
    account.authenticationCurrent === true &&
    account.participationPermitted === true &&
    lease.policyRef === context.policyRef &&
    lease.configurationRef === context.configurationRef &&
    lease.contextRevision === context.contextRevision &&
    lease.authorizationRevision === account.authorizationRevision &&
    (
      lease.feature !== "optional_xr" ||
      (
        context.xrConfigurationApproved === true &&
        account.xrPermissionCurrent === true
      )
    );
}
