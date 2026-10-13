// SPDX-License-Identifier: MIT OR Apache-2.0

export const ACCESS_REQUIREMENTS = [
  "camera",
  "microphone",
  "gestures",
  "wearable",
  "smartphone",
  "identity_wallet",
  "government_document",
  "bank_account",
  "credit_card",
  "contract_mobile_number",
  "travel",
] as const;

export type AccessRequirement =
  (typeof ACCESS_REQUIREMENTS)[number];

export type RequirementState =
  | "required"
  | "not_required"
  | "unknown";

export type Route = Readonly<{
  routeRef: string;
  configurationRef: string;
  reviewRef: string;
  reviewExpiresAt: number;
  supportedThresholds: readonly number[];
  evidenceAccepted: boolean;
  legalApplicabilityAccepted: boolean;
  privacyAccepted: boolean;
  accessibilityAccepted: boolean;
  behavioralProfiling: boolean;
  identityGraphProcessing: boolean;
  physiologicalHealthSignal: boolean;
  requirements: Readonly<Record<AccessRequirement, RequirementState>>;
}>;

export type MemberAccessChoices = Readonly<{
  excludedRequirements: readonly AccessRequirement[];
}>;

export type RouteChoice = Readonly<{
  routeRef: string;
  reviewRef: string;
}>;

const REQUIREMENT_SET = new Set<string>(ACCESS_REQUIREMENTS);
const STATES = new Set<string>([
  "required",
  "not_required",
  "unknown",
]);

function reference(value: string): void {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("Nonempty reference required");
  }
}

export function selectAccessibleRoutes(
  routes: readonly Route[],
  choices: MemberAccessChoices,
  requiredThreshold: number,
  configurationRef: string,
  now: number,
): readonly RouteChoice[] {
  reference(configurationRef);

  if (
    !Number.isSafeInteger(requiredThreshold) ||
    requiredThreshold < 18 ||
    !Number.isSafeInteger(now) ||
    now < 0 ||
    !Array.isArray(choices.excludedRequirements) ||
    choices.excludedRequirements.some(
      (value) => !REQUIREMENT_SET.has(value),
    ) ||
    new Set(choices.excludedRequirements).size !==
      choices.excludedRequirements.length
  ) {
    throw new TypeError("Invalid explicit access choices");
  }

  const seen = new Set<string>();
  const selected: RouteChoice[] = [];

  for (const route of routes) {
    reference(route.routeRef);
    reference(route.configurationRef);
    reference(route.reviewRef);

    if (
      seen.has(route.routeRef) ||
      !Number.isSafeInteger(route.reviewExpiresAt) ||
      route.reviewExpiresAt < 0 ||
      route.supportedThresholds.length === 0 ||
      route.supportedThresholds.some(
        (value) => !Number.isSafeInteger(value) || value < 18,
      ) ||
      new Set(route.supportedThresholds).size !==
        route.supportedThresholds.length
    ) {
      throw new TypeError("Invalid route review");
    }
    seen.add(route.routeRef);

    const findings = [
      route.evidenceAccepted,
      route.legalApplicabilityAccepted,
      route.privacyAccepted,
      route.accessibilityAccepted,
      route.behavioralProfiling,
      route.identityGraphProcessing,
      route.physiologicalHealthSignal,
    ];

    if (findings.some((value) => typeof value !== "boolean")) {
      throw new TypeError("Explicit review findings required");
    }

    const requirementKeys = Reflect.ownKeys(route.requirements);
    if (
      requirementKeys.length !== ACCESS_REQUIREMENTS.length ||
      requirementKeys.some(
        (key) => typeof key !== "string" || !REQUIREMENT_SET.has(key),
      )
    ) {
      throw new TypeError("Incomplete or undeclared route requirements");
    }

    for (const requirement of ACCESS_REQUIREMENTS) {
      if (!STATES.has(route.requirements[requirement])) {
        throw new TypeError("Invalid route access requirement");
      }
    }

    const approved =
      route.configurationRef === configurationRef &&
      now < route.reviewExpiresAt &&
      route.supportedThresholds.includes(requiredThreshold) &&
      route.evidenceAccepted &&
      route.legalApplicabilityAccepted &&
      route.privacyAccepted &&
      route.accessibilityAccepted &&
      !route.behavioralProfiling &&
      !route.identityGraphProcessing &&
      !route.physiologicalHealthSignal;

    const fitsChoices = choices.excludedRequirements.every(
      (requirement) =>
        route.requirements[requirement] === "not_required",
    );

    if (approved && fitsChoices) {
      selected.push(Object.freeze({
        routeRef: route.routeRef,
        reviewRef: route.reviewRef,
      }));
    }
  }

  return Object.freeze(selected);
}
