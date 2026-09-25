const CARTOGRAPHY_RETENTION_MODES = Object.freeze([
  "disabled",
  "session_only",
  "local_expiring",
  "until_deleted",
  "export_only"
]);

const CARTOGRAPHY_THEMES = Object.freeze([
  "connection",
  "affection",
  "intimacy_discussion",
  "pace",
  "boundary",
  "curiosity",
  "aftercare",
  "privacy",
  "rest",
  "prefer_not_to_label"
]);

const CONVERSATION_DIMENSIONS = Object.freeze({
  discussionReadiness: Object.freeze([
    "open_to_discuss",
    "not_discussing_yet",
    "prefer_text_first",
    "prefer_in_person_check_in"
  ]),
  pace: Object.freeze([
    "unhurried",
    "flexible",
    "direct",
    "exploratory",
    "not_discussing_yet"
  ]),
  affectionDiscussion: Object.freeze([
    "ask_first",
    "slow_to_start",
    "check_in_often",
    "not_discussing_yet"
  ]),
  boundaryStyle: Object.freeze([
    "direct_questions_welcome",
    "prefer_gentle_check_in",
    "prefer_to_raise_myself",
    "not_discussing_yet"
  ]),
  saferSexConversation: Object.freeze([
    "talk_before_meeting",
    "talk_before_intimacy",
    "private_discussion_only",
    "not_discussing_yet"
  ]),
  aftercarePreference: Object.freeze([
    "brief_check_in",
    "quiet_departure_ok",
    "next_day_message",
    "discuss_together",
    "not_discussing_yet"
  ]),
  privacyPreference: Object.freeze([
    "no_photos",
    "no_saved_content",
    "keep_in_app",
    "discuss_together",
    "not_discussing_yet"
  ]),
  substanceBoundary: Object.freeze([
    "substance_free_meet",
    "low_substance_preferred",
    "discuss_together",
    "not_discussing_yet"
  ])
});

const MAXIMUM_LOCAL_TEXT_LENGTH = 2400;

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

function normalizeOptionalText(value, fieldName) {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value !== "string") {
    throw new TypeError(`${fieldName} must be a string when provided.`);
  }

  if (value.length > MAXIMUM_LOCAL_TEXT_LENGTH) {
    throw new RangeError(
      `${fieldName} cannot exceed ${MAXIMUM_LOCAL_TEXT_LENGTH} characters.`
    );
  }

  return value;
}

function normalizeOptionalExpiry(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.valueOf())) {
    throw new RangeError("expiresAt must be a valid ISO-8601 date-time.");
  }

  return parsed.toISOString();
}

function normalizeDeclaration(declaration) {
  if (declaration === null || typeof declaration !== "object" || Array.isArray(declaration)) {
    throw new TypeError("declaration must be an object.");
  }

  const normalized = {};

  for (const [dimension, allowedValues] of Object.entries(CONVERSATION_DIMENSIONS)) {
    const value = declaration[dimension];

    if (value !== undefined) {
      normalized[dimension] = assertOneOf(
        value,
        allowedValues,
        `declaration.${dimension}`
      );
    }
  }

  if (Object.keys(normalized).length === 0) {
    throw new Error("declaration must include at least one selected dimension.");
  }

  return Object.freeze(normalized);
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

function promptFor(dimension, relation) {
  const labels = Object.freeze({
    discussionReadiness: "discussion readiness",
    pace: "pace",
    affectionDiscussion: "affection discussion",
    boundaryStyle: "boundary conversation style",
    saferSexConversation: "safer-sex conversation",
    aftercarePreference: "follow-up preference",
    privacyPreference: "privacy preference",
    substanceBoundary: "substance boundary"
  });

  const label = labels[dimension];

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

function freezeClone(value) {
  return Object.freeze(structuredClone(value));
}

export class DesireCartography {
  #clock;
  #entries = new Map();

  constructor({ clock = () => new Date() } = {}) {
    if (typeof clock !== "function") {
      throw new TypeError("clock must be a function.");
    }

    this.#clock = clock;
  }

  create({
    entryId,
    dateLabel = "",
    selfAuthoredNote = "",
    theme = "prefer_not_to_label",
    boundaryNote = "",
    curiosityNote = "",
    privateReminder = "",
    retentionMode = "session_only",
    expiresAt = null
  }) {
    const normalizedRetention = assertOneOf(
      retentionMode,
      CARTOGRAPHY_RETENTION_MODES,
      "retentionMode"
    );

    if (normalizedRetention === "disabled") {
      return Object.freeze({
        saved: false,
        localOnly: true,
        networkDisabled: true,
        reminder: "Private mapping is disabled. Nothing was stored."
      });
    }

    const normalizedEntryId = assertNonEmptyString(entryId, "entryId");

    if (this.#entries.has(normalizedEntryId)) {
      throw new Error(`A private map entry already exists for "${normalizedEntryId}".`);
    }

    const normalizedExpiry = normalizeOptionalExpiry(expiresAt);

    if (normalizedRetention === "local_expiring" && normalizedExpiry === null) {
      throw new Error("local_expiring entries require expiresAt.");
    }

    if (normalizedRetention !== "local_expiring" && normalizedExpiry !== null) {
      throw new Error("expiresAt is permitted only for local_expiring entries.");
    }

    const entry = Object.freeze({
      entryId: normalizedEntryId,
      dateLabel: normalizeOptionalText(dateLabel, "dateLabel"),
      selfAuthoredNote: normalizeOptionalText(
        selfAuthoredNote,
        "selfAuthoredNote"
      ),
      theme: assertOneOf(theme, CARTOGRAPHY_THEMES, "theme"),
      boundaryNote: normalizeOptionalText(boundaryNote, "boundaryNote"),
      curiosityNote: normalizeOptionalText(curiosityNote, "curiosityNote"),
      privateReminder: normalizeOptionalText(
        privateReminder,
        "privateReminder"
      ),
      createdAt: this.#clock().toISOString(),
      expiresAt: normalizedExpiry,
      localOnly: true,
      networkDisabled: true,
      counterpartReference: null,
      profileReference: null,
      corridorReference: null,
      encounterReference: null,
      exportOnlyByUser: true
    });

    if (normalizedRetention === "export_only") {
      return Object.freeze({
        saved: false,
        localOnly: true,
        networkDisabled: true,
        exportPayload: JSON.stringify(entry, null, 2),
        reminder:
          "This export is user-controlled. Hearthline does not retain a copy."
      });
    }

    this.#entries.set(entry.entryId, entry);

    return this.summary(entry.entryId);
  }

  read(entryId) {
    return freezeClone(this.#requireActiveEntry(entryId));
  }

  summary(entryId) {
    const entry = this.#requireActiveEntry(entryId);

    return freezeClone({
      entryId: entry.entryId,
      createdAt: entry.createdAt,
      expiresAt: entry.expiresAt,
      localOnly: true,
      networkDisabled: true,
      reminder:
        "This is your private map. Hearthline does not receive it, compare it, score it, or use it for discovery."
    });
  }

  delete(entryId) {
    const normalizedEntryId = assertNonEmptyString(entryId, "entryId");
    const deleted = this.#entries.delete(normalizedEntryId);

    return Object.freeze({
      entryId: normalizedEntryId,
      deleted,
      deletedAt: this.#clock().toISOString(),
      localOnly: true,
      networkDisabled: true
    });
  }

  clearAll() {
    const deletedCount = this.#entries.size;
    this.#entries.clear();

    return Object.freeze({
      deletedCount,
      deletedAt: this.#clock().toISOString(),
      localOnly: true,
      networkDisabled: true
    });
  }

  #requireActiveEntry(entryId) {
    const normalizedEntryId = assertNonEmptyString(entryId, "entryId");
    const entry = this.#entries.get(normalizedEntryId);

    if (!entry) {
      throw new Error(`No private map entry exists for "${normalizedEntryId}".`);
    }

    if (
      entry.expiresAt !== null &&
      new Date(entry.expiresAt) <= this.#clock()
    ) {
      this.#entries.delete(normalizedEntryId);
      throw new Error(`Private map entry "${normalizedEntryId}" has expired.`);
    }

    return entry;
  }
}

export class MutualPreferenceConversation {
  #clock;
  #openedBy = new Set();
  #declarations = new Map();
  #pausedBy = new Set();
  #state = "unavailable";

  constructor({
    conversationId,
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
    this.conversationId = assertNonEmptyString(conversationId, "conversationId");
    this.participantIds = [...new Set(
      participantIds.map((participantId) =>
        assertNonEmptyString(participantId, "participantIds")
      )
    )];

    if (this.participantIds.length !== 2) {
      throw new RangeError("participantIds must contain two distinct values.");
    }

    this.expiresAt = normalizeOptionalExpiry(expiresAt);

    if (this.expiresAt === null) {
      throw new Error("Mutual preference conversation requires expiresAt.");
    }

    this.createdAt = this.#clock().toISOString();
    this.updatedAt = this.createdAt;
  }

  open(actorId) {
    this.#assertParticipant(actorId);
    this.#assertNotExpired();
    this.#assertNotTerminal();

    this.#openedBy.add(actorId);
    this.updatedAt = this.#clock().toISOString();

    if (this.#openedBy.size === this.participantIds.length) {
      this.#state = "draft";
    }

    return this.snapshot(actorId);
  }

  share(actorId, declaration) {
    this.#assertParticipant(actorId);
    this.#assertNotExpired();
    this.#assertNotTerminal();

    if (this.#state !== "draft" && this.#state !== "mutually_visible") {
      throw new Error(
        "Both participants must open the private preference conversation before sharing."
      );
    }

    this.#declarations.set(actorId, normalizeDeclaration(declaration));
    this.updatedAt = this.#clock().toISOString();

    if (this.#declarations.size === this.participantIds.length) {
      this.#state = "mutually_visible";
    }

    return this.snapshot(actorId);
  }

  pause(actorId) {
    this.#assertParticipant(actorId);
    this.#assertNotExpired();
    this.#assertNotTerminal();

    this.#pausedBy.add(actorId);
    this.#state = "paused";
    this.updatedAt = this.#clock().toISOString();

    return this.snapshot(actorId);
  }

  resume(actorId) {
    this.#assertParticipant(actorId);
    this.#assertNotExpired();
    this.#assertNotTerminal();

    if (this.#state !== "paused") {
      throw new Error("The conversation is not paused.");
    }

    this.#pausedBy.delete(actorId);

    if (this.#pausedBy.size === 0) {
      this.#state = this.#declarations.size === this.participantIds.length
        ? "mutually_visible"
        : "draft";
    }

    this.updatedAt = this.#clock().toISOString();

    return this.snapshot(actorId);
  }

  revoke(actorId) {
    this.#assertParticipant(actorId);

    this.#openedBy.clear();
    this.#declarations.clear();
    this.#pausedBy.clear();
    this.#state = "revoked";
    this.updatedAt = this.#clock().toISOString();

    return Object.freeze({
      conversationId: this.conversationId,
      state: this.#state,
      reminder:
        "Private preference sharing has been removed. No explanation is required."
    });
  }

  context(actorId) {
    this.#assertParticipant(actorId);
    this.#assertNotExpired();

    if (this.#state !== "mutually_visible") {
      return Object.freeze({
        conversationId: this.conversationId,
        state: this.#state,
        context: [],
        reminder:
          "Conversation context becomes available only after both participants choose to share selected preferences."
      });
    }

    const [firstId, secondId] = this.participantIds;
    const firstDeclaration = this.#declarations.get(firstId);
    const secondDeclaration = this.#declarations.get(secondId);

    const context = Object.keys(CONVERSATION_DIMENSIONS).map((dimension) => {
      const relation = relationFor(
        firstDeclaration[dimension],
        secondDeclaration[dimension]
      );

      return Object.freeze({
        dimension,
        relation,
        prompt: promptFor(dimension, relation)
      });
    });

    return Object.freeze({
      conversationId: this.conversationId,
      state: this.#state,
      context,
      reminder:
        "These are current discussion preferences. They are not a score, consent, a promise, or a requirement to meet or continue."
    });
  }

  snapshot(actorId) {
    this.#assertParticipant(actorId);
    this.#expireIfNeeded();

    return freezeClone({
      conversationId: this.conversationId,
      state: this.#state,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      openedByCount: this.#openedBy.size,
      declarationCount: this.#declarations.size,
      localReminder:
        "You can pause, remove a shared preference, revoke this conversation, or change your mind at any time. No application state represents consent to a real-world act."
    });
  }

  #assertParticipant(actorId) {
    const normalizedActorId = assertNonEmptyString(actorId, "actorId");

    if (!this.participantIds.includes(normalizedActorId)) {
      throw new Error(
        "Only a participant in this private conversation may use this object."
      );
    }
  }

  #assertNotTerminal() {
    if (this.#state === "revoked" || this.#state === "expired") {
      throw new Error(`This conversation is "${this.#state}".`);
    }
  }

  #assertNotExpired() {
    this.#expireIfNeeded();

    if (this.#state === "expired") {
      throw new Error("This private preference conversation has expired.");
    }
  }

  #expireIfNeeded() {
    if (new Date(this.expiresAt) <= this.#clock()) {
      this.#openedBy.clear();
      this.#declarations.clear();
      this.#pausedBy.clear();
      this.#state = "expired";
      this.updatedAt = this.#clock().toISOString();
    }
  }
}
