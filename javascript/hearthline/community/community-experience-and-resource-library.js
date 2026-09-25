const EXPERIENCE_DIMENSIONS = Object.freeze([
  "autonomy",
  "privacy_control",
  "access_equivalence",
  "boundary_clarity",
  "noninterference",
  "public_place_access",
  "appeal_and_correction",
  "feature_harm_reports"
]);

const RESOURCE_CATEGORIES = Object.freeze([
  "transit",
  "food",
  "housing_information",
  "health_information",
  "recovery_information",
  "legal_information",
  "employment_information",
  "accessibility_information",
  "community_information",
  "emergency_information"
]);

const RESOURCE_STATUSES = Object.freeze([
  "listed",
  "under_review",
  "outdated",
  "removed"
]);

const SOURCE_TYPES = Object.freeze([
  "government",
  "public_agency",
  "public_health",
  "legal_aid",
  "nonprofit_directory",
  "community_organization",
  "official_provider"
]);

const MAXIMUM_SUMMARY_LENGTH = 600;

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${fieldName} must be a non-empty string.`);
  }

  return value.trim();
}

function assertOneOf(value, allowedValues, fieldName) {
  if (!allowedValues.includes(value)) {
    throw new RangeError(
      `${fieldName} must be one of: ${allowedValues.join(", ")}.`
    );
  }

  return value;
}

function assertHttpsUrl(value, fieldName) {
  const url = assertNonEmptyString(value, fieldName);

  if (!url.startsWith("https://")) {
    throw new RangeError(`${fieldName} must begin with https://.`);
  }

  return url;
}

function normalizeDateTime(value, fieldName) {
  const parsed = new Date(assertNonEmptyString(value, fieldName));

  if (Number.isNaN(parsed.valueOf())) {
    throw new RangeError(`${fieldName} must be a valid ISO-8601 date-time.`);
  }

  return parsed.toISOString();
}

function normalizeDate(value, fieldName) {
  const normalized = assertNonEmptyString(value, fieldName);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new RangeError(`${fieldName} must use YYYY-MM-DD format.`);
  }

  return normalized;
}

function normalizeSummary(value) {
  const summary = assertNonEmptyString(value, "plainLanguageSummary");

  if (summary.length > MAXIMUM_SUMMARY_LENGTH) {
    throw new RangeError(
      `plainLanguageSummary cannot exceed ${MAXIMUM_SUMMARY_LENGTH} characters.`
    );
  }

  return summary;
}

function freezeClone(value) {
  return Object.freeze(structuredClone(value));
}

export function validateCommunityExperienceStudy({
  studyId,
  dimension,
  aggregateOnly,
  minimumPublicationThreshold,
  participantFeedbackOptional,
  identityInferenceProhibited,
  profileJoinProhibited,
  externalActionAuthorized = false
}) {
  if (aggregateOnly !== true) {
    throw new Error("Community experience studies must be aggregate-only.");
  }

  if (participantFeedbackOptional !== true) {
    throw new Error("Community experience feedback must be optional.");
  }

  if (identityInferenceProhibited !== true) {
    throw new Error("Identity inference must be prohibited.");
  }

  if (profileJoinProhibited !== true) {
    throw new Error("Profile joins must be prohibited.");
  }

  if (externalActionAuthorized !== false) {
    throw new Error("externalActionAuthorized must be false.");
  }

  if (
    !Number.isInteger(minimumPublicationThreshold) ||
    minimumPublicationThreshold < 20
  ) {
    throw new RangeError(
      "minimumPublicationThreshold must be an integer of at least 20."
    );
  }

  return freezeClone({
    studyId: assertNonEmptyString(studyId, "studyId"),
    dimension: assertOneOf(
      dimension,
      EXPERIENCE_DIMENSIONS,
      "dimension"
    ),
    aggregateOnly: true,
    minimumPublicationThreshold,
    participantFeedbackOptional: true,
    identityInferenceProhibited: true,
    profileJoinProhibited: true,
    noCompositeWellnessScore: true,
    noIndividualScore: true,
    noDiscoveryUse: true,
    noRankingUse: true,
    noAdvertisingUse: true,
    noModerationUse: true,
    externalActionAuthorized: false
  });
}

export function validatePublicResourceEntry(entry) {
  if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
    throw new TypeError("entry must be an object.");
  }

  return freezeClone({
    resourceId: assertNonEmptyString(entry.resourceId, "resourceId"),
    title: assertNonEmptyString(entry.title, "title"),
    category: assertOneOf(
      entry.category,
      RESOURCE_CATEGORIES,
      "category"
    ),
    officialOrPublisherSource: assertNonEmptyString(
      entry.officialOrPublisherSource,
      "officialOrPublisherSource"
    ),
    sourceUrl: assertHttpsUrl(entry.sourceUrl, "sourceUrl"),
    sourceType: assertOneOf(
      entry.sourceType,
      SOURCE_TYPES,
      "sourceType"
    ),
    jurisdiction: assertNonEmptyString(entry.jurisdiction, "jurisdiction"),
    retrievedAt: normalizeDateTime(entry.retrievedAt, "retrievedAt"),
    reviewBy: normalizeDate(entry.reviewBy, "reviewBy"),
    plainLanguageSummary: normalizeSummary(entry.plainLanguageSummary),
    contactMethodAsPublished: entry.contactMethodAsPublished
      ? assertNonEmptyString(
          entry.contactMethodAsPublished,
          "contactMethodAsPublished"
        )
      : "",
    accessibilityInformationIfPubliclyAvailable:
      entry.accessibilityInformationIfPubliclyAvailable
        ? assertNonEmptyString(
            entry.accessibilityInformationIfPubliclyAvailable,
            "accessibilityInformationIfPubliclyAvailable"
          )
        : "",
    status: assertOneOf(entry.status, RESOURCE_STATUSES, "status"),
    personalizedRecommendation: false,
    userNeedInference: false,
    userTracking: false,
    referral: false,
    externalActionAuthorized: false
  });
}
