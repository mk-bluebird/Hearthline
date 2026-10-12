// SPDX-License-Identifier: MIT OR Apache-2.0

export type ConsentState =
  | "NO_GRANT"
  | "GRANTED"
  | "REVOKED"
  | "EXPIRED";

export type ConsentOperation =
  | "render_field"
  | "send_message"
  | "receive_explicit_media"
  | "start_call"
  | "share_location"
  | "enter_ar"
  | "record";

export type Scope = Readonly<{
  ownerRef: string;
  recipientRef: string;
  operation: ConsentOperation;
  manifestRef: string;
  revision: number;
}>;

export type Grant = Readonly<{
  state: ConsentState;
  scope: Scope;
  grantedAt: number;
  expiresAt: number;
}>;

export type UseContext = Readonly<{
  scope: Scope;
  now: number;
  reviewRequested: boolean;
  actionPermitted: boolean;
}>;

export type ConsentDecision =
  | "PERMIT"
  | "NO_GRANT"
  | "EXPIRED"
  | "REVOKED"
  | "REVIEW_REQUESTED"
  | "SCOPE_CHANGED"
  | "ACTION_RESTRICTED";

const OPERATIONS = new Set<string>([
  "render_field",
  "send_message",
  "receive_explicit_media",
  "start_call",
  "share_location",
  "enter_ar",
  "record",
]);

const STATES = new Set<string>([
  "NO_GRANT",
  "GRANTED",
  "REVOKED",
  "EXPIRED",
]);

function validateScope(scope: Scope): void {
  for (const reference of [
    scope.ownerRef,
    scope.recipientRef,
    scope.manifestRef,
  ]) {
    if (typeof reference !== "string" || !reference.trim()) {
      throw new TypeError("Nonempty scope references required");
    }
  }

  if (
    !OPERATIONS.has(scope.operation) ||
    !Number.isSafeInteger(scope.revision) ||
    scope.revision < 0
  ) {
    throw new TypeError("Invalid operation or revision");
  }
}

function sameScope(first: Scope, second: Scope): boolean {
  return first.ownerRef === second.ownerRef &&
    first.recipientRef === second.recipientRef &&
    first.operation === second.operation &&
    first.manifestRef === second.manifestRef &&
    first.revision === second.revision;
}

export function evaluateConsent(
  grant: Grant | null,
  use: UseContext,
): ConsentDecision {
  validateScope(use.scope);

  if (
    !Number.isSafeInteger(use.now) ||
    use.now < 0 ||
    typeof use.reviewRequested !== "boolean" ||
    typeof use.actionPermitted !== "boolean"
  ) {
    throw new TypeError("Invalid evaluation context");
  }

  if (!use.actionPermitted) return "ACTION_RESTRICTED";
  if (grant === null) return "NO_GRANT";

  validateScope(grant.scope);
  if (!STATES.has(grant.state)) {
    throw new TypeError("Invalid consent state");
  }
  if (grant.state === "REVOKED") return "REVOKED";
  if (grant.state === "NO_GRANT") return "NO_GRANT";
  if (grant.state === "EXPIRED") return "EXPIRED";

  if (
    !Number.isSafeInteger(grant.grantedAt) ||
    !Number.isSafeInteger(grant.expiresAt) ||
    grant.grantedAt < 0 ||
    grant.expiresAt <= grant.grantedAt
  ) {
    throw new TypeError("Invalid grant validity period");
  }

  if (use.now < grant.grantedAt) return "NO_GRANT";
  if (use.now >= grant.expiresAt) return "EXPIRED";
  if (!sameScope(grant.scope, use.scope)) return "SCOPE_CHANGED";
  if (use.reviewRequested) return "REVIEW_REQUESTED";

  return "PERMIT";
}
