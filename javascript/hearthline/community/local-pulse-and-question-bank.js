const ACTIVITY_BANDS = Object.freeze([
  "none",
  "a_few",
  "several",
  "many"
]);

const QUESTION_CATEGORIES = Object.freeze([
  "interests",
  "everyday_rhythm",
  "public_activity",
  "books_and_media",
  "food_and_drink",
  "small_joys",
  "conversation_style",
  "learning_and_making",
  "place_and_atmosphere",
  "boundaries_and_pace",
  "imagination",
  "no_answer_needed"
]);

const PROHIBITED_QUESTION_TERMS = Object.freeze([
  "diagnosis",
  "medical",
  "test result",
  "testing result",
  "recovery",
  "addiction",
  "substance use",
  "income",
  "salary",
  "housing",
  "rent",
  "job",
  "employer",
  "criminal",
  "immigration",
  "address",
  "where do you live",
  "work address",
  "phone number",
  "sexual history",
  "sexual role",
  "body count",
  "body measurement",
  "nudes",
  "trauma",
  "religion",
  "politics",
  "political",
  "availability",
  "when are you free",
  "nearby",
  "location",
  "personality score",
  "compatibility score",
  "risk score"
]);

const MAXIMUM_QUESTION_LENGTH = 280;
const MINIMUM_POPULATION_THRESHOLD = 12;
const MINIMUM_DELAY_MINUTES = 180;

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

function assertPositiveInteger(value, fieldName) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${fieldName} must be a positive integer.`);
  }

  return value;
}

function freezeClone(value) {
  return Object.freeze(structuredClone(value));
}

function classifyBand(eligibleAggregateCount) {
  if (eligibleAggregateCount === 0) {
    return "none";
  }

  if (eligibleAggregateCount <= 3) {
    return "a_few";
  }

  if (eligibleAggregateCount <= 9) {
    return "several";
  }

  return "many";
}

function assertQuestionIsNonInvasive(question) {
  const normalized = assertNonEmptyString(question, "question");

  if (normalized.length > MAXIMUM_QUESTION_LENGTH) {
    throw new RangeError(
      `question cannot exceed ${MAXIMUM_QUESTION_LENGTH} characters.`
    );
  }

  const lower = normalized.toLowerCase();

  if (PROHIBITED_QUESTION_TERMS.some((term) => lower.includes(term))) {
    throw new Error(
      "question contains a prohibited invasive, sensitive, assessment, or availability-oriented term."
    );
  }

  return normalized;
}

export function createLocalPulse({
  broadScopeLabel,
  aggregateCounts,
  generatedAt,
  validUntil,
  eligiblePopulation,
  aggregationDelayMinutes
}) {
  const normalizedPopulation = assertPositiveInteger(
    eligiblePopulation,
    "eligiblePopulation"
  );

  const normalizedDelay = assertPositiveInteger(
    aggregationDelayMinutes,
    "aggregationDelayMinutes"
  );

  if (normalizedPopulation < MINIMUM_POPULATION_THRESHOLD) {
    return Object.freeze({
      scope: assertNonEmptyString(broadScopeLabel, "broadScopeLabel"),
      status: "suppressed_for_privacy",
      generatedAt: assertNonEmptyString(generatedAt, "generatedAt"),
      validUntil: assertNonEmptyString(validUntil, "validUntil"),
      reminder:
        "Community activity is not shown when there are too few people to protect privacy."
    });
  }

  if (normalizedDelay < MINIMUM_DELAY_MINUTES) {
    throw new Error(
      `aggregationDelayMinutes must be at least ${MINIMUM_DELAY_MINUTES}.`
    );
  }

  if (
    aggregateCounts === null ||
    typeof aggregateCounts !== "object" ||
    Array.isArray(aggregateCounts)
  ) {
    throw new TypeError("aggregateCounts must be an object.");
  }

  const rooms = assertPositiveInteger(
    aggregateCounts.rooms + 1,
    "aggregateCounts.roomsPlusOne"
  ) - 1;

  const publicInvitations = assertPositiveInteger(
    aggregateCounts.publicInvitations + 1,
    "aggregateCounts.publicInvitationsPlusOne"
  ) - 1;

  const stories = assertPositiveInteger(
    aggregateCounts.stories + 1,
    "aggregateCounts.storiesPlusOne"
  ) - 1;

  return Object.freeze({
    scope: assertNonEmptyString(broadScopeLabel, "broadScopeLabel"),
    status: "available",
    generatedAt: assertNonEmptyString(generatedAt, "generatedAt"),
    validUntil: assertNonEmptyString(validUntil, "validUntil"),
    activity: {
      rooms: assertOneOf(classifyBand(rooms), ACTIVITY_BANDS, "roomsBand"),
      publicInvitations: assertOneOf(
        classifyBand(publicInvitations),
        ACTIVITY_BANDS,
        "publicInvitationsBand"
      ),
      stories: assertOneOf(
        classifyBand(stories),
        ACTIVITY_BANDS,
        "storiesBand"
      )
    },
    privacyControls: {
      rawCountsExcluded: true,
      livePresenceExcluded: true,
      userLocationExcluded: true,
      accountLinkedHistoryExcluded: true,
      minimumPopulationThresholdApplied: true,
      delayedAggregationApplied: true
    },
    reminder:
      "This is a broad community summary. It does not show who is present, who is nearby, where anyone is, or what anyone is doing."
  });
}

export function validateQuestionContribution({
  question,
  category,
  sensitivity = "low",
  optIn = true
}) {
  if (optIn !== true) {
    throw new Error("Conversation prompts must remain opt-in.");
  }

  if (!["low", "medium"].includes(sensitivity)) {
    throw new Error(
      "Only low or medium sensitivity prompts may be submitted to the initial question bank."
    );
  }

  return freezeClone({
    question: assertQuestionIsNonInvasive(question),
    category: assertOneOf(category, QUESTION_CATEGORIES, "category"),
    sensitivity,
    optIn: true,
    nonScored: true,
    profileUseAllowed: false,
    discoveryUseAllowed: false,
    rankingUseAllowed: false,
    externalActionAuthorized: false,
    publicationRequiresReview: true
  });
}
