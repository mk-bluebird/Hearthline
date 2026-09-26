export const SilenceKind = Object.freeze({
  NOT_SEEN: "not_seen",
  SEEN_DEFERRED: "seen_deferred",
  PACED_REPLY: "paced_reply",
  PAUSED_BY_USER: "paused_by_user",
  NO_REPLY_NEEDED: "no_reply_needed",
  CLOSING: "closing",
  BLOCKED: "blocked"
});

export interface SilenceSignal {
  readonly signalRef: string;
  readonly participantId: string;
  readonly conversationRef: string;
  readonly kind: string;
  readonly displayToOther: boolean;
  readonly reasonDisclosed: false;
  readonly rankingEffectProhibited: true;
  readonly createdAt: string;
  readonly externalActionAuthorized: false;
}

export function createSilenceSignal(input: {
  signalRef: string;
  participantId: string;
  conversationRef: string;
  kind: string;
  displayToOther?: boolean;
  createdAt?: string;
}): SilenceSignal {
  if (!Object.values(SilenceKind).includes(input.kind as never)) {
    throw new RangeError("Unsupported silence kind.");
  }

  const createdAt = input.createdAt ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(createdAt))) {
    throw new TypeError("createdAt must be a valid ISO 8601 date-time.");
  }

  const displayToOther =
    input.kind === SilenceKind.SEEN_DEFERRED ||
    input.kind === SilenceKind.PACED_REPLY ||
    input.kind === SilenceKind.CLOSING;

  return Object.freeze({
    signalRef: input.signalRef,
    participantId: input.participantId,
    conversationRef: input.conversationRef,
    kind: input.kind,
    displayToOther: input.displayToOther === true ? true : displayToOther,
    reasonDisclosed: false,
    rankingEffectProhibited: true,
    createdAt,
    externalActionAuthorized: false
  });
}
