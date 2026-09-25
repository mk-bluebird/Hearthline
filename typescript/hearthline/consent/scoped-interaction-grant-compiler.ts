export type PlatformScope =
  | "direct_message"
  | "voice_call_request"
  | "video_call_request"
  | "media_receive_request"
  | "private_preference_discussion"
  | "meet_plan_discussion"
  | "venue_context_discussion"
  | "aftercare_discussion"
  | "privacy_preference_discussion"
  | "health_conversation_opener";

export type RetentionClass =
  | "ephemeral"
  | "purpose_limited"
  | "aggregate_only"
  | "local_only";

export interface ScopedInteractionGrant {
  readonly grantId: string;
  readonly schemaVersion: "hearthline-scoped-interaction-grant-v1";
  readonly ownerReference: string;
  readonly recipientReference: string;
  readonly platformScope: PlatformScope;
  readonly purpose: string;
  readonly grantedAt: string;
  readonly expiresAt: string;
  readonly objectReference: string;
  readonly retentionClass: Exclude<RetentionClass, "local_only">;
  readonly externalActionAuthorized: false;
  readonly realWorldConsentClaim: false;
  readonly autoRenew: false;
}

export interface GrantRequest {
  readonly ownerReference: string;
  readonly recipientReference: string;
  readonly platformScope: PlatformScope;
  readonly purpose: string;
  readonly objectReference: string;
  readonly expiresAt: string;
  readonly explicitUserSelection: true;
  readonly externalActionAuthorized: false;
  readonly realWorldConsentClaim: false;
  readonly autoRenew: false;
}

export interface GrantRefusal {
  readonly granted: false;
  readonly reason:
    | "missing_explicit_selection"
    | "external_action_not_permitted"
    | "real_world_consent_claim_not_permitted"
    | "invalid_expiry"
    | "unsupported_scope";
}

export interface GrantApproval {
  readonly granted: true;
  readonly grant: ScopedInteractionGrant;
}

const ALLOWED_SCOPES = new Set<PlatformScope>([
  "direct_message",
  "voice_call_request",
  "video_call_request",
  "media_receive_request",
  "private_preference_discussion",
  "meet_plan_discussion",
  "venue_context_discussion",
  "aftercare_discussion",
  "privacy_preference_discussion",
  "health_conversation_opener"
]);

function assertNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${fieldName} must be a non-empty string.`);
  }

  return value.trim();
}

function normalizeFutureDate(value: string): string | null {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.valueOf()) || parsed <= new Date()) {
    return null;
  }

  return parsed.toISOString();
}

function createOpaqueReference(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

export function compileScopedInteractionGrant(
  request: GrantRequest,
  clock: () => Date = () => new Date()
): GrantApproval | GrantRefusal {
  if (request.explicitUserSelection !== true) {
    return {
      granted: false,
      reason: "missing_explicit_selection"
    };
  }

  if (request.externalActionAuthorized !== false) {
    return {
      granted: false,
      reason: "external_action_not_permitted"
    };
  }

  if (request.realWorldConsentClaim !== false) {
    return {
      granted: false,
      reason: "real_world_consent_claim_not_permitted"
    };
  }

  if (!ALLOWED_SCOPES.has(request.platformScope)) {
    return {
      granted: false,
      reason: "unsupported_scope"
    };
  }

  const expiresAt = normalizeFutureDate(request.expiresAt);

  if (expiresAt === null) {
    return {
      granted: false,
      reason: "invalid_expiry"
    };
  }

  const grantedAt = clock().toISOString();

  return {
    granted: true,
    grant: Object.freeze({
      grantId: createOpaqueReference("grant"),
      schemaVersion: "hearthline-scoped-interaction-grant-v1",
      ownerReference: assertNonEmptyString(
        request.ownerReference,
        "ownerReference"
      ),
      recipientReference: assertNonEmptyString(
        request.recipientReference,
        "recipientReference"
      ),
      platformScope: request.platformScope,
      purpose: assertNonEmptyString(request.purpose, "purpose"),
      grantedAt,
      expiresAt,
      objectReference: assertNonEmptyString(
        request.objectReference,
        "objectReference"
      ),
      retentionClass: "purpose_limited",
      externalActionAuthorized: false,
      realWorldConsentClaim: false,
      autoRenew: false
    })
  };
}
