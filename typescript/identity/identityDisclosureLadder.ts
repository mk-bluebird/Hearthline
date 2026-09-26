export type DisclosureState =
  | "draft"
  | "proposed"
  | "active"
  | "paused_by_owner"
  | "withdrawn"
  | "expired"
  | "cancelled";

export type DisclosurePurpose =
  | "self_presentation"
  | "reciprocal_interest"
  | "conversation"
  | "meeting_planning"
  | "trusted_contact"
  | "minimum_eligibility_proof";

export type AudienceKind =
  | "self_only"
  | "eligible_discovery_audience"
  | "specific_member"
  | "specific_trusted_contact"
  | "specific_verifier";

export interface IdentityDisclosure {
  readonly disclosureId: string;
  readonly ownerRef: string;
  readonly state: DisclosureState;
  readonly level: 0 | 1 | 2 | 3 | 4 | 5;
  readonly purpose: DisclosurePurpose;
  readonly audienceScope: {
    readonly kind: AudienceKind;
    readonly recipientRef?: string;
  };
  readonly fieldRefs: readonly string[];
  readonly consentGrantRef?: string;
  readonly createdAt: string;
  readonly activatedAt?: string;
  readonly expiresAt: string;
  readonly withdrawnAt?: string;
  readonly revocable: true;
}

export interface DisclosureTransitionContext {
  readonly ownerAdultPlatformEligible: boolean;
  readonly consentGrantActive: boolean;
  readonly recipientAcceptedScope: boolean;
  readonly blockOrRestrictionPresent: boolean;
  readonly currentTime: Date;
}

export type DisclosureTransitionDecision =
  | {
      readonly allowed: true;
      readonly nextState: DisclosureState;
      readonly reason: "fresh_scoped_consent_active";
    }
  | {
      readonly allowed: false;
      readonly nextState: DisclosureState;
      readonly reason:
        | "owner_not_currently_eligible"
        | "disclosure_not_proposed"
        | "block_or_restriction_present"
        | "fresh_scoped_consent_missing"
        | "recipient_scope_not_accepted"
        | "disclosure_expired"
        | "invalid_audience_scope";
    };

function requiresRecipientRef(audienceKind: AudienceKind): boolean {
  return (
    audienceKind === "specific_member" ||
    audienceKind === "specific_trusted_contact" ||
    audienceKind === "specific_verifier"
  );
}

export function evaluateDisclosureActivation(
  disclosure: IdentityDisclosure,
  context: DisclosureTransitionContext
): DisclosureTransitionDecision {
  if (!context.ownerAdultPlatformEligible) {
    return {
      allowed: false,
      nextState: disclosure.state,
      reason: "owner_not_currently_eligible"
    };
  }

  if (disclosure.state !== "proposed") {
    return {
      allowed: false,
      nextState: disclosure.state,
      reason: "disclosure_not_proposed"
    };
  }

  if (Date.parse(disclosure.expiresAt) <= context.currentTime.getTime()) {
    return {
      allowed: false,
      nextState: "expired",
      reason: "disclosure_expired"
    };
  }

  if (
    requiresRecipientRef(disclosure.audienceScope.kind) &&
    !disclosure.audienceScope.recipientRef
  ) {
    return {
      allowed: false,
      nextState: disclosure.state,
      reason: "invalid_audience_scope"
    };
  }

  if (context.blockOrRestrictionPresent) {
    return {
      allowed: false,
      nextState: disclosure.state,
      reason: "block_or_restriction_present"
    };
  }

  if (!context.consentGrantActive) {
    return {
      allowed: false,
      nextState: disclosure.state,
      reason: "fresh_scoped_consent_missing"
    };
  }

  if (
    disclosure.audienceScope.kind !== "self_only" &&
    !context.recipientAcceptedScope
  ) {
    return {
      allowed: false,
      nextState: disclosure.state,
      reason: "recipient_scope_not_accepted"
    };
  }

  return {
    allowed: true,
    nextState: "active",
    reason: "fresh_scoped_consent_active"
  };
}

export function withdrawDisclosure(
  disclosure: IdentityDisclosure,
  now: Date
): IdentityDisclosure {
  return {
    ...disclosure,
    state: "withdrawn",
    withdrawnAt: now.toISOString()
  };
}
