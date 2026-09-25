const APERTURE_BANDS = Object.freeze([
  "weekday_daytime",
  "weekday_evening",
  "weekend_morning",
  "weekend_afternoon",
  "weekend_evening",
  "late_night",
  "variable",
  "on_call",
  "flexible",
  "virtual_first"
]);

const STAIR_STATES = Object.freeze([
  "greeting",
  "conversation",
  "public_meet",
  "private_planning",
  "affection_discussion",
  "intimacy_discussion",
  "real_world_check_in",
  "paused",
  "withdrawn",
  "archived",
  "expired"
]);

const TERMINAL_STAIR_STATES = new Set([
  "withdrawn",
  "archived",
  "expired"
]);

const TRANSITION_TARGETS = Object.freeze({
  greeting: ["conversation"],
  conversation: ["public_meet", "intimacy_discussion"],
  public_meet: [
    "private_planning",
    "affection_discussion",
    "intimacy_discussion"
  ],
  private_planning: ["real_world_check_in"],
  affection_discussion: ["intimacy_discussion", "real_world_check_in"],
  intimacy_discussion: ["real_world_check_in"],
  real_world_check_in: ["archived"],
  paused: ["conversation"],
  withdrawn: [],
  archived: [],
  expired: []
});

function assertNonEmptyString(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${name} must be a non-empty string.`);
  }

  return value.trim();
}

function assertOneOf(value, allowedValues, name) {
  if (!allowedValues.includes(value)) {
    throw new RangeError(`${name} must be one of: ${allowedValues.join(", ")}.`);
  }

  return value;
}

function normalizeUniqueList(values, name) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new TypeError(`${name} must contain at least one item.`);
  }

  return [...new Set(values.map((value) => assertNonEmptyString(value, name)))];
}

function normalizeIsoDate(value, name) {
  const date = new Date(assertNonEmptyString(value, name));

  if (Number.isNaN(date.valueOf())) {
    throw new RangeError(`${name} must be a valid ISO-8601 date-time.`);
  }

  return date.toISOString();
}

function freezeClone(value) {
  return Object.freeze(structuredClone(value));
}

export class EncounterAperture {
  constructor({
    ownerId,
    bands,
    expiresAt,
    clock = () => new Date()
  }) {
    this.clock = clock;
    this.ownerId = assertNonEmptyString(ownerId, "ownerId");
    this.bands = normalizeUniqueList(bands, "bands").map((band) =>
      assertOneOf(band, APERTURE_BANDS, "bands")
    );
    this.expiresAt = normalizeIsoDate(expiresAt, "expiresAt");
    this.createdAt = this.clock().toISOString();
    this.revokedAt = null;
  }

  isActive(at = this.clock()) {
    return this.revokedAt === null && new Date(this.expiresAt) > new Date(at);
  }

  overlaps(otherAperture, at = this.clock()) {
    if (!(otherAperture instanceof EncounterAperture)) {
      throw new TypeError("otherAperture must be an EncounterAperture.");
    }

    if (!this.isActive(at) || !otherAperture.isActive(at)) {
      return Object.freeze({
        contextAvailable: false,
        explanation: "No active broad-availability context is available."
      });
    }

    const sharedBand = this.bands.find((band) => otherAperture.bands.includes(band));

    if (!sharedBand) {
      return Object.freeze({
        contextAvailable: false,
        explanation: "No broad availability overlap is currently declared."
      });
    }

    return Object.freeze({
      contextAvailable: true,
      explanation: this.#describeBand(sharedBand),
      sharedBandCount: 1
    });
  }

  revoke(actorId) {
    const normalizedActorId = assertNonEmptyString(actorId, "actorId");

    if (normalizedActorId !== this.ownerId) {
      throw new Error("Only the aperture owner may revoke this object.");
    }

    this.revokedAt = this.clock().toISOString();
    return this.snapshot();
  }

  snapshot() {
    return freezeClone({
      ownerId: this.ownerId,
      bands: [...this.bands],
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
      revokedAt: this.revokedAt
    });
  }

  #describeBand(band) {
    const descriptions = Object.freeze({
      weekday_daytime: "You both sometimes prefer weekday daytime planning.",
      weekday_evening: "You both sometimes prefer weekday evening planning.",
      weekend_morning: "You both sometimes prefer weekend morning planning.",
      weekend_afternoon: "You both sometimes prefer weekend afternoon planning.",
      weekend_evening: "You both sometimes prefer weekend evening planning.",
      late_night: "You both sometimes prefer late-night planning.",
      variable: "You both selected variable availability.",
      on_call: "You both selected flexible planning around changing availability.",
      flexible: "You both selected flexible planning.",
      virtual_first: "You both selected virtual-first planning."
    });

    return descriptions[band];
  }
}

export class ConsentStair {
  constructor({
    stairId,
    participantIds,
    expiresAt,
    clock = () => new Date()
  }) {
    this.clock = clock;
    this.stairId = assertNonEmptyString(stairId, "stairId");
    this.participantIds = normalizeUniqueList(participantIds, "participantIds");

    if (this.participantIds.length !== 2) {
      throw new RangeError("ConsentStair requires exactly two participants.");
    }

    this.expiresAt = normalizeIsoDate(expiresAt, "expiresAt");
    this.state = "greeting";
    this.pendingRequest = null;
    this.createdAt = this.clock().toISOString();
    this.updatedAt = this.createdAt;
    this.history = [];
  }

  requestStep(actorId, targetState, note = "Would you like to discuss this next step?") {
    this.#assertParticipant(actorId);
    this.#assertOpen();
    assertOneOf(targetState, STAIR_STATES, "targetState");

    if (!TRANSITION_TARGETS[this.state].includes(targetState)) {
      throw new Error(
        `Cannot request transition from "${this.state}" to "${targetState}".`
      );
    }

    if (this.pendingRequest) {
      throw new Error("A transition request is already pending.");
    }

    const request = Object.freeze({
      requestId: `${this.stairId}:${targetState}:${this.updatedAt}`,
      actorId,
      targetState,
      note: assertNonEmptyString(note, "note"),
      requestedAt: this.clock().toISOString(),
      expiresAt: new Date(
        Math.min(
          new Date(this.expiresAt).valueOf(),
          new Date(this.clock()).valueOf() + 72 * 60 * 60 * 1000
        )
      ).toISOString()
    });

    this.pendingRequest = request;
    this.updatedAt = request.requestedAt;
    this.history.push({
      at: request.requestedAt,
      type: "step_requested",
      targetState
    });

    return freezeClone(request);
  }

  respondToStep(actorId, response) {
    this.#assertParticipant(actorId);
    this.#assertOpen();

    if (!this.pendingRequest) {
      throw new Error("No transition request is pending.");
    }

    if (this.pendingRequest.actorId === actorId) {
      throw new Error("A participant cannot respond to their own request.");
    }

    if (!["accept", "decline"].includes(response)) {
      throw new RangeError('response must be either "accept" or "decline".');
    }

    const responseAt = this.clock().toISOString();
    const request = this.pendingRequest;
    this.pendingRequest = null;

    if (response === "decline") {
      this.updatedAt = responseAt;
      this.history.push({
        at: responseAt,
        type: "step_declined",
        targetState: request.targetState
      });

      return freezeClone({
        stairId: this.stairId,
        state: this.state,
        result: "declined"
      });
    }

    this.state = request.targetState;
    this.updatedAt = responseAt;
    this.history.push({
      at: responseAt,
      type: "step_entered",
      targetState: this.state
    });

    return freezeClone({
      stairId: this.stairId,
      state: this.state,
      result: "accepted",
      reminder: "This state supports discussion and planning only. Check in again in person."
    });
  }

  pause(actorId) {
    this.#assertParticipant(actorId);
    this.#assertOpen();
    this.state = "paused";
    this.pendingRequest = null;
    this.updatedAt = this.clock().toISOString();
    this.history.push({
      at: this.updatedAt,
      type: "paused"
    });

    return this.snapshot();
  }

  withdraw(actorId) {
    this.#assertParticipant(actorId);

    if (TERMINAL_STAIR_STATES.has(this.state)) {
      throw new Error(`ConsentStair is already "${this.state}".`);
    }

    this.state = "withdrawn";
    this.pendingRequest = null;
    this.updatedAt = this.clock().toISOString();
    this.history.push({
      at: this.updatedAt,
      type: "withdrawn"
    });

    return freezeClone({
      stairId: this.stairId,
      state: this.state,
      reminder: "Withdrawal ends this planning tool. It does not require an explanation."
    });
  }

  expire(at = this.clock()) {
    if (TERMINAL_STAIR_STATES.has(this.state)) {
      return this.snapshot();
    }

    if (new Date(this.expiresAt) <= new Date(at)) {
      this.state = "expired";
      this.pendingRequest = null;
      this.updatedAt = new Date(at).toISOString();
      this.history.push({
        at: this.updatedAt,
        type: "expired"
      });
    }

    return this.snapshot();
  }

  snapshot() {
    return freezeClone({
      stairId: this.stairId,
      participantIds: [...this.participantIds],
      state: this.state,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      pendingRequest: this.pendingRequest
        ? {
            targetState: this.pendingRequest.targetState,
            expiresAt: this.pendingRequest.expiresAt
          }
        : null,
      reminder: "No app state represents consent to a real-world act. Ask, listen, and check in each time."
    });
  }

  #assertParticipant(actorId) {
    const normalizedActorId = assertNonEmptyString(actorId, "actorId");

    if (!this.participantIds.includes(normalizedActorId)) {
      throw new Error("Only a ConsentStair participant may perform this action.");
    }
  }

  #assertOpen() {
    if (TERMINAL_STAIR_STATES.has(this.state)) {
      throw new Error(`ConsentStair is no longer active because it is "${this.state}".`);
    }

    if (new Date(this.expiresAt) <= new Date(this.clock())) {
      this.state = "expired";
      this.pendingRequest = null;
      this.updatedAt = this.clock().toISOString();
      throw new Error("ConsentStair has expired.");
    }
  }
}
