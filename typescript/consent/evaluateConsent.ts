export type ConsentState = "unknown" | "granted" | "withdrawn" | "expired";

export type ConsentCapability =
  | "receive_discovery_presentation"
  | "express_activity_interest"
  | "open_reciprocal_interest_window"
  | "open_direct_conversation"
  | "discuss_sexual_topics"
  | "share_media"
  | "view_shared_media"
  | "start_voice_call"
  | "start_video_call"
  | "discuss_named_public_venue"
  | "create_public_first_meeting_plan"
  | "share_trusted_contact_plan"
  | "enable_ar_camera"
  | "enable_ar_microphone"
  | "enable_ar_spatial_mapping"
  | "record_ar_or_call_session";

export interface ConsentGrant {
  readonly grantId: string;
  readonly state: ConsentState;
  readonly capability: ConsentCapability;
  readonly purpose:
    | "discovery"
    | "conversation"
    | "media"
    | "call"
    | "meeting_planning"
    | "trusted_contact"
    | "ar_experience";
  readonly grantedBy: string;
  readonly recipientScope: {
    readonly kind:
      | "self_only"
      | "specific_member"
      | "specific_trusted_contact"
      | "specific_session";
    readonly recipientRef?: string;
  };
  readonly grantedAt?: string;
  readonly withdrawnAt?: string;
  readonly expiresAt?: string;
  readonly policyVersion: string;
  readonly updatedAt: string;
}

export type ConsentDecision =
  | {
      readonly allowed: true;
      readonly grantId: string;
      readonly reason: "active_grant";
      readonly validUntil: string;
    }
  | {
      readonly allowed: false;
      readonly reason:
        | "no_matching_grant"
        | "grant_unknown"
        | "grant_withdrawn"
        | "grant_expired"
        | "recipient_scope_mismatch"
        | "missing_expiry";
    };

function scopeMatches(
  grant: ConsentGrant,
  recipientRef: string
): boolean {
  return (
    grant.recipientScope.kind === "specific_member" &&
    grant.recipientScope.recipientRef === recipientRef
  );
}

function effectiveState(
  grant: ConsentGrant,
  now: Date
): ConsentState {
  if (grant.state !== "granted") {
    return grant.state;
  }

  if (!grant.expiresAt) {
    return "expired";
  }

  if (Date.parse(grant.expiresAt) <= now.getTime()) {
    return "expired";
  }

  return "granted";
}

export function evaluateConsent(
  grants: readonly ConsentGrant[],
  capability: ConsentCapability,
  recipientRef: string,
  now: Date = new Date()
): ConsentDecision {
  const matchingCapability = grants.filter(
    (grant) => grant.capability === capability
  );

  if (matchingCapability.length === 0) {
    return {
      allowed: false,
      reason: "no_matching_grant"
    };
  }

  const matchingRecipient = matchingCapability.filter((grant) =>
    scopeMatches(grant, recipientRef)
  );

  if (matchingRecipient.length === 0) {
    return {
      allowed: false,
      reason: "recipient_scope_mismatch"
    };
  }

  const newest = [...matchingRecipient].sort(
    (left, right) =>
      Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
  )[0];

  const state = effectiveState(newest, now);

  if (state === "granted" && newest.expiresAt) {
    return {
      allowed: true,
      grantId: newest.grantId,
      reason: "active_grant",
      validUntil: newest.expiresAt
    };
  }

  if (state === "withdrawn") {
    return {
      allowed: false,
      reason: "grant_withdrawn"
    };
  }

  if (state === "expired") {
    return {
      allowed: false,
      reason: newest.expiresAt ? "grant_expired" : "missing_expiry"
    };
  }

  return {
    allowed: false,
    reason: "grant_unknown"
  };
}
