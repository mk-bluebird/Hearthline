const INTENTS = Object.freeze([
  "conversation",
  "friendship",
  "date",
  "romance",
  "affection",
  "intimacy_discussion",
  "casual_encounter",
  "activity_companion"
]);

const VENUE_PREFERENCES = Object.freeze([
  "public_cafe",
  "public_activity",
  "public_park",
  "restaurant",
  "video_call",
  "discuss_together"
]);

const CORRIDOR_STATES = Object.freeze([
  "introduced",
  "mutual_interest",
  "private_discussion",
  "optional_intimacy_discussion",
  "meeting_planning",
  "meeting_confirmed",
  "archived",
  "expired",
  "withdrawn"
]);

const TRANSITION_TARGETS = Object.freeze({
  introduced: ["mutual_interest"],
  mutual_interest: ["private_discussion", "meeting_planning"],
  private_discussion: ["optional_intimacy_discussion", "meeting_planning"],
  optional_intimacy_discussion: ["meeting_planning"],
  meeting_planning: ["meeting_confirmed"],
  meeting_confirmed: ["archived"],
  archived: [],
  expired: [],
  withdrawn: []
});

const TERMINAL_STATES = new Set([
  "archived",
  "expired",
  "withdrawn"
]);

const PROHIBITED_COMMERCIAL_PATTERNS = Object.freeze([
  /\b(?:rate|rates|price|pricing|fee|fees|tip|tips|deposit|donation|donations)\b/i,
  /\b(?:cashapp|cash app|venmo|zelle|paypal|apple pay|google pay)\b/i,
  /\b(?:bitcoin|btc|ethereum|eth|usdt|crypto|wallet address)\b/i,
  /\b(?:pay(?:ing)?|payment|compensat(?:e|ion)|valuable consideration)\b/i,
  /\b(?:rent|housing|lodging|hotel room|ride|transport|gift card|debt|loan)\b.{0,80}\b(?:for|in exchange for|if you)\b.{0,80}\b(?:sex|sexual|hookup|intimacy|nudes?)\b/i,
  /\b(?:sex|sexual|hookup|intimacy|nudes?)\b.{0,80}\b(?:for|in exchange for|if you)\b.{0,80}\b(?:rent|housing|lodging|hotel room|ride|transport|gift card|debt|loan)\b/i
]);

function assertNonEmptyString(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${name} must be a non-empty string.`);
  }

  return value.trim();
}

function assertOneOf(value, allowed, name) {
  if (!allowed.includes(value)) {
    throw new RangeError(`${name} must be one of: ${allowed.join(", ")}.`);
  }

  return value;
}

function uniqueNonEmptyStrings(values, name) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new TypeError(`${name} must contain at least one value.`);
  }

  return [...new Set(values.map((value) => assertNonEmptyString(value, name)))];
}

function normalizeTimeWindow(timeWindow) {
  if (!timeWindow || typeof timeWindow !== "object" || Array.isArray(timeWindow)) {
    throw new TypeError("timeWindow must be an object.");
  }

  const startsAt = new Date(assertNonEmptyString(timeWindow.startsAt, "timeWindow.startsAt"));
  const endsAt = new Date(assertNonEmptyString(timeWindow.endsAt, "timeWindow.endsAt"));

  if (Number.isNaN(startsAt.valueOf()) || Number.isNaN(endsAt.valueOf())) {
    throw new RangeError("timeWindow must contain valid ISO-8601 values.");
  }

  if (endsAt <= startsAt) {
    throw new RangeError("timeWindow.endsAt must be later than timeWindow.startsAt.");
  }

  const maximumDurationMs = 12 * 60 * 60 * 1000;

  if (endsAt.valueOf() - startsAt.valueOf() > maximumDurationMs) {
    throw new RangeError("timeWindow may not exceed twelve hours.");
  }

  return Object.freeze({
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString()
  });
}

function assertNoCommercialLanguage(text, name) {
  const normalizedText = assertNonEmptyString(text, name);

  if (PROHIBITED_COMMERCIAL_PATTERNS.some((pattern) => pattern.test(normalizedText))) {
    throw new Error(
      `${name} contains money, payment, gift-conditioned, transport-conditioned, lodging-conditioned, or value-for-intimacy language.`
    );
  }

  return normalizedText;
}

function overlapsTimeWindow(first, second) {
  const firstStart = new Date(first.startsAt).valueOf();
  const firstEnd = new Date(first.endsAt).valueOf();
  const secondStart = new Date(second.startsAt).valueOf();
  const secondEnd = new Date(second.endsAt).valueOf();

  return Math.max(firstStart, secondStart) < Math.min(firstEnd, secondEnd);
}

function sharesValue(firstValues, secondValues) {
  const secondSet = new Set(secondValues);
  return firstValues.some((value) => secondSet.has(value));
}

function freezeClone(value) {
  return Object.freeze(structuredClone(value));
}

export class EncounterGravityWell {
  constructor({
    wellId,
    ownerId,
    regionSet,
    timeWindow,
    intents,
    venuePreferences,
    expiresAt,
    clock = () => new Date()
  }) {
    this.clock = clock;
    this.wellId = assertNonEmptyString(wellId, "wellId");
    this.ownerId = assertNonEmptyString(ownerId, "ownerId");
    this.regionSet = uniqueNonEmptyStrings(regionSet, "regionSet");
    this.timeWindow = normalizeTimeWindow(timeWindow);
    this.intents = uniqueNonEmptyStrings(intents, "intents").map((intent) =>
      assertOneOf(intent, INTENTS, "intents")
    );
    this.venuePreferences = uniqueNonEmptyStrings(
      venuePreferences,
      "venuePreferences"
    ).map((venuePreference) =>
      assertOneOf(venuePreference, VENUE_PREFERENCES, "venuePreferences")
    );

    const normalizedExpiresAt = new Date(assertNonEmptyString(expiresAt, "expiresAt"));

    if (Number.isNaN(normalizedExpiresAt.valueOf())) {
      throw new RangeError("expiresAt must be a valid ISO-8601 value.");
    }

    if (normalizedExpiresAt <= new Date(this.timeWindow.endsAt)) {
      throw new RangeError("expiresAt must be later than the end of timeWindow.");
    }

    this.expiresAt = normalizedExpiresAt.toISOString();
    this.status = "active";
    this.createdAt = this.clock().toISOString();
    this.revokedAt = null;
  }

  isActive(at = this.clock()) {
    return this.status === "active" && new Date(this.expiresAt) > new Date(at);
  }

  revoke(actorId) {
    if (assertNonEmptyString(actorId, "actorId") !== this.ownerId) {
      throw new Error("Only the well owner may revoke this introduction well.");
    }

    this.status = "revoked";
    this.revokedAt = this.clock().toISOString();
    return this.snapshot();
  }

  overlapWith(otherWell, at = this.clock()) {
    if (!(otherWell instanceof EncounterGravityWell)) {
      throw new TypeError("otherWell must be an EncounterGravityWell.");
    }

    if (!this.isActive(at) || !otherWell.isActive(at)) {
      return Object.freeze({
        eligible: false,
        reason: "inactive_or_expired"
      });
    }

    if (this.ownerId === otherWell.ownerId) {
      return Object.freeze({
        eligible: false,
        reason: "same_owner"
      });
    }

    const regionOverlap = sharesValue(this.regionSet, otherWell.regionSet);
    const timeOverlap = overlapsTimeWindow(this.timeWindow, otherWell.timeWindow);
    const intentOverlap = sharesValue(this.intents, otherWell.intents);

    if (!regionOverlap || !timeOverlap || !intentOverlap) {
      return Object.freeze({
        eligible: false,
        reason: "no_mutual_coarse_overlap"
      });
    }

    return Object.freeze({
      eligible: true,
      reason: "mutual_coarse_overlap",
      shared: {
        region: this.regionSet.find((region) => otherWell.regionSet.includes(region)),
        intent: this.intents.find((intent) => otherWell.intents.includes(intent))
      }
    });
  }

  snapshot() {
    return freezeClone({
      wellId: this.wellId,
      ownerId: this.ownerId,
      regionSet: [...this.regionSet],
      timeWindow: { ...this.timeWindow },
      intents: [...this.intents],
      venuePreferences: [...this.venuePreferences],
      expiresAt: this.expiresAt,
      status: this.status,
      createdAt: this.createdAt,
      revokedAt: this.revokedAt
    });
  }
}

export class DiscreetCorridor {
  constructor({
    corridorId,
    participantIds,
    expiresAt,
    clock = () => new Date()
  }) {
    this.clock = clock;
    this.corridorId = assertNonEmptyString(corridorId, "corridorId");
    this.participantIds = uniqueNonEmptyStrings(participantIds, "participantIds");

    if (this.participantIds.length !== 2) {
      throw new RangeError("A discreet corridor requires exactly two participants.");
    }

    const normalizedExpiresAt = new Date(assertNonEmptyString(expiresAt, "expiresAt"));

    if (Number.isNaN(normalizedExpiresAt.valueOf())) {
      throw new RangeError("expiresAt must be a valid ISO-8601 value.");
    }

    this.expiresAt = normalizedExpiresAt.toISOString();
    this.state = "introduced";
    this.requests = new Map();
    this.createdAt = this.clock().toISOString();
    this.updatedAt = this.createdAt;
    this.withdrawnBy = null;
  }

  requestTransition(actorId, targetState, note = "I would like to continue.") {
    this.#assertParticipant(actorId);
    this.#assertOpen();
    assertOneOf(targetState, CORRIDOR_STATES, "targetState");
    assertNoCommercialLanguage(note, "note");

    if (!TRANSITION_TARGETS[this.state].includes(targetState)) {
      throw new Error(
        `Cannot request transition from "${this.state}" to "${targetState}".`
      );
    }

    const requestId = `${this.corridorId}:${this.state}:${targetState}:${this.updatedAt}`;

    const request = Object.freeze({
      requestId,
      requestedBy: actorId,
      targetState,
      note,
      requestedAt: this.clock().toISOString(),
      status: "pending"
    });

    this.requests.set(requestId, request);
    this.updatedAt = request.requestedAt;
    return freezeClone(request);
  }

  respondToTransition(actorId, requestId, response) {
    this.#assertParticipant(actorId);
    this.#assertOpen();

    const request = this.requests.get(assertNonEmptyString(requestId, "requestId"));

    if (!request) {
      throw new Error(`Transition request "${requestId}" does not exist.`);
    }

    if (request.requestedBy === actorId) {
      throw new Error("A participant cannot respond to their own transition request.");
    }

    if (request.status !== "pending") {
      throw new Error(`Transition request "${requestId}" is no longer pending.`);
    }

    if (!["accept", "decline"].includes(response)) {
      throw new RangeError('response must be either "accept" or "decline".');
    }

    const respondedAt = this.clock().toISOString();

    if (response === "decline") {
      this.requests.set(requestId, Object.freeze({
        ...request,
        status: "declined",
        respondedAt
      }));
      this.updatedAt = respondedAt;

      return freezeClone({
        corridorId: this.corridorId,
        state: this.state,
        requestStatus: "declined"
      });
    }

    this.state = request.targetState;
    this.requests.set(requestId, Object.freeze({
      ...request,
      status: "accepted",
      respondedAt
    }));
    this.updatedAt = respondedAt;

    return freezeClone({
      corridorId: this.corridorId,
      state: this.state,
      requestStatus: "accepted"
    });
  }

  withdraw(actorId) {
    this.#assertParticipant(actorId);

    if (TERMINAL_STATES.has(this.state)) {
      throw new Error(`Corridor is already in terminal state "${this.state}".`);
    }

    this.state = "withdrawn";
    this.withdrawnBy = actorId;
    this.updatedAt = this.clock().toISOString();

    return freezeClone({
      corridorId: this.corridorId,
      state: this.state,
      withdrawnAt: this.updatedAt
    });
  }

  expire(at = this.clock()) {
    if (TERMINAL_STATES.has(this.state)) {
      return this.snapshot();
    }

    if (new Date(this.expiresAt) <= new Date(at)) {
      this.state = "expired";
      this.updatedAt = new Date(at).toISOString();
    }

    return this.snapshot();
  }

  snapshot() {
    return freezeClone({
      corridorId: this.corridorId,
      participantIds: [...this.participantIds],
      state: this.state,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      withdrawnBy: this.withdrawnBy,
      pendingRequestCount: [...this.requests.values()]
        .filter((request) => request.status === "pending")
        .length
    });
  }

  #assertParticipant(actorId) {
    const normalizedActorId = assertNonEmptyString(actorId, "actorId");

    if (!this.participantIds.includes(normalizedActorId)) {
      throw new Error("Only a corridor participant may perform this action.");
    }
  }

  #assertOpen() {
    if (TERMINAL_STATES.has(this.state)) {
      throw new Error(`Corridor is no longer active because it is "${this.state}".`);
    }

    if (new Date(this.expiresAt) <= new Date(this.clock())) {
      this.state = "expired";
      this.updatedAt = this.clock().toISOString();
      throw new Error("Corridor has expired.");
    }
  }
}
