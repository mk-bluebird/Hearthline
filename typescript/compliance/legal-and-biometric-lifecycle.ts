// SPDX-License-Identifier: MIT OR Apache-2.0

export type LegalRule = Readonly<{
  authorityRef: string;
  versionRef: string;
  status: "proposed" | "enacted" | "failed" | "unresolved";
  operativeAt: number | null;
  reviewExpiresAt: number;
  applicability: "applies" | "does_not_apply" | "unresolved";
  enforcement: "in_force" | "blocked" | "unresolved";
}>;

export type RuleDecision =
  | "binding_rule_available"
  | "not_currently_binding"
  | "legal_review_required";

function ref(value: string): void {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("Nonempty reference required");
  }
}

function time(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("Invalid timestamp");
  }
}

export function legalRuleDecision(
  rule: LegalRule,
  now: number,
): RuleDecision {
  ref(rule.authorityRef);
  ref(rule.versionRef);
  time(now);
  time(rule.reviewExpiresAt);

  if (
    !["proposed", "enacted", "failed", "unresolved"].includes(rule.status) ||
    !["applies", "does_not_apply", "unresolved"].includes(
      rule.applicability,
    ) ||
    !["in_force", "blocked", "unresolved"].includes(rule.enforcement)
  ) {
    throw new TypeError("Invalid reviewed legal rule");
  }

  if (rule.operativeAt !== null) time(rule.operativeAt);

  if (now >= rule.reviewExpiresAt) {
    return "legal_review_required";
  }
  if (rule.status === "proposed" || rule.status === "failed") {
    return "not_currently_binding";
  }
  if (
    rule.status === "unresolved" ||
    rule.applicability === "unresolved"
  ) {
    return "legal_review_required";
  }
  if (
    rule.applicability === "does_not_apply" ||
    rule.enforcement === "blocked"
  ) {
    return "not_currently_binding";
  }
  if (rule.enforcement === "unresolved" || rule.operativeAt === null) {
    return "legal_review_required";
  }

  return now >= rule.operativeAt
    ? "binding_rule_available"
    : "not_currently_binding";
}

export type DestructionEvidence = Readonly<{
  locationRef: string;
  evidenceRef: string;
  completedAt: number;
  methodRef: string;
  independentlyReviewed: boolean;
}>;

export type DeletionCase = Readonly<{
  caseRef: string;
  policyRef: string;
  requiredLocationRefs: readonly string[];
  deadlineAt: number;
  hold:
    | Readonly<{ status: "none" }>
    | Readonly<{
        status: "reviewed_hold";
        authorityRef: string;
        reviewExpiresAt: number;
      }>
    | Readonly<{ status: "unresolved" }>;
  evidence: readonly DestructionEvidence[];
}>;

export type DeletionDecision = Readonly<{
  outcome:
    | "complete_under_declared_scope"
    | "pending"
    | "overdue"
    | "retained_under_reviewed_hold"
    | "review_required";
  missingLocationRefs: readonly string[];
}>;

export function assessDeletion(
  record: DeletionCase,
  now: number,
): DeletionDecision {
  ref(record.caseRef);
  ref(record.policyRef);
  time(record.deadlineAt);
  time(now);

  if (record.requiredLocationRefs.length === 0) {
    throw new TypeError("Storage scope must be declared");
  }

  record.requiredLocationRefs.forEach(ref);
  if (
    new Set(record.requiredLocationRefs).size !==
      record.requiredLocationRefs.length
  ) {
    throw new TypeError("Duplicate storage location");
  }

  const finish = (
    outcome: DeletionDecision["outcome"],
    missing: readonly string[],
  ): DeletionDecision => Object.freeze({
    outcome,
    missingLocationRefs: Object.freeze([...missing]),
  });

  if (record.hold.status === "unresolved") {
    return finish("review_required", record.requiredLocationRefs);
  }
  if (record.hold.status === "reviewed_hold") {
    ref(record.hold.authorityRef);
    time(record.hold.reviewExpiresAt);
    return finish(
      now < record.hold.reviewExpiresAt
        ? "retained_under_reviewed_hold"
        : "review_required",
      record.requiredLocationRefs,
    );
  }
  if (record.hold.status !== "none") {
    throw new TypeError("Invalid hold state");
  }

  const covered = new Set<string>();
  for (const item of record.evidence) {
    ref(item.locationRef);
    ref(item.evidenceRef);
    ref(item.methodRef);
    time(item.completedAt);

    if (
      !record.requiredLocationRefs.includes(item.locationRef) ||
      covered.has(item.locationRef) ||
      item.completedAt > now ||
      typeof item.independentlyReviewed !== "boolean"
    ) {
      throw new TypeError("Invalid destruction evidence");
    }

    if (item.independentlyReviewed) covered.add(item.locationRef);
  }

  const missing = record.requiredLocationRefs.filter(
    (location) => !covered.has(location),
  );

  return finish(
    missing.length === 0
      ? "complete_under_declared_scope"
      : now >= record.deadlineAt
        ? "overdue"
        : "pending",
    missing,
  );
}
