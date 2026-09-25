const DIALOGUE_DIMENSIONS = Object.freeze({
  discussionReadiness: Object.freeze([
    "open_to_discuss",
    "prefer_text_first",
    "prefer_in_person_check_in",
    "not_discussing_now",
    "prefer_not_to_share"
  ]),
  barrierPreference: Object.freeze([
    "open_to_discuss",
    "prefer_to_ask_later",
    "private_discussion_only",
    "not_discussing_now",
    "prefer_not_to_share"
  ]),
  testingConversation: Object.freeze([
    "open_to_discuss_relevant_information",
    "prefer_to_ask_later",
    "private_discussion_only",
    "not_discussing_now",
    "prefer_not_to_share"
  ]),
  comfortLevel: Object.freeze([
    "direct_questions_welcome",
    "prefer_gentle_check_in",
    "prefer_to_raise_myself",
    "not_discussing_now",
    "prefer_not_to_share"
  ]),
  privacyPreference: Object.freeze([
    "keep_in_app",
    "discuss_later",
    "prefer_in_person_check_in",
    "not_discussing_now",
    "prefer_not_to_share"
  ]),
  substanceBoundary: Object.freeze([
    "substance_free_preferred",
    "lower_substance_preferred",
    "discuss_together",
    "not_discussing_now",
    "prefer_not_to_share"
  ])
});

const RELATION_VALUES = Object.freeze([
  "shared",
  "different",
  "not_shared",
  "not_discussing"
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

function normalizeDeclaration(declaration) {
  if (
    declaration === null ||
    typeof declaration !== "object" ||
    Array.isArray(declaration)
  ) {
    throw new TypeError("declaration must be an object.");
  }

  const normalized = {};

  for (const [dimension, allowedValues] of Object.entries(DIALOGUE_DIMENSIONS)) {
    if (declaration[dimension] !== undefined) {
      normalized[dimension] = assertOneOf(
        declaration[dimension],
        allowedValues,
        `declaration.${dimension}`
      );
    }
  }

  if (Object.keys(normalized).length === 0) {
    throw new Error("declaration must contain at least one optional prompt response.");
  }

  return Object.freeze(normalized);
}

function relationFor(firstValue, secondValue) {
  if (firstValue === undefined || secondValue === undefined) {
    return "not_shared";
  }

  if (
    firstValue === "not_discussing_now" ||
    firstValue === "prefer_not_to_share" ||
    secondValue === "not_discussing_now" ||
    secondValue === "prefer_not_to_share"
  ) {
    return "not_discussing";
  }

  return firstValue === secondValue ? "shared" : "different";
}

function promptFor(dimension, relation) {
  const labels = Object.freeze({
    discussionReadiness: "conversation readiness",
    barrierPreference: "barrier or protection preferences",
    testingConversation: "health-information conversation preferences",
    comfortLevel: "conversation style",
    privacyPreference: "privacy preferences",
    substanceBoundary: "substance boundary"
  });

  const label = labels[dimension];

  if (relation === "shared") {
    return `You both selected the same ${label} preference.`;
  }

  if (relation === "different") {
    return `You selected different ${label} preferences. You may discuss what feels comfortable, pause, or leave this topic.`;
  }

  if (relation === "not_discussing") {
    return `One or both of you are not discussing ${label} preferences right now.`;
  }

  return `One or both of you have not shared a ${label} preference.`;
}

function freezeClone(value) {
  return Object.freeze(structuredClone(value));
}

export class SexualHealthDialogueBridge {
  #clock;
  #openedBy = new Set();
  #declarations = new Map();
  #state = "not_opened";

  constructor({
    dialogueId,
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
    this.dialogueId = assertNonEmptyString(dialogueId, "dialogueId");
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

  open(actorId) {
    this.#assertParticipant(actorId);
    this.#assertActive();

    this.#openedBy.add(actorId);
    this.updatedAt = this.#clock().toISOString();

    if (this.#openedBy.size === this.participantIds.length) {
      this.#state = "mutual_opening";
    }

    return this.snapshot(actorId);
  }

  share(actorId, declaration) {
    this.#assertParticipant(actorId);
    this.#assertActive();

    if (!["mutual_opening", "private_prompt_exchange"].includes(this.#state)) {
      throw new Error("Both participants must open the dialogue before sharing prompts.");
    }

    this.#declarations.set(actorId, normalizeDeclaration(declaration));
    this.updatedAt = this.#clock().toISOString();

    if (this.#declarations.size === this.participantIds.length) {
      this.#state = "private_prompt_exchange";
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

  revoke(actorId) {
    this.#assertParticipant(actorId);

    this.#openedBy.clear();
    this.#declarations.clear();
    this.#state = "revoked";
    this.updatedAt = this.#clock().toISOString();

    return Object.freeze({
      dialogueId: this.dialogueId,
      state: "revoked",
      reminder: "This private dialogue has been removed. No explanation is required."
    });
  }

  context(actorId) {
    this.#assertParticipant(actorId);
    this.#assertActive();

    if (this.#state !== "private_prompt_exchange") {
      return Object.freeze({
        dialogueId: this.dialogueId,
        state: this.#state,
        context: [],
        reminder:
          "Context becomes available only after both participants choose to share optional prompts."
      });
    }

    const [firstId, secondId] = this.participantIds;
    const firstDeclaration = this.#declarations.get(firstId);
    const secondDeclaration = this.#declarations.get(secondId);

    const context = Object.keys(DIALOGUE_DIMENSIONS).map((dimension) => {
      const relation = relationFor(
        firstDeclaration[dimension],
        secondDeclaration[dimension]
      );

      return Object.freeze({
        dimension,
        relation: assertOneOf(relation, RELATION_VALUES, "relation"),
        prompt: promptFor(dimension, relation)
      });
    });

    return Object.freeze({
      dialogueId: this.dialogueId,
      state: this.#state,
      context,
      reminder:
        "These are current conversation preferences. They are not medical advice, health verification, a consent record, a safety rating, or permission for any real-world activity."
    });
  }

  snapshot(actorId) {
    this.#assertParticipant(actorId);
    this.#expireIfNeeded();

    return freezeClone({
      dialogueId: this.dialogueId,
      state: this.#state,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      openedByCount: this.#openedBy.size,
      declarationCount: this.#declarations.size,
      reminder:
        "You do not need to share medical information, results, records, or any detail you do not want to share. You may pause, revoke, or leave at any time."
    });
  }

  #assertParticipant(actorId) {
    const normalizedActorId = assertNonEmptyString(actorId, "actorId");

    if (!this.participantIds.includes(normalizedActorId)) {
      throw new Error("Only a participant may use this private dialogue.");
    }
  }

  #assertActive() {
    this.#expireIfNeeded();

    if (this.#state === "revoked" || this.#state === "expired") {
      throw new Error(`This dialogue is "${this.#state}".`);
    }
  }

  #expireIfNeeded() {
    if (new Date(this.expiresAt) <= this.#clock()) {
      this.#openedBy.clear();
      this.#declarations.clear();
      this.#state = "expired";
      this.updatedAt = this.#clock().toISOString();
    }
  }
}
