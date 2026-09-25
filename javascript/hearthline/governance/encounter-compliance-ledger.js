const EVENT_TYPES = Object.freeze([
  "report_opened",
  "report_submitted_for_review",
  "human_review_started",
  "human_review_completed",
  "appeal_opened",
  "appeal_resolved",
  "content_action_completed",
  "feature_restriction_completed",
  "case_closed_no_action",
  "retention_expired",
  "case_mapping_destroyed",
  "ledger_accessed",
  "correction_recorded",
  "integrity_check_completed"
]);

const REVIEW_STATUSES = Object.freeze([
  "not_applicable",
  "pending",
  "in_review",
  "completed",
  "appealed",
  "retention_closed"
]);

const OUTCOME_CATEGORIES = Object.freeze([
  "not_applicable",
  "no_policy_match",
  "education_notice",
  "public_content_removed",
  "feature_restriction",
  "account_action",
  "appeal_upheld",
  "appeal_modified",
  "appeal_reversed",
  "case_closed",
  "retention_purged",
  "integrity_verified"
]);

const ACCESS_PURPOSES = Object.freeze([
  "case_review",
  "appeal_review",
  "retention_verification",
  "integrity_audit",
  "authorized_legal_review"
]);

const PROHIBITED_FIELDS = new Set([
  "user_id",
  "userid",
  "profile_id",
  "profileid",
  "account_id",
  "accountid",
  "email",
  "phone",
  "message",
  "message_text",
  "content",
  "reported_content",
  "location",
  "address",
  "workplace",
  "ip_address",
  "device_id",
  "fingerprint",
  "payment",
  "financial",
  "health",
  "recovery",
  "sexuality",
  "identity",
  "risk_score",
  "trust_score",
  "legal_score",
  "moderation_score"
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

function assertPlainObject(value, fieldName) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${fieldName} must be a plain object.`);
  }

  return value;
}

function assertNoProhibitedFields(value, fieldName = "event") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertNoProhibitedFields(entry, `${fieldName}[${index}]`)
    );
    return;
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (PROHIBITED_FIELDS.has(key.toLowerCase())) {
      throw new Error(`${fieldName} contains prohibited field "${key}".`);
    }

    assertNoProhibitedFields(nestedValue, `${fieldName}.${key}`);
  }
}

function canonicalize(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }

  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function freezeClone(value) {
  return Object.freeze(structuredClone(value));
}

export class EncounterComplianceLedger {
  #clock;
  #eventsByCase = new Map();

  constructor({ clock = () => new Date() } = {}) {
    if (typeof clock !== "function") {
      throw new TypeError("clock must be a function.");
    }

    if (!globalThis.crypto?.subtle) {
      throw new Error("EncounterComplianceLedger requires Web Crypto support.");
    }

    this.#clock = clock;
  }

  async append({
    caseId,
    eventId,
    eventType,
    reviewStatus,
    outcomeCategory,
    retentionExpiresAt,
    policyVersion,
    accessPurpose = null,
    correctionTargetEventId = null
  }) {
    const eventInput = {
      caseId: assertNonEmptyString(caseId, "caseId"),
      eventId: assertNonEmptyString(eventId, "eventId"),
      eventType: assertOneOf(eventType, EVENT_TYPES, "eventType"),
      reviewStatus: assertOneOf(reviewStatus, REVIEW_STATUSES, "reviewStatus"),
      outcomeCategory: assertOneOf(
        outcomeCategory,
        OUTCOME_CATEGORIES,
        "outcomeCategory"
      ),
      retentionExpiresAt: assertNonEmptyString(
        retentionExpiresAt,
        "retentionExpiresAt"
      ),
      policyVersion: assertNonEmptyString(policyVersion, "policyVersion"),
      accessPurpose: accessPurpose === null
        ? null
        : assertOneOf(accessPurpose, ACCESS_PURPOSES, "accessPurpose"),
      correctionTargetEventId: correctionTargetEventId === null
        ? null
        : assertNonEmptyString(correctionTargetEventId, "correctionTargetEventId")
    };

    assertNoProhibitedFields(eventInput);

    const retentionDate = new Date(eventInput.retentionExpiresAt);

    if (Number.isNaN(retentionDate.valueOf())) {
      throw new RangeError("retentionExpiresAt must be a valid ISO-8601 date-time.");
    }

    if (retentionDate <= this.#clock()) {
      throw new RangeError("retentionExpiresAt must be in the future.");
    }

    const caseEvents = this.#eventsByCase.get(eventInput.caseId) ?? [];
    const priorEvent = caseEvents.at(-1) ?? null;
    const occurredAt = this.#clock().toISOString();

    const canonicalEvent = {
      caseId: eventInput.caseId,
      eventId: eventInput.eventId,
      sequence: caseEvents.length + 1,
      eventType: eventInput.eventType,
      reviewStatus: eventInput.reviewStatus,
      outcomeCategory: eventInput.outcomeCategory,
      occurredAt,
      retentionExpiresAt: retentionDate.toISOString(),
      policyVersion: eventInput.policyVersion,
      accessPurpose: eventInput.accessPurpose,
      correctionTargetEventId: eventInput.correctionTargetEventId,
      priorEventHash: priorEvent?.eventHash ?? null
    };

    const eventHash = await sha256Hex(canonicalize(canonicalEvent));

    const event = freezeClone({
      ...canonicalEvent,
      eventHash
    });

    this.#eventsByCase.set(
      eventInput.caseId,
      Object.freeze([...caseEvents, event])
    );

    return event;
  }

  summary(caseId, now = this.#clock()) {
    const normalizedCaseId = assertNonEmptyString(caseId, "caseId");
    const currentTime = new Date(now);

    if (Number.isNaN(currentTime.valueOf())) {
      throw new RangeError("now must be a valid ISO-8601 date-time.");
    }

    const events = this.#eventsByCase.get(normalizedCaseId) ?? [];

    return freezeClone({
      caseId: normalizedCaseId,
      activeEventCount: events.filter(
        (event) => new Date(event.retentionExpiresAt) > currentTime
      ).length,
      latestEvent: events.at(-1)
        ? {
            eventType: events.at(-1).eventType,
            reviewStatus: events.at(-1).reviewStatus,
            outcomeCategory: events.at(-1).outcomeCategory,
            occurredAt: events.at(-1).occurredAt
          }
        : null
    });
  }

  verifyIntegrity(caseId) {
    const normalizedCaseId = assertNonEmptyString(caseId, "caseId");
    const events = this.#eventsByCase.get(normalizedCaseId) ?? [];

    for (let index = 0; index < events.length; index += 1) {
      const event = events[index];
      const expectedPriorHash = index === 0 ? null : events[index - 1].eventHash;

      if (event.priorEventHash !== expectedPriorHash) {
        return Object.freeze({
          caseId: normalizedCaseId,
          valid: false,
          failedSequence: event.sequence,
          reason: "prior_hash_mismatch"
        });
      }
    }

    return Object.freeze({
      caseId: normalizedCaseId,
      valid: true,
      eventCount: events.length
    });
  }

  retentionClose(caseId, now = this.#clock()) {
    const normalizedCaseId = assertNonEmptyString(caseId, "caseId");
    const currentTime = new Date(now);

    if (Number.isNaN(currentTime.valueOf())) {
      throw new RangeError("now must be a valid ISO-8601 date-time.");
    }

    const events = this.#eventsByCase.get(normalizedCaseId) ?? [];
    const retainedEvents = events.filter(
      (event) => new Date(event.retentionExpiresAt) > currentTime
    );

    this.#eventsByCase.set(normalizedCaseId, Object.freeze(retainedEvents));

    return Object.freeze({
      caseId: normalizedCaseId,
      retainedEventCount: retainedEvents.length,
      purgedEventCount: events.length - retainedEvents.length,
      retentionClosedAt: currentTime.toISOString()
    });
  }
}
