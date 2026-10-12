// SPDX-License-Identifier: MIT OR Apache-2.0

export type PlanningPreferences = Readonly<{
  revision: number;
  paused: boolean;
  textOnly: boolean;
  publicOnly: boolean;
  overnightAllowed: boolean;
  travelAllowed: boolean;
  sameDayAllowed: boolean;
}>;

export type PlanningProposal = Readonly<{
  setting: "public" | "private" | "unknown";
  overnight: boolean;
  requiresTravel: boolean;
  sameCalendarDayForMember: boolean;
}>;

export type PacingDecision =
  | "eligible_for_review"
  | "not_now"
  | "outside_current_preferences";

export function evaluatePlanning(
  preferences: PlanningPreferences,
  proposal: PlanningProposal,
): PacingDecision {
  if (
    !Number.isSafeInteger(preferences.revision) ||
    preferences.revision < 0
  ) {
    throw new TypeError("Invalid preference revision");
  }

  const flags: unknown[] = [
    preferences.paused,
    preferences.textOnly,
    preferences.publicOnly,
    preferences.overnightAllowed,
    preferences.travelAllowed,
    preferences.sameDayAllowed,
    proposal.overnight,
    proposal.requiresTravel,
    proposal.sameCalendarDayForMember,
  ];

  if (flags.some((value) => typeof value !== "boolean")) {
    throw new TypeError("Explicit boolean choices are required");
  }

  if (
    proposal.setting !== "public" &&
    proposal.setting !== "private" &&
    proposal.setting !== "unknown"
  ) {
    throw new TypeError("Invalid planning setting");
  }

  if (preferences.paused || preferences.textOnly) {
    return "not_now";
  }

  if (
    proposal.setting === "unknown" ||
    (preferences.publicOnly && proposal.setting !== "public") ||
    (!preferences.overnightAllowed && proposal.overnight) ||
    (!preferences.travelAllowed && proposal.requiresTravel) ||
    (!preferences.sameDayAllowed &&
      proposal.sameCalendarDayForMember)
  ) {
    return "outside_current_preferences";
  }

  return "eligible_for_review";
}

export function pairPlanningGate(
  first: PlanningPreferences,
  second: PlanningPreferences,
  firstProposalView: PlanningProposal,
  secondProposalView: PlanningProposal,
): Readonly<{ eligibleForMutualReview: boolean }> {
  const firstDecision = evaluatePlanning(first, firstProposalView);
  const secondDecision = evaluatePlanning(second, secondProposalView);

  return Object.freeze({
    eligibleForMutualReview:
      firstDecision === "eligible_for_review" &&
      secondDecision === "eligible_for_review",
  });
}
