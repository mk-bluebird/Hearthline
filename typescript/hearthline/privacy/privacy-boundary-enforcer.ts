export type PrivacyScope =
  | "private_only"
  | "selected_contact"
  | "reciprocal_match"
  | "room_members"
  | "local_discovery"
  | "public_profile"
  | "ephemeral_share";

export type RequestedPurpose =
  | "owner_private_access"
  | "recipient_scoped_access"
  | "reciprocal_interaction"
  | "room_context"
  | "broad_discovery"
  | "public_profile_render"
  | "ephemeral_context";

export type ScopeDecision =
  | "allow"
  | "deny_unknown_scope"
  | "deny_expired"
  | "deny_revoked"
  | "deny_purpose_mismatch"
  | "deny_correlation_boundary"
  | "deny_missing_capability";

export interface ScopeResolutionRequest {
  readonly objectReference: string;
  readonly fieldReference: string;
  readonly requesterCapability: string;
  readonly requestedPurpose: RequestedPurpose;
  readonly accessContext: string;
  readonly currentTime: string;
  readonly correlationBoundary: string;
}

export interface ScopeResolutionRecord {
  readonly objectReference: string;
  readonly fieldReference: string;
  readonly scope: PrivacyScope;
  readonly allowedPurposes: readonly RequestedPurpose[];
  readonly active: boolean;
  readonly expiresAt: string | null;
  readonly correlationBoundary: string;
}

export interface PrivacyBoundaryViolation {
  readonly violationReference: string;
  readonly ruleId: string;
  readonly objectFamily: string;
  readonly requestedPurpose: RequestedPurpose;
  readonly outcome: "denied";
  readonly occurredAt: string;
  readonly retentionExpiresAt: string;
  readonly noUserIdentity: true;
  readonly noRawContent: true;
  readonly noFieldValue: true;
  readonly noGlobalCorrelation: true;
}

function assertNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${fieldName} must be a non-empty string.`);
  }

  return value.trim();
}

function parseIsoDate(value: string, fieldName: string): Date {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.valueOf())) {
    throw new RangeError(`${fieldName} must be a valid ISO-8601 date-time.`);
  }

  return parsed;
}

function createOpaqueReference(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

export function resolvePrivacyScope(
  request: ScopeResolutionRequest,
  record: ScopeResolutionRecord
): ScopeDecision {
  if (
    request.objectReference !== record.objectReference ||
    request.fieldReference !== record.fieldReference
  ) {
    return "deny_missing_capability";
  }

  if (request.correlationBoundary !== record.correlationBoundary) {
    return "deny_correlation_boundary";
  }

  if (!record.active) {
    return "deny_revoked";
  }

  if (
    record.expiresAt !== null &&
    parseIsoDate(record.expiresAt, "record.expiresAt") <=
      parseIsoDate(request.currentTime, "request.currentTime")
  ) {
    return "deny_expired";
  }

  if (!record.allowedPurposes.includes(request.requestedPurpose)) {
    return "deny_purpose_mismatch";
  }

  if (request.requesterCapability.length === 0) {
    return "deny_missing_capability";
  }

  return "allow";
}

export function createPrivacyBoundaryViolation({
  ruleId,
  objectFamily,
  requestedPurpose,
  retentionExpiresAt,
  now = new Date()
}: {
  readonly ruleId: string;
  readonly objectFamily: string;
  readonly requestedPurpose: RequestedPurpose;
  readonly retentionExpiresAt: string;
  readonly now?: Date;
}): PrivacyBoundaryViolation {
  const expiry = parseIsoDate(retentionExpiresAt, "retentionExpiresAt");

  if (expiry <= now) {
    throw new RangeError("retentionExpiresAt must be in the future.");
  }

  return Object.freeze({
    violationReference: createOpaqueReference("privacy_violation"),
    ruleId: assertNonEmptyString(ruleId, "ruleId"),
    objectFamily: assertNonEmptyString(objectFamily, "objectFamily"),
    requestedPurpose,
    outcome: "denied",
    occurredAt: now.toISOString(),
    retentionExpiresAt: expiry.toISOString(),
    noUserIdentity: true,
    noRawContent: true,
    noFieldValue: true,
    noGlobalCorrelation: true
  });
}
