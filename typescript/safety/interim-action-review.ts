// SPDX-License-Identifier: MIT OR Apache-2.0

export type InterimActionReview = Readonly<{
  caseRef: string;
  reviewRef: string;
  policyRef: string;
  action: "restrict_contact" | "restrict_media" | "pause_admission";
  specificEvidenceReviewed: boolean;
  seriousTimeSensitiveConcern: boolean;
  authorityConfirmed: boolean;
  necessaryAndProportionate: boolean;
  startsAt: number;
  expiresAt: number;
  reviewDueAt: number;
}>;

export function interimActionWithinPolicy(
  review: InterimActionReview,
  now: number,
  maximumDurationMs: number,
): boolean {
  for (const ref of [
    review.caseRef,
    review.reviewRef,
    review.policyRef,
  ]) {
    if (typeof ref !== "string" || !ref.trim()) {
      throw new TypeError("Review references required");
    }
  }

  if (
    !["restrict_contact", "restrict_media", "pause_admission"]
      .includes(review.action) ||
    !Number.isSafeInteger(now) ||
    now < 0 ||
    !Number.isSafeInteger(maximumDurationMs) ||
    maximumDurationMs <= 0
  ) {
    throw new TypeError("Invalid action context");
  }

  for (const time of [
    review.startsAt,
    review.expiresAt,
    review.reviewDueAt,
  ]) {
    if (!Number.isSafeInteger(time) || time < 0) {
      throw new TypeError("Invalid action time");
    }
  }

  const findings = [
    review.specificEvidenceReviewed,
    review.seriousTimeSensitiveConcern,
    review.authorityConfirmed,
    review.necessaryAndProportionate,
  ];
  if (findings.some((value) => typeof value !== "boolean")) {
    throw new TypeError("Explicit review findings required");
  }

  return findings.every((value) => value) &&
    review.expiresAt > review.startsAt &&
    review.expiresAt - review.startsAt <= maximumDurationMs &&
    review.reviewDueAt >= review.startsAt &&
    review.reviewDueAt <= review.expiresAt &&
    now >= review.startsAt &&
    now < review.expiresAt;
}
