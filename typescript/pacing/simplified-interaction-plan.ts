// SPDX-License-Identifier: MIT OR Apache-2.0

export type InteractionChoices = Readonly<{
  candidatesPerPage: 1 | 5 | 10;
  composer: "simplified" | "full";
  explanations: "plain_first" | "detailed_first";
  motion: "reduced" | "standard";
  reminders: "off" | "member_selected_digest";
  localDraftSaving: boolean;
}>;

export type InteractionPlan = Readonly<{
  candidatesPerPage: 1 | 5 | 10;
  composer: "simplified" | "full";
  explanations: "plain_first" | "detailed_first";
  motion: "reduced" | "standard";
  reminders: "off" | "member_selected_digest";
  localDraftSaving: boolean;
  platformSocialResponseDeadline: null;
  urgencyIndicators: false;
  essentialControls: readonly [
    "pause",
    "withdraw",
    "block",
    "report",
    "privacy",
    "help",
  ];
}>;

export function buildInteractionPlan(
  choices: InteractionChoices,
): InteractionPlan {
  if (
    ![1, 5, 10].includes(choices.candidatesPerPage) ||
    !["simplified", "full"].includes(choices.composer) ||
    !["plain_first", "detailed_first"].includes(
      choices.explanations,
    ) ||
    !["reduced", "standard"].includes(choices.motion) ||
    !["off", "member_selected_digest"].includes(
      choices.reminders,
    ) ||
    typeof choices.localDraftSaving !== "boolean"
  ) {
    throw new TypeError("Invalid explicit interaction choices");
  }

  return Object.freeze({
    candidatesPerPage: choices.candidatesPerPage,
    composer: choices.composer,
    explanations: choices.explanations,
    motion: choices.motion,
    reminders: choices.reminders,
    localDraftSaving: choices.localDraftSaving,
    platformSocialResponseDeadline: null,
    urgencyIndicators: false,
    essentialControls: Object.freeze([
      "pause",
      "withdraw",
      "block",
      "report",
      "privacy",
      "help",
    ] as const),
  });
}

export function pageWithoutReordering<T>(
  eligibleSequence: readonly T[],
  offset: number,
  plan: InteractionPlan,
): readonly T[] {
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw new RangeError("Invalid page offset");
  }

  return Object.freeze(
    eligibleSequence.slice(offset, offset + plan.candidatesPerPage),
  );
}
