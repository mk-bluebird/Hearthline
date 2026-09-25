const MESH_STATES = Object.freeze([
  "unavailable",
  "pending_a",
  "pending_b",
  "mutual_active",
  "revoked",
  "expired"
]);

const REMINDER_VERSION = "hearthline-noncommercial-reminder-v1";
const MAXIMUM_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

function assertNonEmptyString(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${name} must be a non-empty string.`);
  }

  return value.trim();
}

function normalizeParticipantIds(participantIds) {
  if (!Array.isArray(participantIds) || participantIds.length !== 2) {
    throw new TypeError("participantIds must contain exactly two values.");
  }

  const normalized = [...new Set(
    participantIds.map((participantId) =>
      assertNonEmptyString(participantId, "participantIds")
    )
  )];

  if (normalized.length !== 2) {
    throw new RangeError("participantIds must contain two distinct values.");
  }

  return Object.freeze(normalized);
}

function normalizeExpiry(expiresAt, now) {
  const expiry = new Date(assertNonEmptyString(expiresAt, "expiresAt"));

  if (Number.isNaN(expiry.valueOf())) {
    throw new RangeError("expiresAt must be a valid ISO-8601 date-time.");
  }

  if (expiry <= now) {
    throw new RangeError("expiresAt must be in the future.");
  }

  if (expiry.valueOf() - now.valueOf() > MAXIMUM_LIFETIME_MS) {
    throw new RangeError("The non-commercial reminder cannot remain active longer than seven days.");
  }

  return expiry.toISOString();
}

function freezeClone(value) {
  return Object.freeze(structuredClone(value));
}

export class NonCommercialAttestationMesh {
  #clock;
  #participantSelections = new Map();
  #revokedAt = null;

  constructor({
    meetingPlanId,
    participantIds,
    expiresAt,
    clock = () => new Date()
  }) {
    if (typeof clock !== "function") {
      throw new TypeError("clock must be a function.");
    }

    this.#clock = clock;
    this.meetingPlanId = assertNonEmptyString(meetingPlanId, "meetingPlanId");
    this.participantIds = normalizeParticipantIds(participantIds);
    this.createdAt = this.#clock().toISOString();
    this.expiresAt = normalizeExpiry(expiresAt, this.#clock());
    this.updatedAt = this.createdAt;
  }

  selectReminder(actorId) {
    this.#assertParticipant(actorId);
    this.#assertActiveWindow();

    const selectedAt = this.#clock().toISOString();

    this.#participantSelections.set(actorId, Object.freeze({
      selectedAt,
      reminderVersion: REMINDER_VERSION
    }));

    this.#revokedAt = null;
    this.updatedAt = selectedAt;

    return this.viewFor(actorId);
  }

  revokeReminder(actorId) {
    this.#assertParticipant(actorId);

    if (this.#isExpired()) {
      return this.viewFor(actorId);
    }

    this.#participantSelections.delete(actorId);
    this.#revokedAt = this.#clock().toISOString();
    this.updatedAt = this.#revokedAt;

    return this.viewFor(actorId);
  }

  viewFor(actorId) {
    this.#assertParticipant(actorId);
    this.#expireIfNeeded();

    const state = this.#state();

    return freezeClone({
      meetingPlanId: this.meetingPlanId,
      state,
      expiresAt: this.expiresAt,
      reminderVersion: REMINDER_VERSION,
      mutualSelectionActive: state === "mutual_active",
      externalActionAuthorized: false,
      reminder: "This is a mutual non-commercial meeting reminder. It is not a contract, legal advice, proof of consent, proof of intent, or permission for any future activity. Either person may change plans, pause, leave, or withdraw at any time."
    });
  }

  deleteWithMeetingPlan() {
    this.#participantSelections.clear();
    this.#revokedAt = this.#clock().toISOString();
    this.updatedAt = this.#revokedAt;

    return Object.freeze({
      meetingPlanId: this.meetingPlanId,
      deletedAt: this.updatedAt,
      contentRetained: false
    });
  }

  #state() {
    if (this.#isExpired()) {
      return "expired";
    }

    const selectionCount = this.#participantSelections.size;

    if (selectionCount === 2) {
      return "mutual_active";
    }

    if (selectionCount === 1) {
      const [firstParticipantId, secondParticipantId] = this.participantIds;

      return this.#participantSelections.has(firstParticipantId)
        ? "pending_a"
        : "pending_b";
    }

    return this.#revokedAt ? "revoked" : "unavailable";
  }

  #assertParticipant(actorId) {
    const normalizedActorId = assertNonEmptyString(actorId, "actorId");

    if (!this.participantIds.includes(normalizedActorId)) {
      throw new Error("Only a meeting-plan participant may use this reminder.");
    }
  }

  #assertActiveWindow() {
    this.#expireIfNeeded();

    if (this.#isExpired()) {
      throw new Error("The meeting-plan reminder has expired.");
    }
  }

  #isExpired() {
    return new Date(this.expiresAt) <= this.#clock();
  }

  #expireIfNeeded() {
    if (this.#isExpired()) {
      this.#participantSelections.clear();
      this.#revokedAt = null;
      this.updatedAt = this.#clock().toISOString();
    }
  }
}
