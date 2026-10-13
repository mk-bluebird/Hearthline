// SPDX-License-Identifier: MIT OR Apache-2.0

export type ReleaseSpecification = Readonly<{
  releaseRef: string;
  mechanismReviewRef: string;
  snapshotRef: string;
  queryRef: string;
  epsilonUnits: number;
  deltaUnits: number;
}>;

type ReleaseRecord = {
  specification: ReleaseSpecification;
  state: "RESERVED" | "RELEASED" | "FAILED_BUDGET_RETAINED";
  output: Uint8Array | null;
};

function ref(value: string): void {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("Nonempty reference required");
  }
}

function units(value: number, positive = false): void {
  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    (positive && value === 0)
  ) {
    throw new TypeError("Invalid fixed-unit budget");
  }
}

function sameRelease(
  first: ReleaseSpecification,
  second: ReleaseSpecification,
): boolean {
  return first.releaseRef === second.releaseRef &&
    first.mechanismReviewRef === second.mechanismReviewRef &&
    first.snapshotRef === second.snapshotRef &&
    first.queryRef === second.queryRef &&
    first.epsilonUnits === second.epsilonUnits &&
    first.deltaUnits === second.deltaUnits;
}

export class PrivacyReleaseAccountant {
  #epsilonSpent = 0;
  #deltaSpent = 0;
  #releases = new Map<string, ReleaseRecord>();

  constructor(
    private readonly maximumEpsilonUnits: number,
    private readonly maximumDeltaUnits: number,
  ) {
    units(maximumEpsilonUnits, true);
    units(maximumDeltaUnits);
  }

  reserve(specification: ReleaseSpecification): boolean {
    for (const value of [
      specification.releaseRef,
      specification.mechanismReviewRef,
      specification.snapshotRef,
      specification.queryRef,
    ]) ref(value);

    units(specification.epsilonUnits, true);
    units(specification.deltaUnits);

    const existing = this.#releases.get(specification.releaseRef);
    if (existing) {
      if (!sameRelease(existing.specification, specification)) {
        throw new Error("Release reference cannot change meaning");
      }
      return false;
    }

    if (
      specification.epsilonUnits >
        this.maximumEpsilonUnits - this.#epsilonSpent ||
      specification.deltaUnits >
        this.maximumDeltaUnits - this.#deltaSpent
    ) {
      throw new Error("Privacy budget unavailable");
    }

    this.#epsilonSpent += specification.epsilonUnits;
    this.#deltaSpent += specification.deltaUnits;
    this.#releases.set(specification.releaseRef, {
      specification: Object.freeze({ ...specification }),
      state: "RESERVED",
      output: null,
    });
    return true;
  }

  complete(releaseRef: string, protectedOutput: Uint8Array): void {
    ref(releaseRef);
    const record = this.#releases.get(releaseRef);

    if (
      !record ||
      record.state !== "RESERVED" ||
      !(protectedOutput instanceof Uint8Array)
    ) {
      throw new Error("Release is not awaiting completion");
    }

    record.output = protectedOutput.slice();
    record.state = "RELEASED";
  }

  fail(releaseRef: string): void {
    ref(releaseRef);
    const record = this.#releases.get(releaseRef);
    if (!record || record.state !== "RESERVED") {
      throw new Error("Release is not awaiting completion");
    }
    record.state = "FAILED_BUDGET_RETAINED";
  }

  releasedOutput(releaseRef: string): Uint8Array | null {
    ref(releaseRef);
    const record = this.#releases.get(releaseRef);
    return record?.state === "RELEASED" && record.output !== null
      ? record.output.slice()
      : null;
  }

  budgetStatus(): Readonly<{
    epsilonUnitsSpent: number;
    deltaUnitsSpent: number;
  }> {
    return Object.freeze({
      epsilonUnitsSpent: this.#epsilonSpent,
      deltaUnitsSpent: this.#deltaSpent,
    });
  }
}

export type CaptureReview = Readonly<{
  configurationRef: string;
  iadEvidenceRef: string;
  testedCaptureBuildRef: string;
  requiredAttackLevels: readonly (1 | 2 | 3)[];
  coveredAttackLevels: readonly (1 | 2 | 3)[];
  materialExclusionsResolved: boolean;
  reviewExpiresAt: number;
}>;

export type ExecutionEvidence = Readonly<{
  source:
    | "browser_controlled_hmac"
    | "declared_build_only"
    | "reviewed_protected_execution"
    | "reviewed_server_execution";
  currentConfigurationRef: string;
  currentCaptureBuildRef: string;
  signatureOrMacVerified: boolean;
  transcriptBindingVerified: boolean;
  oneTimeChallengeConsumed: boolean;
  iadResult: "pass" | "fail" | "unknown";
}>;

export function captureRouteMayProceed(
  review: CaptureReview,
  evidence: ExecutionEvidence,
  now: number,
): boolean {
  for (const value of [
    review.configurationRef,
    review.iadEvidenceRef,
    review.testedCaptureBuildRef,
    evidence.currentConfigurationRef,
    evidence.currentCaptureBuildRef,
  ]) ref(value);

  if (
    !Number.isSafeInteger(now) ||
    now < 0 ||
    !Number.isSafeInteger(review.reviewExpiresAt) ||
    review.reviewExpiresAt < 0 ||
    !["pass", "fail", "unknown"].includes(evidence.iadResult) ||
    ![
      "browser_controlled_hmac",
      "declared_build_only",
      "reviewed_protected_execution",
      "reviewed_server_execution",
    ].includes(evidence.source)
  ) {
    throw new TypeError("Invalid capture evidence");
  }

  for (const value of [
    review.materialExclusionsResolved,
    evidence.signatureOrMacVerified,
    evidence.transcriptBindingVerified,
    evidence.oneTimeChallengeConsumed,
  ]) {
    if (typeof value !== "boolean") {
      throw new TypeError("Explicit reviewed findings required");
    }
  }

  for (const levels of [
    review.requiredAttackLevels,
    review.coveredAttackLevels,
  ]) {
    if (
      levels.length === 0 ||
      levels.some((level) => ![1, 2, 3].includes(level)) ||
      new Set(levels).size !== levels.length
    ) {
      throw new TypeError("Invalid attack-level scope");
    }
  }

  const trustedExecution =
    evidence.source === "reviewed_protected_execution" ||
    evidence.source === "reviewed_server_execution";

  return trustedExecution &&
    evidence.signatureOrMacVerified &&
    evidence.transcriptBindingVerified &&
    evidence.oneTimeChallengeConsumed &&
    evidence.iadResult === "pass" &&
    review.materialExclusionsResolved &&
    now < review.reviewExpiresAt &&
    evidence.currentConfigurationRef === review.configurationRef &&
    evidence.currentCaptureBuildRef === review.testedCaptureBuildRef &&
    review.requiredAttackLevels.every(
      (level) => review.coveredAttackLevels.includes(level),
    );
}
