const PREFERENCE_CATEGORIES = Object.freeze([
  "okay_to_discuss_here",
  "please_keep_private",
  "temporary_context",
  "not_discussing",
  "prefer_not_to_label"
]);

const TOPIC_TYPES = Object.freeze([
  "profile_information",
  "photos_or_media",
  "conversation_excerpt",
  "meeting_plan_context",
  "contact_details",
  "personal_story",
  "privacy_preference",
  "no_topic_selected"
]);

const STATES = Object.freeze([
  "private_draft",
  "share_requested",
  "mutually_visible",
  "paused",
  "revoked",
  "expired",
  "deleted"
]);

const TERMINAL_STATES = new Set([
  "revoked",
  "expired",
  "deleted"
]);

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

function normalizeExpiry(expiresAt) {
  const parsed = new Date(assertNonEmptyString(expiresAt, "expiresAt"));

  if (Number.isNaN(parsed.valueOf())) {
    throw new RangeError("expiresAt must be a valid ISO-8601 date-time.");
  }

  return parsed.toISOString();
}

function freezeClone(value) {
  return Object.freeze(structuredClone(value));
}

export class DiscretionEnvelope {
  #clock;
  #declarations = new Map();
  #state = "private_draft";

  constructor({
    envelopeId,
    participantIds,
    expiresAt,
    clock = () => new Date()
  }) {
    if (typeof clock !== "function") {
      throw new TypeError("clock must be a function.");
    }

    if (!Array.isArray(participantIds) || participantIds.length !== 2) {
      throw new TypeError("participantIds must contain exactly two participants.");
    }

    this.#clock = clock;
    this.envelopeId = assertNonEmptyString(envelopeId, "envelopeId");
    this.participantIds = [...new Set(
      participantIds.map((participantId) =>
        assertNonEmptyString(participantId, "participantIds")
      )
    )];

    if (this.participantIds.length !== 2) {
      throw new RangeError("participantIds must contain two distinct values.");
    }

    this.expiresAt = normalizeExpiry(expiresAt);
    this.createdAt = this.#clock().toISOString();
    this.updatedAt = this.createdAt;
  }

  sharePreference(actorId, {
    topic,
    preference
  }) {
    this.#assertParticipant(actorId);
    this.#assertActive();

    const declaration = Object.freeze({
      topic: assertOneOf(topic, TOPIC_TYPES, "topic"),
      preference: assertOneOf(
        preference,
        PREFERENCE_CATEGORIES,
        "preference"
      ),
      updatedAt: this.#clock().toISOString()
    });

    this.#declarations.set(actorId, declaration);
    this.updatedAt = declaration.updatedAt;

    if (this.#declarations.size === 1) {
      this.#state = "share_requested";
    }

    if (this.#declarations.size === this.participantIds.length) {
      this.#state = "mutually_visible";
    }

    return this.snapshot(actorId);
  }

  pause(actorId) {
    this.#assertParticipant(actorId);
    this.#assertActive();

    this.#state = "paused";
    this.updatedAt = this.#clock().toISOString();

    return this.snapshot(actorId);
  }

  resume(actorId) {
    this.#assertParticipant(actorId);
    this.#assertActive();

    if (this.#state !== "paused") {
      throw new Error("The discretion envelope is not paused.");
    }

    this.#state = this.#declarations.size === this.participantIds.length
      ? "mutually_visible"
      : "share_requested";

    this.updatedAt = this.#clock().toISOString();
    return this.snapshot(actorId);
  }

  revoke(actorId) {
    this.#assertParticipant(actorId);

    this.#declarations.delete(actorId);
    this.#state = "revoked";
    this.updatedAt = this.#clock().toISOString();

    return Object.freeze({
      envelopeId: this.envelopeId,
      state: this.#state,
      reminder:
        "Your private sharing preference has been removed from ordinary Hearthline access. No explanation is required."
    });
  }

  delete(actorId) {
    this.#assertParticipant(actorId);

    this.#declarations.clear();
    this.#state = "deleted";
    this.updatedAt = this.#clock().toISOString();

    return Object.freeze({
      envelopeId: this.envelopeId,
      state: this.#state,
      deletedAt: this.updatedAt
    });
  }

  context(actorId) {
    this.#assertParticipant(actorId);
    this.#assertActive();

    if (this.#state !== "mutually_visible") {
      return Object.freeze({
        envelopeId: this.envelopeId,
        state: this.#state,
        context: [],
        reminder:
          "Private sharing context appears only when both participants choose to share a current preference."
      });
    }

    const declarations = [...this.#declarations.values()];

    return Object.freeze({
      envelopeId: this.envelopeId,
      state: this.#state,
      context: declarations.map((declaration) => ({
        topic: declaration.topic,
        preference: declaration.preference
      })),
      reminder:
        "These are current privacy preferences, not a confidentiality contract, consent record, legal agreement, or restriction on reporting, blocking, seeking support, or leaving."
    });
  }

  snapshot(actorId) {
    this.#assertParticipant(actorId);
    this.#expireIfNeeded();

    return freezeClone({
      envelopeId: this.envelopeId,
      state: this.#state,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      declarationCount: this.#declarations.size,
      reminder:
        "Hearthline can limit ordinary in-platform access after expiry or revocation. It cannot guarantee that another person did not copy, screenshot, remember, or share information outside the platform."
    });
  }

  #assertParticipant(actorId) {
    const normalizedActorId = assertNonEmptyString(actorId, "actorId");

    if (!this.participantIds.includes(normalizedActorId)) {
      throw new Error("Only an envelope participant may use this object.");
    }
  }

  #assertActive() {
    this.#expireIfNeeded();

    if (TERMINAL_STATES.has(this.#state)) {
      throw new Error(`This discretion envelope is "${this.#state}".`);
    }
  }

  #expireIfNeeded() {
    if (new Date(this.expiresAt) <= this.#clock()) {
      this.#declarations.clear();
      this.#state = "expired";
      this.updatedAt = this.#clock().toISOString();
    }
  }
}
