export interface ReaderPause {
  readonly pauseRef: string;
  readonly readerId: string;
  readonly startedAt: string;
  readonly endsAt: string | null;
  readonly curiosityBudget: number;
  readonly profilesOpenedInWindow: number;
  readonly penaltyImposed: false;
  readonly visibilityReduced: false;
  readonly externalActionAuthorized: false;
}

export function createReaderPause(input: {
  pauseRef: string;
  readerId: string;
  durationMinutes: number;
  curiosityBudget?: number;
  startedAt?: string;
}): ReaderPause {
  if (input.durationMinutes < 15 || input.durationMinutes > 60 * 24 * 14) {
    throw new RangeError("durationMinutes must be between 15 and 20160.");
  }

  const startedAt = input.startedAt ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(startedAt))) {
    throw new TypeError("startedAt must be a valid ISO 8601 date-time.");
  }

  const startedMs = Date.parse(startedAt);
  const endsAt = new Date(startedMs + input.durationMinutes * 60_000).toISOString();
  const curiosityBudget = input.curiosityBudget ?? 10;

  if (curiosityBudget < 1 || curiosityBudget > 100) {
    throw new RangeError("curiosityBudget must be between 1 and 100.");
  }

  return Object.freeze({
    pauseRef: input.pauseRef,
    readerId: input.readerId,
    startedAt,
    endsAt,
    curiosityBudget,
    profilesOpenedInWindow: 0,
    penaltyImposed: false,
    visibilityReduced: false,
    externalActionAuthorized: false
  });
}

export function withinBudget(pause: ReaderPause): boolean {
  return pause.profilesOpenedInWindow < pause.curiosityBudget;
}
