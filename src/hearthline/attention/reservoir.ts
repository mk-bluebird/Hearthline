export interface ReservoirState {
  readonly participantId: string;
  readonly windowMinutes: number;
  readonly baseAllowance: number;
  readonly appearancesInWindow: number;
  readonly lastRefillAt: string;
  readonly purchasable: false;
  readonly influencesRanking: false;
  readonly externalActionAuthorized: false;
}

const DEFAULT_WINDOW_MINUTES = 60 * 24 * 7;
const DEFAULT_BASE_ALLOWANCE = 40;

export function createReservoir(input: {
  participantId: string;
  windowMinutes?: number;
  baseAllowance?: number;
  now?: string;
}): ReservoirState {
  const now = input.now ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(now))) {
    throw new TypeError("now must be a valid ISO 8601 date-time.");
  }

  const windowMinutes = input.windowMinutes ?? DEFAULT_WINDOW_MINUTES;
  const baseAllowance = input.baseAllowance ?? DEFAULT_BASE_ALLOWANCE;

  if (windowMinutes < 60 || windowMinutes > 60 * 24 * 30) {
    throw new RangeError("windowMinutes must be between 60 and 43200.");
  }
  if (baseAllowance < 1 || baseAllowance > 500) {
    throw new RangeError("baseAllowance must be between 1 and 500.");
  }

  return Object.freeze({
    participantId: input.participantId,
    windowMinutes,
    baseAllowance,
    appearancesInWindow: 0,
    lastRefillAt: now,
    purchasable: false,
    influencesRanking: false,
    externalActionAuthorized: false
  });
}

export function hasCapacity(state: ReservoirState): boolean {
  return state.appearancesInWindow < state.baseAllowance;
}

export function recordAppearance(state: ReservoirState, now: string = new Date().toISOString()): ReservoirState {
  if (Number.isNaN(Date.parse(now))) {
    throw new TypeError("now must be a valid ISO 8601 date-time.");
  }
  if (!hasCapacity(state)) {
    throw new Error("Reservoir has no remaining capacity in the current window.");
  }
  return Object.freeze({ ...state, appearancesInWindow: state.appearancesInWindow + 1 });
}
