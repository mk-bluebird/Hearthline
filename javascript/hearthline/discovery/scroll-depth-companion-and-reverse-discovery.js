const COMPANION_RETENTION_MODES = Object.freeze([
  "disabled",
  "session_only",
  "daily_local",
  "weekly_local",
  "until_deleted"
]);

const COMPANION_COUNTERS = Object.freeze([
  "profilesOpened",
  "storySectionsRead",
  "invitationsOpened",
  "roomsOpened",
  "messagesSent",
  "conversationsPaused",
  "breaksChosen"
]);

const REVERSE_PUBLICATION_TYPES = Object.freeze([
  "story_invitation",
  "interest_prompt",
  "public_activity_invitation",
  "room_presence_invitation",
  "conversation_prompt",
  "friendship_first_prompt",
  "virtual_first_prompt"
]);

const VISIBILITY_SCOPES = Object.freeze([
  "private_draft",
  "selected_contact",
  "reciprocal_match",
  "room_members",
  "local_discovery",
  "public_profile",
  "ephemeral_discovery"
]);

const CONTACT_POLICIES = Object.freeze([
  "mutual_interest_required",
  "reply_with_context",
  "room_reply_only",
  "invitation_request_only",
  "no_new_replies"
]);

const DISCOVERY_SURFACES = Object.freeze([
  "story",
  "affinity",
  "invitation",
  "room"
]);

const PROHIBITED_PUBLICATION_PATTERNS = Object.freeze([
  /\b(?:rate|rates|price|pricing|fee|fees|tip|tips|deposit|donation|allowance)\b/i,
  /\b(?:cashapp|cash app|venmo|zelle|paypal|apple pay|google pay)\b/i,
  /\b(?:bitcoin|btc|ethereum|eth|usdt|crypto|wallet address)\b/i,
  /\b(?:pay(?:ing)?|payment|compensat(?:e|ion)|valuable consideration)\b/i,
  /\b(?:home address|work address|workplace|my shift|my schedule|live location)\b/i,
  /\b(?:housing|lodging|hotel room|rent|ride|transport|gift|debt|loan|job|work)\b.{0,128}\b(?:for|in exchange for|if you|only if)\b.{0,128}\b(?:sex|sexual|hookup|intimacy|nudes?|obedience|submission)\b/i,
  /\b(?:sex|sexual|hookup|intimacy|nudes?|obedience|submission)\b.{0,128}\b(?:for|in exchange for|if you|only if)\b.{0,128}\b(?:housing|lodging|hotel room|rent|ride|transport|gift|debt|loan|job|work)\b/i
]);

const MAXIMUM_PUBLICATION_LENGTH = 1200;
const MAXIMUM_PUBLICATION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

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

function normalizeUniqueValues(values, allowedValues, fieldName) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new TypeError(`${fieldName} must contain at least one value.`);
  }

  return Object.freeze([
    ...new Set(
      values.map((value) => assertOneOf(value, allowedValues, fieldName))
    )
  ]);
}

function normalizeExpiry(expiresAt, now) {
  const expiry = new Date(assertNonEmptyString(expiresAt, "expiresAt"));

  if (Number.isNaN(expiry.valueOf())) {
    throw new RangeError("expiresAt must be a valid ISO-8601 date-time.");
  }

  if (expiry <= now) {
    throw new RangeError("expiresAt must be in the future.");
  }

  if (expiry.valueOf() - now.valueOf() > MAXIMUM_PUBLICATION_LIFETIME_MS) {
    throw new RangeError("A reverse-discovery publication cannot remain active longer than thirty days.");
  }

  return expiry.toISOString();
}

function normalizePublicationText(value) {
  const text = assertNonEmptyString(value, "text");

  if (text.length > MAXIMUM_PUBLICATION_LENGTH) {
    throw new RangeError(
      `text cannot exceed ${MAXIMUM_PUBLICATION_LENGTH} characters.`
    );
  }

  if (PROHIBITED_PUBLICATION_PATTERNS.some((pattern) => pattern.test(text))) {
    throw new Error(
      "Publication text cannot include payment, value-for-intimacy, precise-location, workplace, or conditional-resource language."
    );
  }

  return text;
}

function freezeClone(value) {
  return Object.freeze(structuredClone(value));
}

export class ScrollDepthCompanion {
  #clock;
  #retentionMode;
  #counters;
  #createdAt;
  #expiresAt;

  constructor({
    retentionMode = "disabled",
    clock = () => new Date()
  } = {}) {
    if (typeof clock !== "function") {
      throw new TypeError("clock must be a function.");
    }

    this.#clock = clock;
    this.#retentionMode = assertOneOf(
      retentionMode,
      COMPANION_RETENTION_MODES,
      "retentionMode"
    );
    this.#counters = Object.fromEntries(
      COMPANION_COUNTERS.map((counter) => [counter, 0])
    );
    this.#createdAt = this.#clock().toISOString();
    this.#expiresAt = this.#deriveExpiry();
  }

  record(counterName) {
    if (this.#retentionMode === "disabled") {
      return this.view();
    }

    this.#expireIfNeeded();
    assertOneOf(counterName, COMPANION_COUNTERS, "counterName");
    this.#counters[counterName] += 1;

    return this.view();
  }

  chooseBreak() {
    return this.record("breaksChosen");
  }

  setRetentionMode(retentionMode) {
    this.#retentionMode = assertOneOf(
      retentionMode,
      COMPANION_RETENTION_MODES,
      "retentionMode"
    );
    this.clear();
    this.#createdAt = this.#clock().toISOString();
    this.#expiresAt = this.#deriveExpiry();

    return this.view();
  }

  clear() {
    this.#counters = Object.fromEntries(
      COMPANION_COUNTERS.map((counter) => [counter, 0])
    );

    return this.view();
  }

  disable() {
    this.#retentionMode = "disabled";
    this.clear();
    this.#expiresAt = null;

    return this.view();
  }

  view() {
    this.#expireIfNeeded();

    return freezeClone({
      localOnly: true,
      networkDisabled: true,
      retentionMode: this.#retentionMode,
      createdAt: this.#createdAt,
      expiresAt: this.#expiresAt,
      counters: { ...this.#counters },
      reminder: "This is a private count on this device. Hearthline does not receive it, use it to rank you, or change what you see."
    });
  }

  #deriveExpiry() {
    const now = this.#clock();

    if (this.#retentionMode === "daily_local") {
      const expiry = new Date(now);
      expiry.setHours(24, 0, 0, 0);
      return expiry.toISOString();
    }

    if (this.#retentionMode === "weekly_local") {
      const expiry = new Date(now);
      expiry.setDate(expiry.getDate() + 7);
      return expiry.toISOString();
    }

    return null;
  }

  #expireIfNeeded() {
    if (
      this.#expiresAt !== null &&
      new Date(this.#expiresAt) <= this.#clock()
    ) {
      this.clear();
      this.#createdAt = this.#clock().toISOString();
      this.#expiresAt = this.#deriveExpiry();
    }
  }
}

export class ReverseDiscoveryPublication {
  #clock;
  #active;
  #revokedAt;

  constructor({
    publicationId,
    ownerId,
    type,
    text,
    visibilityScope,
    discoverySurfaces,
    contactPolicy = "mutual_interest_required",
    expiresAt,
    clock = () => new Date()
  }) {
    if (typeof clock !== "function") {
      throw new TypeError("clock must be a function.");
    }

    this.#clock = clock;
    const now = this.#clock();

    this.publicationId = assertNonEmptyString(publicationId, "publicationId");
    this.ownerId = assertNonEmptyString(ownerId, "ownerId");
    this.type = assertOneOf(type, REVERSE_PUBLICATION_TYPES, "type");
    this.text = normalizePublicationText(text);
    this.visibilityScope = assertOneOf(
      visibilityScope,
      VISIBILITY_SCOPES,
      "visibilityScope"
    );
    this.discoverySurfaces = normalizeUniqueValues(
      discoverySurfaces,
      DISCOVERY_SURFACES,
      "discoverySurfaces"
    );
    this.contactPolicy = assertOneOf(
      contactPolicy,
      CONTACT_POLICIES,
      "contactPolicy"
    );
    this.expiresAt = normalizeExpiry(expiresAt, now);
    this.createdAt = now.toISOString();
    this.updatedAt = this.createdAt;
    this.#active = this.visibilityScope !== "private_draft";
    this.#revokedAt = null;

    this.#assertScopeCompatibility();
  }

  publish(actorId) {
    this.#assertOwner(actorId);
    this.#assertNotExpired();

    if (this.visibilityScope === "private_draft") {
      throw new Error("Choose a non-private visibility scope before publishing.");
    }

    this.#active = true;
    this.#revokedAt = null;
    this.updatedAt = this.#clock().toISOString();

    return this.publicView();
  }

  revise(actorId, patch) {
    this.#assertOwner(actorId);
    this.#assertNotExpired();

    if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
      throw new TypeError("patch must be an object.");
    }

    if (patch.text !== undefined) {
      this.text = normalizePublicationText(patch.text);
    }

    if (patch.visibilityScope !== undefined) {
      this.visibilityScope = assertOneOf(
        patch.visibilityScope,
        VISIBILITY_SCOPES,
        "patch.visibilityScope"
      );
    }

    if (patch.discoverySurfaces !== undefined) {
      this.discoverySurfaces = normalizeUniqueValues(
        patch.discoverySurfaces,
        DISCOVERY_SURFACES,
        "patch.discoverySurfaces"
      );
    }

    if (patch.contactPolicy !== undefined) {
      this.contactPolicy = assertOneOf(
        patch.contactPolicy,
        CONTACT_POLICIES,
        "patch.contactPolicy"
      );
    }

    this.#assertScopeCompatibility();
    this.updatedAt = this.#clock().toISOString();

    return this.ownerView(actorId);
  }

  revoke(actorId) {
    this.#assertOwner(actorId);

    this.#active = false;
    this.#revokedAt = this.#clock().toISOString();
    this.updatedAt = this.#revokedAt;

    return Object.freeze({
      publicationId: this.publicationId,
      revokedAt: this.#revokedAt,
      reminder: "This publication has been removed from Hearthline discovery. No explanation is required."
    });
  }

  publicView() {
    this.#expireIfNeeded();

    if (!this.#active) {
      return null;
    }

    return freezeClone({
      publicationId: this.publicationId,
      type: this.type,
      text: this.text,
      visibilityScope: this.visibilityScope,
      discoverySurfaces: [...this.discoverySurfaces],
      contactPolicy: this.contactPolicy,
      expiresAt: this.expiresAt,
      noncommercialBoundary: true,
      externalActionAuthorized: false,
      reminder: "This is a discoverable invitation, not a promise of availability, consent, meeting, intimacy, hosting, transport, or continued contact."
    });
  }

  ownerView(actorId) {
    this.#assertOwner(actorId);
    this.#expireIfNeeded();

    return freezeClone({
      publicationId: this.publicationId,
      ownerId: this.ownerId,
      type: this.type,
      text: this.text,
      visibilityScope: this.visibilityScope,
      discoverySurfaces: [...this.discoverySurfaces],
      contactPolicy: this.contactPolicy,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      active: this.#active,
      revokedAt: this.#revokedAt
    });
  }

  #assertScopeCompatibility() {
    if (
      this.visibilityScope === "public_profile" &&
      this.contactPolicy !== "mutual_interest_required"
    ) {
      throw new Error(
        "Public reverse-discovery publications require mutual_interest_required contact policy."
      );
    }

    if (
      this.visibilityScope === "local_discovery" &&
      !this.discoverySurfaces.includes("invitation")
    ) {
      throw new Error(
        "Local discovery publications must include the invitation discovery surface."
      );
    }
  }

  #assertOwner(actorId) {
    if (assertNonEmptyString(actorId, "actorId") !== this.ownerId) {
      throw new Error("Only the publication owner may publish, revise, or revoke it.");
    }
  }

  #assertNotExpired() {
    this.#expireIfNeeded();

    if (new Date(this.expiresAt) <= this.#clock()) {
      throw new Error("This reverse-discovery publication has expired.");
    }
  }

  #expireIfNeeded() {
    if (new Date(this.expiresAt) <= this.#clock()) {
      this.#active = false;
      this.updatedAt = this.#clock().toISOString();
    }
  }
}
