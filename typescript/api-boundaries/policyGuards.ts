const FORBIDDEN_FIELD_NAMES = new Set([
  "latitude",
  "longitude",
  "coordinates",
  "geohash",
  "plusCode",
  "mapTile",
  "distance",
  "radius",
  "route",
  "locationHistory",
  "attendance",
  "nearbyStatus",
  "liveLocation",
  "currentPresence",
  "riskScore",
  "safetyScore",
  "trustScore",
  "reputationScore",
  "compatibilityScore",
  "desirabilityScore",
  "popularityScore",
  "probability",
  "confidence",
  "posterior",
  "stress",
  "stressRelief",
  "loneliness",
  "isolation",
  "crisis",
  "emotionalState",
  "privateMessages",
  "contactGraph",
  "socialGraph",
  "reporterIdentity",
  "identityInference",
  "healthInference",
  "recoveryInference",
  "financialInference",
  "vulnerabilityInference"
]);

const FORBIDDEN_INTEROP_SCOPES = new Set([
  "contacts",
  "social_graph",
  "address_book",
  "counterpart_profile",
  "counterpart_messages",
  "counterpart_media",
  "consent_grants",
  "boundaries",
  "reports",
  "blocks",
  "meeting_plans",
  "trusted_contacts",
  "location",
  "routes",
  "attendance",
  "behavioral_analytics",
  "reputation",
  "trust",
  "safety",
  "risk",
  "compatibility",
  "popularity",
  "report_history",
  "encounter_history"
]);

export function rejectForbiddenFields(value: unknown): void {
  if (value === null || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(
    value as Record<string, unknown>
  )) {
    if (FORBIDDEN_FIELD_NAMES.has(key)) {
      throw new Error(`forbidden_field:${key}`);
    }

    rejectForbiddenFields(child);
  }
}

export function requireMemberInitiated(
  value: Readonly<{ memberInitiated: boolean }>
): void {
  if (value.memberInitiated !== true) {
    throw new Error("member_initiated_required");
  }
}

export function requireFutureExpiry(
  expiresAt: string,
  now: Date = new Date()
): void {
  if (Number.isNaN(Date.parse(expiresAt))) {
    throw new Error("invalid_expiry");
  }

  if (Date.parse(expiresAt) <= now.getTime()) {
    throw new Error("expired");
  }
}

export function requireAllowedInteropScopes(
  scopes: readonly string[]
): void {
  if (scopes.length === 0) {
    throw new Error("requested_scopes_required");
  }

  for (const scope of scopes) {
    if (FORBIDDEN_INTEROP_SCOPES.has(scope)) {
      throw new Error(`forbidden_scope:${scope}`);
    }
  }
}

export function requireGovernanceAuthorization(
  headers: Readonly<Record<string, string | undefined>>
): void {
  if (headers["x-governance-role"] !== "approved") {
    throw new Error("governance_authorization_required");
  }
}

export function requireMemberReference(
  headers: Readonly<Record<string, string | undefined>>
): string {
  const memberRef = headers["x-member-ref"];

  if (
    !memberRef ||
    !/^member_[A-Za-z0-9_-]{3,128}$/.test(memberRef)
  ) {
    throw new Error("member_auth_required");
  }

  return memberRef;
}
