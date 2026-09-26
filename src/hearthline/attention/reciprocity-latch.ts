export const LatchTier = Object.freeze({
  NOTHING: "nothing",
  GREETING: "greeting",
  SHARED_VALUE: "shared_value",
  INTIMACY_DISCUSSION: "intimacy_discussion",
  MEETING_WINDOW: "meeting_window"
});

export interface LatchState {
  readonly latchRef: string;
  readonly participantA: string;
  readonly participantB: string;
  readonly tier: string;
  readonly aActions: readonly string[];
  readonly bActions: readonly string[];
  readonly updatedAt: string;
  readonly inferredByAlgorithm: false;
  readonly consentRequired: true;
  readonly revocationImmediate: true;
  readonly externalActionAuthorized: false;
}

const TIER_ORDER: readonly string[] = [
  LatchTier.NOTHING,
  LatchTier.GREETING,
  LatchTier.SHARED_VALUE,
  LatchTier.INTIMACY_DISCUSSION,
  LatchTier.MEETING_WINDOW
];

export function createLatch(input: {
  latchRef: string;
  participantA: string;
  participantB: string;
}): LatchState {
  if (input.participantA === input.participantB) {
    throw new Error("Latch requires two distinct participants.");
  }
  return Object.freeze({
    latchRef: input.latchRef,
    participantA: input.participantA,
    participantB: input.participantB,
    tier: LatchTier.NOTHING,
    aActions: Object.freeze([]),
    bActions: Object.freeze([]),
    updatedAt: new Date().toISOString(),
    inferredByAlgorithm: false,
    consentRequired: true,
    revocationImmediate: true,
    externalActionAuthorized: false
  });
}

export function mutualTier(state: LatchState): string {
  const aMax = Math.max(-1, ...state.aActions.map((a) => TIER_ORDER.indexOf(a)));
  const bMax = Math.max(-1, ...state.bActions.map((a) => TIER_ORDER.indexOf(a)));
  return TIER_ORDER[Math.min(aMax, bMax)];
}
