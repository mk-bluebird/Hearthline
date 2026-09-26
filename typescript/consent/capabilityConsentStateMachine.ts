export type ConsentLifecycleState =
  | "unknown"
  | "requested"
  | "discussion_optional"
  | "granted"
  | "active"
  | "paused"
  | "declined"
  | "withdrawn"
  | "expired"
  | "completed"
  | "blocked_or_reviewable"
  | "optional_reflection"
  | "closed";

export type ConsentLifecycleEvent =
  | "request"
  | "open_optional_discussion"
  | "grant"
  | "activate"
  | "pause"
  | "resume"
  | "decline"
  | "withdraw"
  | "expire"
  | "complete"
  | "block_or_report"
  | "open_optional_reflection"
  | "close";

export interface ConsentLifecycleRecord {
  readonly lifecycleId: string;
  readonly state: ConsentLifecycleState;
  readonly expiresAt: string;
  readonly updatedAt: string;
}

export interface ConsentTransitionContext {
  readonly now: Date;
  readonly adultPlatformEligible: boolean;
  readonly blockOrRestrictionPresent: boolean;
  readonly explicitGrantPresent: boolean;
  readonly scopeAndRecipientMatch: boolean;
}

export type ConsentTransitionResult =
  | {
      readonly allowed: true;
      readonly nextState: ConsentLifecycleState;
      readonly reason: string;
    }
  | {
      readonly allowed: false;
      readonly nextState: ConsentLifecycleState;
      readonly reason: string;
    };

const TRANSITIONS: Readonly<
  Record<ConsentLifecycleState, readonly ConsentLifecycleEvent[]>
> = {
  unknown: ["request", "block_or_report"],
  requested: [
    "open_optional_discussion",
    "grant",
    "decline",
    "withdraw",
    "expire",
    "block_or_report"
  ],
  discussion_optional: [
    "grant",
    "decline",
    "withdraw",
    "expire",
    "block_or_report"
  ],
  granted: [
    "activate",
    "pause",
    "withdraw",
    "expire",
    "block_or_report"
  ],
  active: [
    "pause",
    "withdraw",
    "expire",
    "complete",
    "block_or_report"
  ],
  paused: [
    "resume",
    "withdraw",
    "expire",
    "block_or_report"
  ],
  declined: ["close"],
  withdrawn: ["close"],
  expired: ["close"],
  completed: ["open_optional_reflection", "close"],
  blocked_or_reviewable: ["close"],
  optional_reflection: ["close"],
  closed: []
};

function nextStateFor(
  event: ConsentLifecycleEvent
): ConsentLifecycleState {
  const mapping: Record<ConsentLifecycleEvent, ConsentLifecycleState> = {
    request: "requested",
    open_optional_discussion: "discussion_optional",
    grant: "granted",
    activate: "active",
    pause: "paused",
    resume: "active",
    decline: "declined",
    withdraw: "withdrawn",
    expire: "expired",
    complete: "completed",
    block_or_report: "blocked_or_reviewable",
    open_optional_reflection: "optional_reflection",
    close: "closed"
  };

  return mapping[event];
}

export function transitionConsentLifecycle(
  record: ConsentLifecycleRecord,
  event: ConsentLifecycleEvent,
  context: ConsentTransitionContext
): ConsentTransitionResult {
  if (!TRANSITIONS[record.state].includes(event)) {
    return {
      allowed: false,
      nextState: record.state,
      reason: "transition_not_allowed_from_current_state"
    };
  }

  if (event === "block_or_report") {
    return {
      allowed: true,
      nextState: "blocked_or_reviewable",
      reason: "block_or_report_stops_capability_immediately"
    };
  }

  if (
    Date.parse(record.expiresAt) <= context.now.getTime() &&
    event !== "close"
  ) {
    return {
      allowed: true,
      nextState: "expired",
      reason: "capability_expired"
    };
  }

  if (
    event === "request" &&
    (!context.adultPlatformEligible || context.blockOrRestrictionPresent)
  ) {
    return {
      allowed: false,
      nextState: record.state,
      reason: "request_not_available"
    };
  }

  if (
    ["grant", "activate", "resume"].includes(event) &&
    (
      !context.adultPlatformEligible ||
      context.blockOrRestrictionPresent ||
      !context.explicitGrantPresent ||
      !context.scopeAndRecipientMatch
    )
  ) {
    return {
      allowed: false,
      nextState: record.state,
      reason: "fresh_scoped_consent_required"
    };
  }

  return {
    allowed: true,
    nextState: nextStateFor(event),
    reason: "valid_capability_scoped_transition"
  };
}
