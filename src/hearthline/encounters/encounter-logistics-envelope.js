const ARRIVAL_PREFERENCES = Object.freeze([
  "independent_arrival",
  "meet_at_venue",
  "transit_preferred",
  "virtual_first",
  "ride_may_be_discussed",
  "discuss_together"
]);

const DEPARTURE_PREFERENCES = Object.freeze([
  "independent_departure",
  "leave_when_ready",
  "transit_preferred",
  "ride_may_be_discussed",
  "discuss_together"
]);

const HOSTING_PREFERENCES = Object.freeze([
  "cannot_host",
  "public_only",
  "neutral_venue_preferred",
  "private_venue_may_be_discussed",
  "discuss_together"
]);

const VENUE_ACCESS_OPTIONS = Object.freeze([
  "public_first",
  "transit_accessible",
  "step_free",
  "quiet_space",
  "low_cost",
  "well_lit",
  "virtual_option",
  "discuss_together"
]);

const COST_BOUNDARIES = Object.freeze([
  "each_person_manages_own_costs",
  "free_activity_preferred",
  "low_cost_preferred",
  "discuss_noncommercially"
]);

const VISIBILITY_SCOPES = Object.freeze([
  "private_only",
  "reciprocal_match",
  "corridor_participant"
]);

const PROHIBITED_EXCHANGE_PATTERNS = Object.freeze([
  /\b(?:rate|rates|price|pricing|fee|fees|tip|tips|deposit|donation|allowance)\b/i,
  /\b(?:cashapp|cash app|venmo|zelle|paypal|apple pay|google pay)\b/i,
  /\b(?:bitcoin|btc|ethereum|eth|usdt|crypto|wallet address)\b/i,
  /\b(?:pay(?:ing)?|payment|compensat(?:e|ion)|valuable consideration)\b/i,
  /\b(?:ride|transport|gas money|housing|lodging|hotel|room|rent|gift|debt|loan|work|job)\b.{0,120}\b(?:for|in exchange for|if you|only if)\b.{0,120}\b(?:sex|sexual|hookup|intimacy|nudes?|obedience|submission)\b/i,
  /\b(?:sex|sexual|hookup|intimacy|nudes?|obedience|submission)\b.{0,120}\b(?:for|in exchange for|if you|only if)\b.{0,120}\b(?:ride|transport|gas money|housing|lodging|hotel|room|rent|gift|debt|loan|work|job)\b/i
]);

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

function normalizeUniqueValues(values, allowedValues, name) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new TypeError(`${name} must contain at least one value.`);
  }

  const normalized = values.map((value) => assertOneOf(value, allowedValues, name));
  return Object.freeze([...new Set(normalized)]);
}

function normalizeOptionalNote(value) {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  const normalized = assertNonEmptyString(value, "note");

  if (normalized.length > 500) {
    throw new RangeError("note cannot exceed 500 characters.");
  }

  if (PROHIBITED_EXCHANGE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    throw new Error(
      "note cannot condition money, transport, lodging, gifts, work, debt relief, or other value on intimacy, sexual activity, obedience, or submission."
    );
  }

  return normalized;
}

function freezeClone(value) {
  return Object.freeze(structuredClone(value));
}

export class EncounterLogisticsEnvelope {
  #clock;

  constructor({
    ownerId,
    arrivalPreference,
    departurePreference,
    hostingPreference,
    venueAccess,
    costBoundary,
    visibilityScope = "private_only",
    note = "",
    clock = () => new Date()
  }) {
    if (typeof clock !== "function") {
      throw new TypeError("clock must be a function.");
    }

    this.#clock = clock;
    this.ownerId = assertNonEmptyString(ownerId, "ownerId");
    this.arrivalPreference = assertOneOf(
      arrivalPreference,
      ARRIVAL_PREFERENCES,
      "arrivalPreference"
    );
    this.departurePreference = assertOneOf(
      departurePreference,
      DEPARTURE_PREFERENCES,
      "departurePreference"
    );
    this.hostingPreference = assertOneOf(
      hostingPreference,
      HOSTING_PREFERENCES,
      "hostingPreference"
    );
    this.venueAccess = normalizeUniqueValues(
      venueAccess,
      VENUE_ACCESS_OPTIONS,
      "venueAccess"
    );
    this.costBoundary = assertOneOf(
      costBoundary,
      COST_BOUNDARIES,
      "costBoundary"
    );
    this.visibilityScope = assertOneOf(
      visibilityScope,
      VISIBILITY_SCOPES,
      "visibilityScope"
    );
    this.note = normalizeOptionalNote(note);
    this.createdAt = this.#clock().toISOString();
    this.updatedAt = this.createdAt;
    this.revokedAt = null;
  }

  revise(actorId, patch) {
    this.#assertOwner(actorId);
    this.#assertActive();

    if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
      throw new TypeError("patch must be an object.");
    }

    if (patch.arrivalPreference !== undefined) {
      this.arrivalPreference = assertOneOf(
        patch.arrivalPreference,
        ARRIVAL_PREFERENCES,
        "patch.arrivalPreference"
      );
    }

    if (patch.departurePreference !== undefined) {
      this.departurePreference = assertOneOf(
        patch.departurePreference,
        DEPARTURE_PREFERENCES,
        "patch.departurePreference"
      );
    }

    if (patch.hostingPreference !== undefined) {
      this.hostingPreference = assertOneOf(
        patch.hostingPreference,
        HOSTING_PREFERENCES,
        "patch.hostingPreference"
      );
    }

    if (patch.venueAccess !== undefined) {
      this.venueAccess = normalizeUniqueValues(
        patch.venueAccess,
        VENUE_ACCESS_OPTIONS,
        "patch.venueAccess"
      );
    }

    if (patch.costBoundary !== undefined) {
      this.costBoundary = assertOneOf(
        patch.costBoundary,
        COST_BOUNDARIES,
        "patch.costBoundary"
      );
    }

    if (patch.visibilityScope !== undefined) {
      this.visibilityScope = assertOneOf(
        patch.visibilityScope,
        VISIBILITY_SCOPES,
        "patch.visibilityScope"
      );
    }

    if (patch.note !== undefined) {
      this.note = normalizeOptionalNote(patch.note);
    }

    this.updatedAt = this.#clock().toISOString();
    return this.ownerView(actorId);
  }

  shareWithCorridor(actorId, corridorId) {
    this.#assertOwner(actorId);
    this.#assertActive();

    if (this.visibilityScope !== "corridor_participant") {
      throw new Error(
        "Logistics details may be shared only when visibilityScope is corridor_participant."
      );
    }

    return freezeClone({
      corridorId: assertNonEmptyString(corridorId, "corridorId"),
      logistics: {
        arrivalPreference: this.arrivalPreference,
        departurePreference: this.departurePreference,
        hostingPreference: this.hostingPreference,
        venueAccess: [...this.venueAccess],
        costBoundary: this.costBoundary,
        note: this.note
      },
      reminders: [
        "Logistics are optional and do not create any expectation of intimacy or continued contact.",
        "Each adult may change or cancel travel and venue plans at any time.",
        "Do not use this feature to exchange money, housing, rides, gifts, work, debt relief, or other value for intimacy."
      ]
    });
  }

  revoke(actorId) {
    this.#assertOwner(actorId);

    if (this.revokedAt !== null) {
      return this.ownerView(actorId);
    }

    this.revokedAt = this.#clock().toISOString();
    this.updatedAt = this.revokedAt;

    return Object.freeze({
      revokedAt: this.revokedAt,
      reminder: "Logistics sharing has ended. It does not require an explanation."
    });
  }

  ownerView(actorId) {
    this.#assertOwner(actorId);

    return freezeClone({
      ownerId: this.ownerId,
      arrivalPreference: this.arrivalPreference,
      departurePreference: this.departurePreference,
      hostingPreference: this.hostingPreference,
      venueAccess: [...this.venueAccess],
      costBoundary: this.costBoundary,
      visibilityScope: this.visibilityScope,
      note: this.note,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      revokedAt: this.revokedAt
    });
  }

  #assertOwner(actorId) {
    if (assertNonEmptyString(actorId, "actorId") !== this.ownerId) {
      throw new Error("Only the logistics-envelope owner may alter or revoke it.");
    }
  }

  #assertActive() {
    if (this.revokedAt !== null) {
      throw new Error("This logistics envelope has been revoked.");
    }
  }
}
