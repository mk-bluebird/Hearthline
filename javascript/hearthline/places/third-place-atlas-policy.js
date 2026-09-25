const PLACE_CATEGORIES = Object.freeze([
  "library",
  "cafe",
  "park",
  "community_center",
  "museum",
  "public_plaza",
  "board_game_shop",
  "bookstore",
  "restaurant",
  "public_event_space"
]);

const PUBLIC_ACCESS_TYPES = Object.freeze([
  "public",
  "semi_public",
  "ticketed_public",
  "members_only",
  "unknown"
]);

const COST_CONTEXTS = Object.freeze([
  "free",
  "low_cost",
  "varies",
  "unknown"
]);

const TRANSIT_CONTEXTS = Object.freeze([
  "transit_nearby",
  "walkable_area",
  "parking_available",
  "unknown"
]);

const ACCESSIBILITY_CONTEXTS = Object.freeze([
  "step_free_entry_reported",
  "seating_reported",
  "quiet_area_reported",
  "accessible_restroom_reported",
  "unknown"
]);

const SENSORY_CONTEXTS = Object.freeze([
  "quiet_often",
  "moderate_noise",
  "lively",
  "varies_by_time",
  "unknown"
]);

const MEETING_STYLES = Object.freeze([
  "conversation_friendly",
  "activity_friendly",
  "short_visit_friendly",
  "unknown"
]);

const CONTRIBUTION_TYPES = Object.freeze([
  "accessibility_context",
  "seating_context",
  "sensory_context",
  "cost_context",
  "hours_correction",
  "transit_context",
  "public_area_context"
]);

const PROHIBITED_PLACE_FIELD_TERMS = Object.freeze([
  "safety_score",
  "trust_score",
  "reputation",
  "danger",
  "crime",
  "date_success",
  "hookup",
  "lgbtq",
  "identity_welcome",
  "staff_kindness",
  "customer_quality",
  "check_in",
  "sighting",
  "crowd",
  "user_location",
  "live_presence",
  "reviewer_identity",
  "reviewer_history",
  "blacklist",
  "accusation",
  "counterpart",
  "meet_now",
  "hotel_room",
  "private_residence",
  "workplace",
  "home_address"
]);

const MAXIMUM_CONTEXT_LENGTH = 280;

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

function assertNoProhibitedFields(value, path = "value") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertNoProhibitedFields(entry, `${path}[${index}]`)
    );
    return;
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();

    if (
      PROHIBITED_PLACE_FIELD_TERMS.some((term) =>
        normalizedKey.includes(term)
      )
    ) {
      throw new Error(`${path} contains prohibited place field "${key}".`);
    }

    assertNoProhibitedFields(nestedValue, `${path}.${key}`);
  }
}

function normalizeOptionalContext(value, fieldName) {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value !== "string") {
    throw new TypeError(`${fieldName} must be a string when provided.`);
  }

  if (value.length > MAXIMUM_CONTEXT_LENGTH) {
    throw new RangeError(
      `${fieldName} cannot exceed ${MAXIMUM_CONTEXT_LENGTH} characters.`
    );
  }

  return value;
}

function freezeClone(value) {
  return Object.freeze(structuredClone(value));
}

export function validateThirdPlaceEntry(entry) {
  assertNoProhibitedFields(entry);

  if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
    throw new TypeError("entry must be an object.");
  }

  return freezeClone({
    placeId: assertNonEmptyString(entry.placeId, "placeId"),
    displayName: assertNonEmptyString(entry.displayName, "displayName"),
    placeCategory: assertOneOf(
      entry.placeCategory,
      PLACE_CATEGORIES,
      "placeCategory"
    ),
    publicAccess: assertOneOf(
      entry.publicAccess,
      PUBLIC_ACCESS_TYPES,
      "publicAccess"
    ),
    costContext: assertOneOf(
      entry.costContext,
      COST_CONTEXTS,
      "costContext"
    ),
    transitContext: assertOneOf(
      entry.transitContext,
      TRANSIT_CONTEXTS,
      "transitContext"
    ),
    accessibilityContext: Array.isArray(entry.accessibilityContext)
      ? Object.freeze(
          [...new Set(
            entry.accessibilityContext.map((value) =>
              assertOneOf(
                value,
                ACCESSIBILITY_CONTEXTS,
                "accessibilityContext"
              )
            )
          )]
        )
      : Object.freeze(["unknown"]),
    sensoryContext: assertOneOf(
      entry.sensoryContext,
      SENSORY_CONTEXTS,
      "sensoryContext"
    ),
    meetingStyle: assertOneOf(
      entry.meetingStyle,
      MEETING_STYLES,
      "meetingStyle"
    ),
    officialHoursSource: normalizeOptionalContext(
      entry.officialHoursSource,
      "officialHoursSource"
    ),
    sourceRetrievedAt: assertNonEmptyString(
      entry.sourceRetrievedAt,
      "sourceRetrievedAt"
    ),
    placeStatus: assertOneOf(
      entry.placeStatus,
      ["listed", "under_review", "removed"],
      "placeStatus"
    ),
    publicContextNote: normalizeOptionalContext(
      entry.publicContextNote,
      "publicContextNote"
    ),
    contributorIdentityStored: false,
    userLocationStored: false,
    externalActionAuthorized: false
  });
}

export function validatePlaceContribution(contribution) {
  assertNoProhibitedFields(contribution);

  if (
    contribution === null ||
    typeof contribution !== "object" ||
    Array.isArray(contribution)
  ) {
    throw new TypeError("contribution must be an object.");
  }

  return freezeClone({
    placeId: assertNonEmptyString(contribution.placeId, "placeId"),
    contributionType: assertOneOf(
      contribution.contributionType,
      CONTRIBUTION_TYPES,
      "contributionType"
    ),
    observation: normalizeOptionalContext(
      contribution.observation,
      "observation"
    ),
    contributorIdentityStored: false,
    contributorLocationStored: false,
    publicAttribution: false,
    publicationRequiresReview: true,
    externalActionAuthorized: false
  });
}
