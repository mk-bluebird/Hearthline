export type FlagCategory =
  | "discovery"
  | "pacing"
  | "intimacy"
  | "compliance"
  | "accessibility"
  | "safety_boundary"
  | "research_limited"
  | "operational_emergency";

export type FlagScope =
  | "global"
  | "user_selected"
  | "explicit_research_cohort"
  | "emergency_service_boundary";

export type FlagRiskClass = "low" | "moderate" | "high" | "prohibited";
export type FlagDataImpact = "none" | "local_only" | "purpose_limited" | "prohibited";
export type FlagAccessibilityImpact =
  | "no_impact"
  | "equivalent_alternative_required"
  | "review_required";
export type FlagConsentRequirement =
  | "none"
  | "explicit_opt_in"
  | "research_consent"
  | "prohibited";
export type FlagReviewStatus =
  | "draft"
  | "reviewed"
  | "active"
  | "expired"
  | "withdrawn";

export interface FeatureFlagDefinition {
  readonly id: string;
  readonly version: string;
  readonly category: FlagCategory;
  readonly purpose: string;
  readonly scope: FlagScope;
  readonly defaultState: boolean;
  readonly userVisible: boolean;
  readonly userExplanation: string;
  readonly expiresAt: string;
  readonly riskClass: FlagRiskClass;
  readonly dataImpact: FlagDataImpact;
  readonly accessibilityImpact: FlagAccessibilityImpact;
  readonly consentRequirement: FlagConsentRequirement;
  readonly reviewStatus: FlagReviewStatus;
  readonly emergencyException: {
    readonly enabled: boolean;
    readonly postIncidentDisclosureRequired: boolean;
    readonly disclosureDeadline: string | null;
  };
  readonly externalActionAuthorized: false;
}

const USER_AFFECTING_CATEGORIES = new Set<FlagCategory>([
  "discovery",
  "pacing",
  "intimacy",
  "compliance",
  "accessibility",
  "safety_boundary",
  "research_limited"
]);

function assertNonEmptyString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${name} must be a non-empty string.`);
  }

  return value.trim();
}

function parseFutureDate(value: unknown, name: string): string {
  const normalized = assertNonEmptyString(value, name);
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.valueOf())) {
    throw new RangeError(`${name} must be a valid ISO-8601 date-time.`);
  }

  return parsed.toISOString();
}

function assertBoolean(value: unknown, name: string): boolean {
  if (typeof value !== "boolean") {
    throw new TypeError(`${name} must be a boolean.`);
  }

  return value;
}

function assertOneOf<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  name: string
): T {
  if (typeof value !== "string" || !allowedValues.includes(value as T)) {
    throw new RangeError(`${name} must be one of: ${allowedValues.join(", ")}.`);
  }

  return value as T;
}

function assertEmergencyException(
  value: unknown
): FeatureFlagDefinition["emergencyException"] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("emergencyException must be an object.");
  }

  const candidate = value as Record<string, unknown>;
  const enabled = assertBoolean(candidate.enabled, "emergencyException.enabled");
  const postIncidentDisclosureRequired = assertBoolean(
    candidate.postIncidentDisclosureRequired,
    "emergencyException.postIncidentDisclosureRequired"
  );

  const disclosureDeadline = candidate.disclosureDeadline === null
    ? null
    : parseFutureDate(
        candidate.disclosureDeadline,
        "emergencyException.disclosureDeadline"
      );

  if (enabled && !postIncidentDisclosureRequired) {
    throw new Error(
      "An emergency exception requires post-incident disclosure."
    );
  }

  if (enabled && disclosureDeadline === null) {
    throw new Error(
      "An emergency exception requires a disclosure deadline."
    );
  }

  return Object.freeze({
    enabled,
    postIncidentDisclosureRequired,
    disclosureDeadline
  });
}

export function validateFeatureFlag(
  value: unknown,
  now: Date = new Date()
): FeatureFlagDefinition {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("flag must be an object.");
  }

  const candidate = value as Record<string, unknown>;

  const category = assertOneOf<FlagCategory>(
    candidate.category,
    [
      "discovery",
      "pacing",
      "intimacy",
      "compliance",
      "accessibility",
      "safety_boundary",
      "research_limited",
      "operational_emergency"
    ],
    "flag.category"
  );

  const scope = assertOneOf<FlagScope>(
    candidate.scope,
    [
      "global",
      "user_selected",
      "explicit_research_cohort",
      "emergency_service_boundary"
    ],
    "flag.scope"
  );

  const userVisible = assertBoolean(candidate.userVisible, "flag.userVisible");
  const consentRequirement = assertOneOf<FlagConsentRequirement>(
    candidate.consentRequirement,
    [
      "none",
      "explicit_opt_in",
      "research_consent",
      "prohibited"
    ],
    "flag.consentRequirement"
  );

  const expiresAt = parseFutureDate(candidate.expiresAt, "flag.expiresAt");

  if (new Date(expiresAt) <= now) {
    throw new RangeError("flag.expiresAt must be in the future.");
  }

  if (USER_AFFECTING_CATEGORIES.has(category) && !userVisible) {
    throw new Error(
      `User-affecting flag category "${category}" must be user-visible.`
    );
  }

  if (category === "research_limited" && consentRequirement !== "research_consent") {
    throw new Error(
      "research_limited flags require research_consent."
    );
  }

  if (category === "intimacy" && consentRequirement !== "explicit_opt_in") {
    throw new Error(
      "intimacy flags require explicit_opt_in."
    );
  }

  if (scope === "explicit_research_cohort" && consentRequirement !== "research_consent") {
    throw new Error(
      "explicit_research_cohort scope requires research_consent."
    );
  }

  if (candidate.externalActionAuthorized !== false) {
    throw new Error("flag.externalActionAuthorized must be false.");
  }

  const riskClass = assertOneOf<FlagRiskClass>(
    candidate.riskClass,
    ["low", "moderate", "high", "prohibited"],
    "flag.riskClass"
  );

  const dataImpact = assertOneOf<FlagDataImpact>(
    candidate.dataImpact,
    ["none", "local_only", "purpose_limited", "prohibited"],
    "flag.dataImpact"
  );

  if (riskClass === "prohibited" || dataImpact === "prohibited") {
    throw new Error("A prohibited flag cannot be activated or registered.");
  }

  return Object.freeze({
    id: assertNonEmptyString(candidate.id, "flag.id"),
    version: assertNonEmptyString(candidate.version, "flag.version"),
    category,
    purpose: assertNonEmptyString(candidate.purpose, "flag.purpose"),
    scope,
    defaultState: assertBoolean(candidate.defaultState, "flag.defaultState"),
    userVisible,
    userExplanation: assertNonEmptyString(
      candidate.userExplanation,
      "flag.userExplanation"
    ),
    expiresAt,
    riskClass,
    dataImpact,
    accessibilityImpact: assertOneOf<FlagAccessibilityImpact>(
      candidate.accessibilityImpact,
      [
        "no_impact",
        "equivalent_alternative_required",
        "review_required"
      ],
      "flag.accessibilityImpact"
    ),
    consentRequirement,
    reviewStatus: assertOneOf<FlagReviewStatus>(
      candidate.reviewStatus,
      ["draft", "reviewed", "active", "expired", "withdrawn"],
      "flag.reviewStatus"
    ),
    emergencyException: assertEmergencyException(candidate.emergencyException),
    externalActionAuthorized: false
  });
}

export function publicFlagView(
  flag: FeatureFlagDefinition
): Readonly<Omit<FeatureFlagDefinition, "emergencyException"> & {
  readonly emergencyException: {
    readonly enabled: boolean;
    readonly postIncidentDisclosureRequired: boolean;
  };
}> {
  return Object.freeze({
    ...flag,
    emergencyException: Object.freeze({
      enabled: flag.emergencyException.enabled,
      postIncidentDisclosureRequired:
        flag.emergencyException.postIncidentDisclosureRequired
    })
  });
}
