export interface ConsentScope {
  readonly scope: string;
  readonly description: string;
  readonly maxDurationMinutes: number;
  readonly revocable: true;
  readonly perRecipient: boolean;
}

const DEFAULT_SCOPES: readonly ConsentScope[] = Object.freeze([
  { scope: "single-request", description: "One AI request.", maxDurationMinutes: 15, revocable: true, perRecipient: false },
  { scope: "single-conversation", description: "One open conversation thread.", maxDurationMinutes: 240, revocable: true, perRecipient: true },
  { scope: "single-meeting-plan", description: "One meeting-planning session.", maxDurationMinutes: 1440, revocable: true, perRecipient: true }
]);

export function createConsentScopeRegistry(extra: readonly ConsentScope[] = []) {
  const byName = new Map([...DEFAULT_SCOPES, ...extra].map((s) => [s.scope, s]));

  return Object.freeze({
    has(scope: string): boolean { return byName.has(scope); },
    get(scope: string): ConsentScope | undefined { return byName.get(scope); },
    isRevocable(scope: string): boolean { return byName.get(scope)?.revocable === true; },
    maxDurationMinutes(scope: string): number {
      const entry = byName.get(scope);
      if (!entry) throw new RangeError(`Unknown consent scope: ${scope}`);
      return entry.maxDurationMinutes;
    }
  });
}
