export interface ActionDefinition {
  readonly action: string;
  readonly purpose: string;
  readonly requiresParticipantText: boolean;
  readonly outputIsDraftOnly: true;
  readonly userReviewRequired: true;
  readonly decisionUseProhibited: true;
  readonly personLevelInferenceProhibited: true;
}

const DEFAULT_ACTIONS: readonly ActionDefinition[] = Object.freeze([
  {
    action: "clarify",
    purpose: "Reframe the participant's own text for clarity without adding new facts.",
    requiresParticipantText: true,
    outputIsDraftOnly: true,
    userReviewRequired: true,
    decisionUseProhibited: true,
    personLevelInferenceProhibited: true
  },
  {
    action: "translate",
    purpose: "Translate participant-authored text while preserving meaning and tone.",
    requiresParticipantText: true,
    outputIsDraftOnly: true,
    userReviewRequired: true,
    decisionUseProhibited: true,
    personLevelInferenceProhibited: true
  },
  {
    action: "consent_summary",
    purpose: "Summarize a consent scope in plain language for the participant.",
    requiresParticipantText: true,
    outputIsDraftOnly: true,
    userReviewRequired: true,
    decisionUseProhibited: true,
    personLevelInferenceProhibited: true
  },
  {
    action: "tone_soften",
    purpose: "Offer a softer rephrasing of participant-authored text.",
    requiresParticipantText: true,
    outputIsDraftOnly: true,
    userReviewRequired: true,
    decisionUseProhibited: true,
    personLevelInferenceProhibited: true
  },
  {
    action: "boundary_rehearsal",
    purpose: "Help the participant draft a boundary statement they may send or discard.",
    requiresParticipantText: true,
    outputIsDraftOnly: true,
    userReviewRequired: true,
    decisionUseProhibited: true,
    personLevelInferenceProhibited: true
  }
]);

export function createActionRegistry(extra: readonly ActionDefinition[] = []) {
  const all = [...DEFAULT_ACTIONS, ...extra];
  const byName = new Map(all.map((def) => [def.action, def]));

  return Object.freeze({
    has(action: string): boolean {
      return byName.has(action);
    },
    get(action: string): ActionDefinition | undefined {
      return byName.get(action);
    },
    list(): readonly ActionDefinition[] {
      return Object.freeze([...byName.values()]);
    }
  });
}
