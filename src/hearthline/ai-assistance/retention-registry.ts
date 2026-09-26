export interface RetentionRule {
  readonly mode: string;
  readonly maxSeconds: number | null;
  readonly participantCanDelete: true;
  readonly trainingUseAllowed: false;
  readonly deletionRouteRequired: true;
}

const RULES: readonly RetentionRule[] = Object.freeze([
  { mode: "ephemeral", maxSeconds: 0, participantCanDelete: true, trainingUseAllowed: false, deletionRouteRequired: true },
  { mode: "participant-controlled", maxSeconds: null, participantCanDelete: true, trainingUseAllowed: false, deletionRouteRequired: true },
  { mode: "documented-limited-retention", maxSeconds: 604800, participantCanDelete: true, trainingUseAllowed: false, deletionRouteRequired: true }
]);

export function createRetentionRegistry(extra: readonly RetentionRule[] = []) {
  const byName = new Map([...RULES, ...extra].map((r) => [r.mode, r]));

  return Object.freeze({
    has(mode: string): boolean { return byName.has(mode); },
    get(mode: string): RetentionRule | undefined { return byName.get(mode); },
    assertTrainingDisallowed(mode: string): void {
      const rule = byName.get(mode);
      if (!rule) throw new RangeError(`Unknown retention mode: ${mode}`);
      if (rule.trainingUseAllowed !== false) {
        throw new Error(`Retention mode ${mode} must disallow training use.`);
      }
    }
  });
}
