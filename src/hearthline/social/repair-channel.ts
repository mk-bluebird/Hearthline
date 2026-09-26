export const RepairState = Object.freeze({
  NONE: "none",
  MARKED: "marked",
  COOLING_OFF: "cooling_off",
  OPEN: "open",
  CLOSED_WELL: "closed_well",
  CLOSED_WITHOUT_REPAIR: "closed_without_repair"
});

export type RepairStateValue = typeof RepairState[keyof typeof RepairState];

export interface RepairChannel {
  readonly ruptureRef: string;
  readonly participantIds: readonly [string, string];
  readonly markedAt: string;
  readonly coolingOffUntil: string;
  readonly state: RepairStateValue;
  readonly coolingOffMinutes: number;
  readonly escalationProhibited: true;
  readonly mutualVocabularyOnly: true;
  readonly maxExchangesPerParticipant: number;
  readonly externalActionAuthorized: false;
}

const MIN_COOLING_MINUTES = 60;
const MAX_COOLING_MINUTES = 1440 * 7;
const DEFAULT_MAX_EXCHANGES = 20;

export function createRepairChannel(input: {
  ruptureRef: string;
  participantA: string;
  participantB: string;
  markedAt: string;
  coolingOffMinutes?: number;
}): RepairChannel {
  const minutes = input.coolingOffMinutes ?? 1440;

  if (minutes < MIN_COOLING_MINUTES || minutes > MAX_COOLING_MINUTES) {
    throw new RangeError(
      `coolingOffMinutes must be between ${MIN_COOLING_MINUTES} and ${MAX_COOLING_MINUTES}.`
    );
  }

  const markedAt = new Date(input.markedAt);
  if (Number.isNaN(markedAt.valueOf())) {
    throw new TypeError("markedAt must be a valid ISO 8601 date-time.");
  }

  const coolingOffUntil = new Date(markedAt.getTime() + minutes * 60_000);

  return Object.freeze({
    ruptureRef: input.ruptureRef,
    participantIds: Object.freeze([input.participantA, input.participantB]) as readonly [string, string],
    markedAt: markedAt.toISOString(),
    coolingOffUntil: coolingOffUntil.toISOString(),
    state: RepairState.MARKED,
    coolingOffMinutes: minutes,
    escalationProhibited: true,
    mutualVocabularyOnly: true,
    maxExchangesPerParticipant: DEFAULT_MAX_EXCHANGES,
    externalActionAuthorized: false
  });
}

export function transitionRepair(
  channel: RepairChannel,
  next: RepairStateValue,
  now: string = new Date().toISOString()
): RepairChannel {
  const nowMs = Date.parse(now);
  const coolingMs = Date.parse(channel.coolingOffUntil);

  if (next === RepairState.OPEN && nowMs < coolingMs) {
    throw new Error("Repair channel cannot open before cooling-off period has elapsed.");
  }

  const allowedTransitions: Record<RepairStateValue, RepairStateValue[]> = {
    [RepairState.NONE]: [RepairState.MARKED],
    [RepairState.MARKED]: [RepairState.COOLING_OFF, RepairState.CLOSED_WITHOUT_REPAIR],
    [RepairState.COOLING_OFF]: [RepairState.OPEN, RepairState.CLOSED_WITHOUT_REPAIR],
    [RepairState.OPEN]: [RepairState.CLOSED_WELL, RepairState.CLOSED_WITHOUT_REPAIR],
    [RepairState.CLOSED_WELL]: [],
    [RepairState.CLOSED_WITHOUT_REPAIR]: []
  };

  if (!allowedTransitions[channel.state].includes(next)) {
    throw new Error(`Invalid repair transition: ${channel.state} -> ${next}.`);
  }

  return Object.freeze({ ...channel, state: next });
}
