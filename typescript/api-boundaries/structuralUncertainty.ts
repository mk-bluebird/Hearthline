import type { StructuralUncertaintyDecision } from "./domain.js";
import { newId, nowIso } from "./memoryStore.js";

export interface StructuralUncertaintyInput {
  readonly fieldClass: StructuralUncertaintyDecision["fieldClass"];
  readonly observedState: StructuralUncertaintyDecision["observedState"];
  readonly policyVersion: string;
}

export function confirmOrExclude(
  input: StructuralUncertaintyInput
): StructuralUncertaintyDecision {
  const systemAction:
    StructuralUncertaintyDecision["systemAction"] =
    input.observedState === "ambiguous"
      ? "require_member_confirmation"
      : input.observedState === "policy_unclear"
        ? "route_to_human_or_policy_review"
        : input.observedState === "expired"
          ? "deny_sensitive_capability"
          : input.observedState === "outdated"
            ? "mark_source_unknown"
            : "exclude_from_decision";

  return {
    decisionId: newId("uncertainty"),
    fieldClass: input.fieldClass,
    observedState: input.observedState,
    systemAction,
    createdAt: nowIso(),
    policyVersion: input.policyVersion
  };
}

export function policyReviewRequest(
  policyVersion: string
): Readonly<{
  reviewRef: string;
  state: "queued_for_human_or_policy_review";
  policyVersion: string;
}> {
  return {
    reviewRef: newId("policy_review"),
    state: "queued_for_human_or_policy_review",
    policyVersion
  };
}
