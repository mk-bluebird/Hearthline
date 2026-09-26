export interface RelayBoundary {
  readonly schemaVersion: "1.0";
  readonly allowedOutboundFields: readonly string[];
  readonly forbiddenOutboundFields: readonly string[];
  readonly allowedInboundFields: readonly string[];
  readonly forbiddenInboundFields: readonly string[];
  readonly approverNamed: boolean;
  readonly forkProvenanceRequired: true;
  readonly declaredAt: string;
}

const DEFAULT_OUTBOUND = Object.freeze([
  "schemaVersion",
  "requestId",
  "action",
  "purpose",
  "participantSelectedText",
  "consent",
  "retention",
  "requestedAt"
]);

const FORBIDDEN_OUTBOUND = Object.freeze([
  "participantId",
  "accountId",
  "deviceFingerprint",
  "ipAddress",
  "geolocation",
  "recoveryStatus",
  "healthStatus",
  "sexualPreference",
  "financialStatus",
  "employerName",
  "homeAddress",
  "relationshipGraph",
  "messageHistory",
  "behavioralPattern"
]);

const ALLOWED_INBOUND = Object.freeze([
  "suggestionText",
  "suggestionRef",
  "generatedAt",
  "policyVersion",
  "expiresAt"
]);

const FORBIDDEN_INBOUND = Object.freeze([
  "rankingSignal",
  "trustScore",
  "riskScore",
  "identityInference",
  "recommendedAction",
  "externalContact",
  "thirdPartyCall"
]);

export function createRelayBoundary(input: {
  approverNamed?: boolean;
  declaredAt?: string;
  extraOutbound?: readonly string[];
  extraInbound?: readonly string[];
} = {}): RelayBoundary {
  const declaredAt = input.declaredAt ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(declaredAt))) {
    throw new TypeError("declaredAt must be a valid ISO 8601 date-time.");
  }

  const extraOut = input.extraOutbound ?? [];
  const extraIn = input.extraInbound ?? [];

  for (const field of extraOut) {
    if (FORBIDDEN_OUTBOUND.includes(field)) {
      throw new Error(`Cannot allow forbidden outbound field: ${field}`);
    }
  }
  for (const field of extraIn) {
    if (FORBIDDEN_INBOUND.includes(field)) {
      throw new Error(`Cannot allow forbidden inbound field: ${field}`);
    }
  }

  return Object.freeze({
    schemaVersion: "1.0",
    allowedOutboundFields: Object.freeze([...DEFAULT_OUTBOUND, ...extraOut]),
    forbiddenOutboundFields: FORBIDDEN_OUTBOUND,
    allowedInboundFields: Object.freeze([...ALLOWED_INBOUND, ...extraIn]),
    forbiddenInboundFields: FORBIDDEN_INBOUND,
    approverNamed: input.approverNamed === true,
    forkProvenanceRequired: true,
    declaredAt
  });
}

export function assertOutboundAllowed(boundary: RelayBoundary, keys: readonly string[]): void {
  const allowed = new Set(boundary.allowedOutboundFields);
  const forbidden = new Set(boundary.forbiddenOutboundFields);

  for (const key of keys) {
    if (forbidden.has(key)) {
      throw new Error(`Outbound field is explicitly forbidden: ${key}`);
    }
    if (!allowed.has(key)) {
      throw new Error(`Outbound field is not on the allow-list: ${key}`);
    }
  }
}
