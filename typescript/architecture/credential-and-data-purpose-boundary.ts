// SPDX-License-Identifier: MIT OR Apache-2.0

export type CredentialFormat = "mdoc" | "sd_jwt_vc" | "w3c_vc";

export type NormalizedThresholdEvidence = Readonly<{
  profileRef: string;
  configurationRef: string;
  format: CredentialFormat;
  minimumCompletedYears: number;
  thresholdSatisfied: boolean;
  audience: string;
  challengeRef: string;
  holderBindingRef: string;
  validUntil: number;
  status: "valid" | "revoked" | "unknown";
}>;

export type ReviewedProfile = Readonly<{
  profileRef: string;
  configurationRef: string;
  acceptedFormat: CredentialFormat;
  supportedThresholds: readonly number[];
  reviewExpiresAt: number;
  issuanceEvidenceAccepted: boolean;
  holderBindingAccepted: boolean;
  presentationPrivacyAccepted: boolean;
}>;

export type AdmissionContext = Readonly<{
  requiredThreshold: number;
  configurationRef: string;
  audience: string;
  challengeRef: string;
  holderBindingRef: string;
  now: number;
}>;

const FORMATS = new Set<string>(["mdoc", "sd_jwt_vc", "w3c_vc"]);

function reference(value: unknown): asserts value is string {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("Nonempty reference required");
  }
}

function nonnegativeInteger(value: unknown): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new TypeError("Nonnegative safe integer required");
  }
}

export function parseNormalizedEvidence(
  input: unknown,
): NormalizedThresholdEvidence {
  const fields = [
    "profileRef", "configurationRef", "format",
    "minimumCompletedYears", "thresholdSatisfied",
    "audience", "challengeRef", "holderBindingRef",
    "validUntil", "status",
  ];

  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new TypeError("Expected normalized evidence");
  }

  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("Expected plain data");
  }

  const keys = Reflect.ownKeys(input);
  const allowed = new Set(fields);
  if (
    keys.length !== fields.length ||
    keys.some((key) =>
      typeof key !== "string" || !allowed.has(key))
  ) {
    throw new TypeError("Extra or missing evidence fields");
  }

  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !("value" in descriptor)) {
      throw new TypeError("Accessors are not accepted");
    }
  }

  const data = input as Record<string, unknown>;

  for (const field of [
    "profileRef", "configurationRef", "audience",
    "challengeRef", "holderBindingRef",
  ]) {
    reference(data[field]);
  }

  nonnegativeInteger(data.minimumCompletedYears);
  nonnegativeInteger(data.validUntil);

  if (
    data.minimumCompletedYears < 18 ||
    typeof data.format !== "string" ||
    !FORMATS.has(data.format) ||
    typeof data.thresholdSatisfied !== "boolean" ||
    !["valid", "revoked", "unknown"].includes(data.status as string)
  ) {
    throw new TypeError("Invalid threshold evidence");
  }

  return Object.freeze({
    profileRef: data.profileRef as string,
    configurationRef: data.configurationRef as string,
    format: data.format as CredentialFormat,
    minimumCompletedYears: data.minimumCompletedYears,
    thresholdSatisfied: data.thresholdSatisfied,
    audience: data.audience as string,
    challengeRef: data.challengeRef as string,
    holderBindingRef: data.holderBindingRef as string,
    validUntil: data.validUntil,
    status: data.status as NormalizedThresholdEvidence["status"],
  });
}

export function evidenceCanEstablishThreshold(
  evidence: NormalizedThresholdEvidence,
  profile: ReviewedProfile,
  context: AdmissionContext,
): boolean {
  nonnegativeInteger(context.now);
  nonnegativeInteger(context.requiredThreshold);
  nonnegativeInteger(profile.reviewExpiresAt);

  if (
    context.requiredThreshold < 18 ||
    profile.supportedThresholds.some(
      (value) => !Number.isSafeInteger(value) || value < 18,
    ) ||
    new Set(profile.supportedThresholds).size !==
      profile.supportedThresholds.length
  ) {
    throw new TypeError("Invalid reviewed threshold scope");
  }

  for (const finding of [
    profile.issuanceEvidenceAccepted,
    profile.holderBindingAccepted,
    profile.presentationPrivacyAccepted,
  ]) {
    if (typeof finding !== "boolean") {
      throw new TypeError("Explicit review findings required");
    }
  }

  return evidence.profileRef === profile.profileRef &&
    evidence.configurationRef === context.configurationRef &&
    profile.configurationRef === context.configurationRef &&
    evidence.format === profile.acceptedFormat &&
    profile.supportedThresholds.includes(
      evidence.minimumCompletedYears,
    ) &&
    profile.issuanceEvidenceAccepted &&
    profile.holderBindingAccepted &&
    profile.presentationPrivacyAccepted &&
    context.now < profile.reviewExpiresAt &&
    context.now < evidence.validUntil &&
    evidence.status === "valid" &&
    evidence.thresholdSatisfied &&
    evidence.minimumCompletedYears >= context.requiredThreshold &&
    evidence.audience === context.audience &&
    evidence.challengeRef === context.challengeRef &&
    evidence.holderBindingRef === context.holderBindingRef;
}

export type ProposedDataPurpose =
  | "minimal_age_predicate"
  | "operational_recipient_authorization"
  | "biometric_identity_enrollment"
  | "cross_member_biometric_search"
  | "social_graph_analytics"
  | "relationship_based_discovery"
  | "encrypted_age_inference_research";

export function dataPurposeDecision(
  purpose: ProposedDataPurpose,
): "reviewed_contract_required" | "separate_research_required" | "prohibited" {
  switch (purpose) {
    case "minimal_age_predicate":
    case "operational_recipient_authorization":
      return "reviewed_contract_required";

    case "encrypted_age_inference_research":
      return "separate_research_required";

    case "biometric_identity_enrollment":
    case "cross_member_biometric_search":
    case "social_graph_analytics":
    case "relationship_based_discovery":
      return "prohibited";

    default:
      throw new TypeError("Unsupported data purpose");
  }
}
