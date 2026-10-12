// SPDX-License-Identifier: MIT OR Apache-2.0

export type Capability =
  | "discovery"
  | "messaging"
  | "explicit_media"
  | "ar_copresence";

export type PolicyEnvelope = Readonly<{
  policyRef: string;
  jurisdictionRef: string;
  configurationRef: string;
  approvedAt: number;
  reviewExpiresAt: number;
  approvedCapabilities: readonly Capability[];
  sourceUrls: readonly string[];
}>;

export type RequestContext = Readonly<{
  jurisdictionRef: string;
  configurationRef: string;
  capability: Capability;
  membershipEligible: boolean;
  operationConsentCurrent: boolean;
}>;

export type Decision = Readonly<{
  outcome: "permit" | "deny" | "review_required";
  reason:
    | "approved_operation"
    | "membership_not_established"
    | "consent_not_current"
    | "policy_unavailable"
    | "policy_not_current"
    | "scope_mismatch"
    | "capability_not_approved";
  policyRef: string | null;
}>;

const CAPABILITIES = new Set<string>([
  "discovery",
  "messaging",
  "explicit_media",
  "ar_copresence",
]);

export function validateEnvelope(policy: PolicyEnvelope): void {
  for (const value of [
    policy.policyRef,
    policy.jurisdictionRef,
    policy.configurationRef,
  ]) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new TypeError("Policy references must be nonempty");
    }
  }

  if (
    !Number.isSafeInteger(policy.approvedAt) ||
    !Number.isSafeInteger(policy.reviewExpiresAt) ||
    policy.approvedAt < 0 ||
    policy.reviewExpiresAt <= policy.approvedAt
  ) {
    throw new RangeError("Invalid review period");
  }

  if (
    policy.approvedCapabilities.length === 0 ||
    new Set(policy.approvedCapabilities).size !==
      policy.approvedCapabilities.length ||
    policy.approvedCapabilities.some(
      (capability) => !CAPABILITIES.has(capability),
    )
  ) {
    throw new TypeError("Invalid capability scope");
  }

  if (policy.sourceUrls.length === 0) {
    throw new TypeError("Source provenance is required");
  }

  for (const value of policy.sourceUrls) {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username !== "" ||
      url.password !== ""
    ) {
      throw new TypeError("Invalid source URL");
    }
  }
}

export function decide(
  request: RequestContext,
  policy: PolicyEnvelope | null,
  now: number,
): Decision {
  if (!Number.isSafeInteger(now) || now < 0) {
    throw new RangeError("Invalid evaluation time");
  }
  if (
    !CAPABILITIES.has(request.capability) ||
    typeof request.membershipEligible !== "boolean" ||
    typeof request.operationConsentCurrent !== "boolean"
  ) {
    throw new TypeError("Invalid request");
  }

  const result = (
    outcome: Decision["outcome"],
    reason: Decision["reason"],
  ): Decision => Object.freeze({
    outcome,
    reason,
    policyRef: policy?.policyRef ?? null,
  });

  if (!request.membershipEligible) {
    return result("deny", "membership_not_established");
  }
  if (!request.operationConsentCurrent) {
    return result("deny", "consent_not_current");
  }
  if (policy === null) {
    return result("review_required", "policy_unavailable");
  }

  validateEnvelope(policy);

  if (now < policy.approvedAt || now >= policy.reviewExpiresAt) {
    return result("review_required", "policy_not_current");
  }
  if (
    request.jurisdictionRef !== policy.jurisdictionRef ||
    request.configurationRef !== policy.configurationRef
  ) {
    return result("review_required", "scope_mismatch");
  }
  if (!policy.approvedCapabilities.includes(request.capability)) {
    return result("review_required", "capability_not_approved");
  }
  return result("permit", "approved_operation");
}
