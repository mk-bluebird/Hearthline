const CHARTER_SECTIONS = Object.freeze([
  "honesty",
  "saferSexConversation",
  "communication",
  "exit",
  "aftercare",
  "noncommercialBoundary",
  "currentLimits"
]);

const VISIBILITY_SCOPES = Object.freeze([
  "private_only",
  "selected_contact",
  "reciprocal_match",
  "corridor_participant"
]);

const GRANT_STATES = Object.freeze([
  "proposed",
  "active",
  "declined",
  "revoked",
  "expired"
]);

const PROHIBITED_CHARTER_PATTERNS = Object.freeze([
  /\b(?:rate|rates|price|pricing|fee|fees|tip|tips|deposit|donation|donations)\b/i,
  /\b(?:cashapp|cash app|venmo|zelle|paypal|apple pay|google pay)\b/i,
  /\b(?:bitcoin|btc|ethereum|eth|usdt|crypto|wallet address)\b/i,
  /\b(?:payment|compensat(?:e|ion)|valuable consideration|allowance)\b/i,
  /\b(?:money|cash|rent|housing|lodging|hotel room|ride|transport|gift|debt|loan)\b.{0,96}\b(?:for|in exchange for|if you)\b.{0,96}\b(?:sex|sexual|hookup|intimacy|nudes?)\b/i,
  /\b(?:sex|sexual|hookup|intimacy|nudes?)\b.{0,96}\b(?:for|in exchange for|if you)\b.{0,96}\b(?:money|cash|rent|housing|lodging|hotel room|ride|transport|gift|debt|loan)\b/i
]);

const MAXIMUM_SECTION_LENGTH = 1200;
const MAXIMUM_GRANT_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

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

function normalizeOptionalSection(value, sectionName) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new TypeError(`${sectionName} must be a string when provided.`);
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    return null;
  }

  if (normalized.length > MAXIMUM_SECTION_LENGTH) {
    throw new RangeError(
      `${sectionName} cannot exceed ${MAXIMUM_SECTION_LENGTH} characters.`
    );
  }

  if (PROHIBITED_CHARTER_PATTERNS.some((pattern) => pattern.test(normalized))) {
    throw new Error(
      `${sectionName} cannot contain payment, financial-transfer, or value-for-intimacy language.`
    );
  }

  return normalized;
}

function normalizeSections(sections) {
  if (sections === null || typeof sections !== "object" || Array.isArray(sections)) {
    throw new TypeError("sections must be an object.");
  }

  const normalized = {};

  for (const sectionName of CHARTER_SECTIONS) {
    normalized[sectionName] = normalizeOptionalSection(
      sections[sectionName],
      `sections.${sectionName}`
    );
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

  if (expiry.valueOf() - now.valueOf() > MAXIMUM_GRANT_DURATION_MS) {
    throw new RangeError("A charter grant cannot exceed thirty days.");
  }

  return expiry.toISOString();
}

function freezeClone(value) {
  return Object.freeze(structuredClone(value));
}

export class EncounterEthicsCharter {
  #clock;
  #sections;
  #grants = new Map();

  constructor({
    charterId,
    ownerId,
    sections = {},
    clock = () => new Date()
  }) {
    if (typeof clock !== "function") {
      throw new TypeError("clock must be a function.");
    }

    this.#clock = clock;
    this.charterId = assertNonEmptyString(charterId, "charterId");
    this.ownerId = assertNonEmptyString(ownerId, "ownerId");
    this.#sections = normalizeSections(sections);
    this.createdAt = this.#clock().toISOString();
    this.updatedAt = this.createdAt;
    this.deletedAt = null;
  }

  revise(actorId, sections) {
    this.#assertOwner(actorId);
    this.#assertNotDeleted();

    this.#sections = normalizeSections(sections);
    this.updatedAt = this.#clock().toISOString();

    for (const [grantId, grant] of this.#grants.entries()) {
      if (grant.state === "active") {
        this.#grants.set(grantId, Object.freeze({
          ...grant,
          state: "revoked",
          revokedAt: this.updatedAt,
          reason: "charter_revised"
        }));
      }
    }

    return this.ownerView(actorId);
  }

  proposeShare(actorId, {
    recipientId,
    sectionNames,
    scope = "selected_contact",
    expiresAt
  }) {
    this.#assertOwner(actorId);
    this.#assertNotDeleted();

    const normalizedRecipientId = assertNonEmptyString(recipientId, "recipientId");

    if (normalizedRecipientId === this.ownerId) {
      throw new Error("A charter cannot be shared with its owner.");
    }

    const normalizedScope = assertOneOf(scope, VISIBILITY_SCOPES, "scope");

    if (!Array.isArray(sectionNames) || sectionNames.length === 0) {
      throw new TypeError("sectionNames must contain at least one section.");
    }

    const uniqueSectionNames = [...new Set(
      sectionNames.map((sectionName) =>
        assertOneOf(sectionName, CHARTER_SECTIONS, "sectionNames")
      )
    )];

    const populatedSectionNames = uniqueSectionNames.filter(
      (sectionName) => this.#sections[sectionName] !== null
    );

    if (populatedSectionNames.length === 0) {
      throw new Error("At least one selected charter section must contain text.");
    }

    const now = this.#clock();
    const grantId = `${this.charterId}:grant:${crypto.randomUUID()}`;

    const grant = Object.freeze({
      grantId,
      recipientId: normalizedRecipientId,
      sectionNames: populatedSectionNames,
      scope: normalizedScope,
      state: "proposed",
      createdAt: now.toISOString(),
      expiresAt: normalizeExpiry(expiresAt, now),
      acceptedAt: null,
      revokedAt: null,
      reason: null
    });

    this.#grants.set(grantId, grant);
    this.updatedAt = now.toISOString();

    return this.#recipientGrantView(grant);
  }

  acceptShare(actorId, grantId) {
    const grant = this.#requireGrant(grantId);
    this.#assertNotDeleted();

    if (grant.recipientId !== assertNonEmptyString(actorId, "actorId")) {
      throw new Error("Only the intended recipient may accept this charter share.");
    }

    if (grant.state !== "proposed") {
      throw new Error(`Grant "${grantId}" is not available for acceptance.`);
    }

    if (new Date(grant.expiresAt) <= this.#clock()) {
      this.#expireGrant(grant);
      throw new Error("This charter share has expired.");
    }

    const acceptedAt = this.#clock().toISOString();
    const activeGrant = Object.freeze({
      ...grant,
      state: "active",
      acceptedAt
    });

    this.#grants.set(grantId, activeGrant);
    this.updatedAt = acceptedAt;

    return this.recipientView(actorId, grantId);
  }

  recipientView(actorId, grantId) {
    const grant = this.#requireGrant(grantId);
    this.#assertNotDeleted();

    if (grant.recipientId !== assertNonEmptyString(actorId, "actorId")) {
      throw new Error("Only the intended recipient may read this charter share.");
    }

    if (grant.state !== "active") {
      throw new Error(`Grant "${grantId}" is not active.`);
    }

    if (new Date(grant.expiresAt) <= this.#clock()) {
      this.#expireGrant(grant);
      throw new Error("This charter share has expired.");
    }

    const sharedSections = {};

    for (const sectionName of grant.sectionNames) {
      sharedSections[sectionName] = this.#sections[sectionName];
    }

    return freezeClone({
      charterId: this.charterId,
      grantId: grant.grantId,
      sections: sharedSections,
      expiresAt: grant.expiresAt,
      reminder: "This is a personal statement of current preferences and values. It is not a contract, consent record, score, or promise."
    });
  }

  declineShare(actorId, grantId) {
    const grant = this.#requireGrant(grantId);

    if (grant.recipientId !== assertNonEmptyString(actorId, "actorId")) {
      throw new Error("Only the intended recipient may decline this charter share.");
    }

    if (grant.state !== "proposed") {
      throw new Error(`Grant "${grantId}" is not available for decline.`);
    }

    const declinedAt = this.#clock().toISOString();

    this.#grants.set(grantId, Object.freeze({
      ...grant,
      state: "declined",
      revokedAt: declinedAt,
      reason: "recipient_declined"
    }));

    this.updatedAt = declinedAt;

    return Object.freeze({
      grantId,
      state: "declined"
    });
  }

  revokeShare(actorId, grantId) {
    this.#assertOwner(actorId);
    const grant = this.#requireGrant(grantId);

    if (grant.state === "revoked" || grant.state === "expired") {
      return this.#recipientGrantView(grant);
    }

    const revokedAt = this.#clock().toISOString();

    this.#grants.set(grantId, Object.freeze({
      ...grant,
      state: "revoked",
      revokedAt,
      reason: "owner_revoked"
    }));

    this.updatedAt = revokedAt;

    return Object.freeze({
      grantId,
      state: "revoked",
      reminder: "Access has been removed through Hearthline. A recipient may still have copied content outside the feature."
    });
  }

  delete(actorId) {
    this.#assertOwner(actorId);
    this.#assertNotDeleted();

    this.deletedAt = this.#clock().toISOString();

    for (const [grantId, grant] of this.#grants.entries()) {
      this.#grants.set(grantId, Object.freeze({
        ...grant,
        state: "revoked",
        revokedAt: this.deletedAt,
        reason: "charter_deleted"
      }));
    }

    this.#sections = Object.freeze(
      Object.fromEntries(CHARTER_SECTIONS.map((sectionName) => [sectionName, null]))
    );

    return Object.freeze({
      charterId: this.charterId,
      deletedAt: this.deletedAt,
      reminder: "The charter has been deleted from the active Hearthline path."
    });
  }

  ownerView(actorId) {
    this.#assertOwner(actorId);

    return freezeClone({
      charterId: this.charterId,
      ownerId: this.ownerId,
      sections: this.#sections,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
      grants: [...this.#grants.values()].map((grant) => this.#recipientGrantView(grant))
    });
  }

  #recipientGrantView(grant) {
    return {
      grantId: grant.grantId,
      scope: grant.scope,
      state: grant.state,
      expiresAt: grant.expiresAt,
      sectionNames: [...grant.sectionNames]
    };
  }

  #assertOwner(actorId) {
    if (assertNonEmptyString(actorId, "actorId") !== this.ownerId) {
      throw new Error("Only the charter owner may edit, share, revoke, or delete it.");
    }
  }

  #assertNotDeleted() {
    if (this.deletedAt !== null) {
      throw new Error("This charter has been deleted.");
    }
  }

  #requireGrant(grantId) {
    const normalizedGrantId = assertNonEmptyString(grantId, "grantId");
    const grant = this.#grants.get(normalizedGrantId);

    if (!grant) {
      throw new Error(`No charter grant exists for "${normalizedGrantId}".`);
    }

    return grant;
  }

  #expireGrant(grant) {
    const expiredAt = this.#clock().toISOString();

    this.#grants.set(grant.grantId, Object.freeze({
      ...grant,
      state: "expired",
      revokedAt: expiredAt,
      reason: "grant_expired"
    }));

    this.updatedAt = expiredAt;
  }
}
