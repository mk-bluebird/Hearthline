// SPDX-License-Identifier: MIT OR Apache-2.0

export type Operation =
  | "intent_disclosure"
  | "limited_conversation"
  | "meeting_planning"
  | "explicit_media"
  | "ar_copresence";

export type ApprovedRelease = Readonly<{
  policyRef: string;
  configurationRef: string;
  jurisdictionRefs: readonly string[];
  operations: readonly Operation[];
  effectiveAt: number;
  reviewExpiresAt: number;
}>;

export type ReleaseRequest = Readonly<{
  configurationRef: string;
  jurisdictionRef: string;
  operation: Operation;
  now: number;
}>;

export type ReleaseDecision = Readonly<{
  outcome: "within_reviewed_release" | "review_required";
  policyRef: string | null;
}>;

const OPERATIONS = new Set<string>([
  "intent_disclosure",
  "limited_conversation",
  "meeting_planning",
  "explicit_media",
  "ar_copresence",
]);

function nonempty(value: string): boolean {
  return typeof value === "string" && value.trim() !== "";
}

export function releaseGate(
  request: ReleaseRequest,
  release: ApprovedRelease | null,
): ReleaseDecision {
  if (
    !nonempty(request.configurationRef) ||
    !nonempty(request.jurisdictionRef) ||
    !OPERATIONS.has(request.operation) ||
    !Number.isSafeInteger(request.now) ||
    request.now < 0
  ) {
    throw new TypeError("Invalid release request");
  }

  if (release === null) {
    return Object.freeze({
      outcome: "review_required",
      policyRef: null,
    });
  }

  if (
    !nonempty(release.policyRef) ||
    !nonempty(release.configurationRef) ||
    release.jurisdictionRefs.length === 0 ||
    release.jurisdictionRefs.some((ref) => !nonempty(ref)) ||
    new Set(release.jurisdictionRefs).size !==
      release.jurisdictionRefs.length ||
    release.operations.length === 0 ||
    release.operations.some((op) => !OPERATIONS.has(op)) ||
    new Set(release.operations).size !== release.operations.length ||
    !Number.isSafeInteger(release.effectiveAt) ||
    !Number.isSafeInteger(release.reviewExpiresAt) ||
    release.effectiveAt < 0 ||
    release.reviewExpiresAt <= release.effectiveAt
  ) {
    throw new TypeError("Invalid approved release");
  }

  const withinScope =
    request.configurationRef === release.configurationRef &&
    release.jurisdictionRefs.includes(request.jurisdictionRef) &&
    release.operations.includes(request.operation) &&
    request.now >= release.effectiveAt &&
    request.now < release.reviewExpiresAt;

  return Object.freeze({
    outcome: withinScope
      ? "within_reviewed_release"
      : "review_required",
    policyRef: release.policyRef,
  });
}
