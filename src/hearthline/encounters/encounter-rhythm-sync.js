const RHYTHM_OPTIONS = Object.freeze({
  pace: Object.freeze([
    "unhurried",
    "flexible",
    "direct",
    "exploratory",
    "not_discussing_yet"
  ]),
  structure: Object.freeze([
    "spontaneous",
    "lightly_planned",
    "ritual_oriented",
    "discuss_together",
    "not_discussing_yet"
  ]),
  conversation: Object.freeze([
    "quiet",
    "some_check_in",
    "talkative",
    "discuss_together",
    "not_discussing_yet"
  ]),
  affection: Object.freeze([
    "discuss_first",
    "slow_to_start",
    "responsive_to_check_ins",
    "not_discussing_yet"
  ]),
  aftercare: Object.freeze([
    "brief_check_in",
    "next_day_message",
    "quiet_departure_ok",
    "discuss_together",
    "not_discussing_yet"
  ]),
  changeTolerance: Object.freeze([
    "prefer_plan_stability",
    "flexible_with_notice",
    "comfortable_revising",
    "discuss_together",
    "not_discussing_yet"
  ])
});

const DIMENSIONS = Object.freeze(Object.keys(RHYTHM_OPTIONS));

const SHARING_STATES = Object.freeze([
  "unavailable",
  "draft",
  "mutually_visible",
  "paused",
  "revoked",
  "expired"
]);

const TERMINAL_STATES = new Set([
  "revoked",
  "expired"
]);

function assertNonEmptyString(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${name} must be a non-empty string.`);
  }

  return value.trim();
}

function assertPlainObject(value, name) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object.`);
  }

  return value;
}

function normalizeIsoDate(value, name) {
  const date = new Date(assertNonEmptyString(value, name));

  if (Number.isNaN(date.valueOf())) {
    throw new RangeError(`${name} must be a valid ISO-8601 date-time.`);
  }

  return date.toISOString();
}

function assertValidOption(dimension, value) {
  if (!RHYTHM_OPTIONS[dimension].includes(value)) {
    throw new RangeError(
      `${dimension} must be one of: ${RHYTHM_OPTIONS[dimension].join(", ")}.`
    );
  }

  return value;
}

function freezeClone(value) {
  return Object.freeze(structuredClone(value));
}

function normalizeDeclaration(declaration) {
  const normalized = assertPlainObject(declaration, "declaration");
  const output = {};

  for (const dimension of DIMENSIONS) {
    if (normalized[dimension] !== undefined) {
      output[dimension] = assertValidOption(dimension, normalized[dimension]);
    }
  }

  if (Object.keys(output).length === 0) {
    throw new TypeError("declaration must contain at least one rhythm dimension.");
  }

  return Object.freeze(output);
}

function relationFor(firstValue, secondValue) {
  if (firstValue === undefined || secondValue === undefined) {
    return "not_shared";
  }

  if (firstValue === "not_discussing_yet" || secondValue === "not_discussing_yet") {
    return "not_discussing";
  }

  return firstValue === secondValue ? "shared" : "different";
}

function promptFor(dimension, relation, firstValue, secondValue) {
  const label = {
    pace: "pace",
    structure: "planning style",
    conversation: "conversation style",
    affection: "affection discussion",
    aftercare: "follow-up preferences",
    changeTolerance: "plan changes"
  }[dimension];

  if (relation === "shared") {
    return `You both selected the same ${label} preference.`;
  }

  if (relation === "different") {
    return `You selected different ${label} preferences. Consider discussing what feels comfortable for each of you.`;
  }

  if (relation === "not_discussing") {
    return `One or both of you are not discussing ${label} preferences yet.`;
  }

  return `One or both of you have not shared a ${label} preference.`;
}

export class EncounterRhythmSync {
  constructor({
    corridorId,
    participantIds,
    expiresAt,
    clock = () => new Date()
  }) {
    this.clock = clock;
    this.corridorId = assertNonEmptyString(corridorId, "corridorId");

    if (!Array.isArray(participantIds) || participantIds.length !== 2) {
      throw new TypeError("participantIds must contain exactly two participants.");
    }

    this.participantIds = [...new Set(
      participantIds.map((participantId) =>
        assertNonEmptyString(participantId, "participantIds")
      )
    )];

    if (this.participantIds.length !== 2) {
      throw new RangeError("participantIds must contain two distinct values.");
    }

    this.expiresAt = normalizeIsoDate(expiresAt, "expiresAt");
    this.state = "unavailable";
    this.openedBy = new Set();
    this.declarations = new Map();
    this.pausedBy = new Set();
    this.createdAt = this.clock().toISOString();
    this.updatedAt = this.createdAt;
  }

  open(actorId) {
    this.#assertParticipant(actorId);
    this.#assertNotExpired();

    if (TERMINAL_STATES.has(this.state)) {
      throw new Error(`Rhythm sharing is "${this.state}".`);
    }

    this.openedBy.add(actorId);
    this.updatedAt = this.clock().toISOString();

    if (this.openedBy.size === this.participantIds.length) {
      this.state = "draft";
    }

    return this.snapshot(actorId);
  }

  declare(actorId, declaration) {
    this.#assertParticipant(actorId);
    this.#assertOpenForSharing();

    const normalizedDeclaration = normalizeDeclaration(declaration);
    this.declarations.set(actorId, normalizedDeclaration);
    this.updatedAt = this.clock().toISOString();

    if (this.declarations.size === this.participantIds.length) {
      this.state = "mutually_visible";
    }

    return this.snapshot(actorId);
  }

  pause(actorId) {
    this.#assertParticipant(actorId);
    this.#assertNotExpired();

    if (TERMINAL_STATES.has(this.state)) {
      throw new Error(`Rhythm sharing is "${this.state}".`);
    }

    this.pausedBy.add(actorId);
    this.state = "paused";
    this.updatedAt = this.clock().toISOString();

    return this.snapshot(actorId);
  }

  resume(actorId) {
    this.#assertParticipant(actorId);
    this.#assertNotExpired();

    if (this.state !== "paused") {
      throw new Error("Rhythm sharing is not paused.");
    }

    this.pausedBy.delete(actorId);

    if (this.pausedBy.size === 0) {
      this.state = this.declarations.size === this.participantIds.length
        ? "mutually_visible"
        : "draft";
    }

    this.updatedAt = this.clock().toISOString();
    return this.snapshot(actorId);
  }

  revoke(actorId) {
    this.#assertParticipant(actorId);
    this.state = "revoked";
    this.openedBy.clear();
    this.declarations.clear();
    this.pausedBy.clear();
    this.updatedAt = this.clock().toISOString();

    return Object.freeze({
      corridorId: this.corridorId,
      state: this.state,
      reminder: "Rhythm sharing has been removed. It does not require an explanation."
    });
  }

  context(actorId) {
    this.#assertParticipant(actorId);
    this.#assertNotExpired();

    if (this.state !== "mutually_visible") {
      return Object.freeze({
        corridorId: this.corridorId,
        state: this.state,
        conversationContext: [],
        reminder: "Rhythm comparison becomes available only after both participants choose to share."
      });
    }

    const [firstId, secondId] = this.participantIds;
    const firstDeclaration = this.declarations.get(firstId);
    const secondDeclaration = this.declarations.get(secondId);

    const conversationContext = DIMENSIONS.map((dimension) => {
      const firstValue = firstDeclaration[dimension];
      const secondValue = secondDeclaration[dimension];
      const relation = relationFor(firstValue, secondValue);

      return Object.freeze({
        dimension,
        relation,
        prompt: promptFor(dimension, relation, firstValue, secondValue)
      });
    });

    return Object.freeze({
      corridorId: this.corridorId,
      state: this.state,
      conversationContext,
      reminder: "These are current preferences for discussion. They are not consent, a guarantee, or an obligation."
    });
  }

  expire(at = this.clock()) {
    if (!TERMINAL_STATES.has(this.state) && new Date(this.expiresAt) <= new Date(at)) {
      this.state = "expired";
      this.openedBy.clear();
      this.declarations.clear();
      this.pausedBy.clear();
      this.updatedAt = new Date(at).toISOString();
    }

    return this.snapshot();
  }

  snapshot(viewerId = null) {
    if (viewerId !== null) {
      this.#assertParticipant(viewerId);
    }

    return freezeClone({
      corridorId: this.corridorId,
      state: this.state,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      openedByCount: this.openedBy.size,
      declarationCount: this.declarations.size,
      reminder: "Rhythm sharing is optional, revocable, and separate from consent to any real-world act."
    });
  }

  #assertParticipant(actorId) {
    const normalizedActorId = assertNonEmptyString(actorId, "actorId");

    if (!this.participantIds.includes(normalizedActorId)) {
      throw new Error("Only a corridor participant may use rhythm sharing.");
    }
  }

  #assertNotExpired() {
    if (new Date(this.expiresAt) <= new Date(this.clock())) {
      this.state = "expired";
      this.openedBy.clear();
      this.declarations.clear();
      this.pausedBy.clear();
      this.updatedAt = this.clock().toISOString();
      throw new Error("Rhythm sharing has expired.");
    }
  }

  #assertOpenForSharing() {
    this.#assertNotExpired();

    if (!["draft", "mutually_visible"].includes(this.state)) {
      throw new Error("Both participants must open rhythm sharing before declaring preferences.");
    }
  }
}
