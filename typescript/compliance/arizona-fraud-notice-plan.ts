// SPDX-License-Identifier: MIT OR Apache-2.0

export type Applicability = "applies" | "does_not_apply" | "unresolved";
export type ReviewedFact = "established" | "not_established" | "unknown";
export type DeliveryChannel = "email" | "sms" | "in_app";

export type FraudNoticeContext = Readonly<{
  policyRef: string;
  reviewedBanRef: string;
  applicability: Applicability;
  memberInArizonaUnderStatutoryDefinition: ReviewedFact;
  receivedAndRespondedToOnSiteMessage: ReviewedFact;
  bannedProfileIdentifier: string;
  fraudAvoidanceUrl: string;
  consentedChannel: DeliveryChannel | null;
  ordinaryDeadlineAt: number;
  extendedDeadlineAt: number;
  extensionAuthorized: boolean;
  extensionReviewRef: string | null;
}>;

export type FraudNoticePlan =
  | Readonly<{ outcome: "not_required" }>
  | Readonly<{ outcome: "review_required"; reason: string }>
  | Readonly<{
      outcome: "notice_required";
      policyRef: string;
      reviewedBanRef: string;
      channel: DeliveryChannel;
      deadlineAt: number;
      overdue: boolean;
      title: string;
      body: string;
    }>;

function nonempty(value: string): void {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("Nonempty reference or identifier required");
  }
}

export function planArizonaFraudNotice(
  context: FraudNoticeContext,
  now: number,
): FraudNoticePlan {
  nonempty(context.policyRef);
  nonempty(context.reviewedBanRef);
  nonempty(context.bannedProfileIdentifier);

  if (
    !["applies", "does_not_apply", "unresolved"]
      .includes(context.applicability) ||
    !["established", "not_established", "unknown"]
      .includes(context.memberInArizonaUnderStatutoryDefinition) ||
    !["established", "not_established", "unknown"]
      .includes(context.receivedAndRespondedToOnSiteMessage) ||
    typeof context.extensionAuthorized !== "boolean" ||
    !Number.isSafeInteger(now) ||
    now < 0 ||
    !Number.isSafeInteger(context.ordinaryDeadlineAt) ||
    context.ordinaryDeadlineAt < 0 ||
    !Number.isSafeInteger(context.extendedDeadlineAt) ||
    context.extendedDeadlineAt < context.ordinaryDeadlineAt
  ) {
    throw new TypeError("Invalid compliance context");
  }

  const url = new URL(context.fraudAvoidanceUrl);
  if (
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== ""
  ) {
    throw new TypeError("Invalid fraud-information URL");
  }

  if (
    context.consentedChannel !== null &&
    !["email", "sms", "in_app"].includes(context.consentedChannel)
  ) {
    throw new TypeError("Invalid consented channel");
  }

  if (context.applicability === "does_not_apply") {
    return Object.freeze({ outcome: "not_required" });
  }

  if (
    context.applicability === "unresolved" ||
    context.memberInArizonaUnderStatutoryDefinition === "unknown" ||
    context.receivedAndRespondedToOnSiteMessage === "unknown"
  ) {
    return Object.freeze({
      outcome: "review_required",
      reason: "Statutory applicability or qualifying facts unresolved",
    });
  }

  if (
    context.memberInArizonaUnderStatutoryDefinition === "not_established" ||
    context.receivedAndRespondedToOnSiteMessage === "not_established"
  ) {
    return Object.freeze({ outcome: "not_required" });
  }

  if (context.extensionAuthorized) {
    if (
      context.extensionReviewRef === null ||
      !context.extensionReviewRef.trim()
    ) {
      return Object.freeze({
        outcome: "review_required",
        reason: "Additional-time decision is not documented",
      });
    }
  }

  if (context.consentedChannel === null) {
    return Object.freeze({
      outcome: "review_required",
      reason: "Required notice has no established consented delivery channel",
    });
  }

  const deadlineAt = context.extensionAuthorized
    ? context.extendedDeadlineAt
    : context.ordinaryDeadlineAt;

  const body = [
    `Profile ${context.bannedProfileIdentifier} has been banned for fraud.`,
    "This member may have been using a false identity or may attempt to defraud other members.",
    "Do not send money or personal financial information to another member.",
    `Information about avoiding online fraud: ${url.href}`,
  ].join("\n\n");

  return Object.freeze({
    outcome: "notice_required",
    policyRef: context.policyRef,
    reviewedBanRef: context.reviewedBanRef,
    channel: context.consentedChannel,
    deadlineAt,
    overdue: now >= deadlineAt,
    title: "Important fraud-prevention notice",
    body,
  });
}
