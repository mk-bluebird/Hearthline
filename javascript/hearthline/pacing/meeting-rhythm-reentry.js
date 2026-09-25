const RETENTION_MODES = Object.freeze([
  "disabled",
  "session_only",
  "local_expiring",
  "until_deleted",
  "export_only"
]);

const VENUE_PREFERENCES = Object.freeze([
  "public_first",
  "neutral_public_place",
  "virtual_first",
  "discuss_later"
]);

const TIME_PREFERENCES = Object.freeze([
  "daytime_preferred",
  "evening_preferred",
  "flexible",
  "not_planning_now"
]);

const TRANSIT_PREFERENCES = Object.freeze([
  "transit_accessible",
  "walkable_area",
  "independent_arrival",
  "discuss_later"
]);

const SUBSTANCE_BOUNDARIES = Object.freeze([
  "substance_free_preferred",
  "lower_substance_preferred",
  "discuss_later"
]);

const SETTING_PREFERENCES = Object.freeze([
  "quiet_setting",
  "public_activity",
  "short_first_meet",
  "accessible_seating",
  "discuss_later"
]);

const PRIVACY_PREFERENCES = Object.freeze([
  "no_home_address",
  "no_workplace",
  "keep_in_app_first",
  "discuss_later"
]);

const EXIT_PREFERENCES = Object.freeze([
  "independent_departure",
  "leave_when_ready",
  "pause_and_reassess",
  "not_planning_now"
]);

const MEETING_STATES = Object.freeze([
  "not_meeting_now",
  "open_to_discuss",
  "considering_public_meet",
  "prefer_not_to_label"
]);

const SOCIAL_RHYTHMS = Object.freeze([
  "frequent_contact_can_feel_good",
  "weekly_or_periodic_contact",
  "occasional_contact",
  "rare_contact",
  "variable_rhythm",
  "not_reflecting_now",
  "prefer_not_to_label"
]);

const REENTRY_MODES = Object.freeze([
  "story_browsing_only",
  "rooms_only",
  "public_activities_only",
  "conversation_prompts_only",
  "mutual_interest_only",
  "ordinary_features",
  "none_yet"
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

function normalizeOptionalExpiry(expiresAt) {
  if (expiresAt === undefined || expiresAt === null) {
    return null;
  }

  const parsed = new Date(expiresAt);

  if (Number.isNaN(parsed.valueOf())) {
    throw new RangeError("expiresAt must be a valid ISO-8601 date-time.");
  }

  return parsed.toISOString();
}

function freezeClone(value) {
  return Object.freeze(structuredClone(value));
}

class LocalPreferenceStore {
  #clock;
  #entries = new Map();

  constructor({ clock = () => new Date() } = {}) {
    if (typeof clock !== "function") {
      throw new TypeError("clock must be a function.");
    }

    this.#clock = clock;
  }

  save({
    entryId,
    payload,
    retentionMode = "session_only",
    expiresAt = null,
    reminder
  }) {
    const normalizedRetentionMode = assertOneOf(
      retentionMode,
      RETENTION_MODES,
      "retentionMode"
    );

    if (normalizedRetentionMode === "disabled") {
      return Object.freeze({
        saved: false,
        localOnly: true,
        networkDisabled: true,
        reminder: "Private note is disabled. Nothing was stored."
      });
    }

    const normalizedEntryId = assertNonEmptyString(entryId, "entryId");
    const normalizedExpiry = normalizeOptionalExpiry(expiresAt);

    if (
      normalizedRetentionMode === "local_expiring" &&
      normalizedExpiry === null
    ) {
      throw new Error("local_expiring entries require expiresAt.");
    }

    if (
      normalizedRetentionMode !== "local_expiring" &&
      normalizedExpiry !== null
    ) {
      throw new Error(
        "expiresAt is permitted only when retentionMode is local_expiring."
      );
    }

    const entry = Object.freeze({
      entryId: normalizedEntryId,
      payload: structuredClone(payload),
      createdAt: this.#clock().toISOString(),
      expiresAt: normalizedExpiry,
      localOnly: true,
      networkDisabled: true,
      profileReference: null,
      counterpartReference: null,
      corridorReference: null,
      meetingReference: null,
      exportOnlyByUser: true,
      reminder
    });

    if (normalizedRetentionMode === "export_only") {
      return Object.freeze({
        saved: false,
        localOnly: true,
        networkDisabled: true,
        exportPayload: JSON.stringify(entry, null, 2),
        reminder:
          "This export is user-controlled. Hearthline does not retain a copy."
      });
    }

    this.#entries.set(normalizedEntryId, entry);
    return this.summary(normalizedEntryId);
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
      reminder: entry.reminder
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
      throw new Error(`No local preference entry exists for "${normalizedEntryId}".`);
    }

    if (
      entry.expiresAt !== null &&
      new Date(entry.expiresAt) <= this.#clock()
    ) {
      this.#entries.delete(normalizedEntryId);
      throw new Error(`Local preference entry "${normalizedEntryId}" has expired.`);
    }

    return entry;
  }
}

export class MeetingThresholdObject {
  #store;

  constructor(options = {}) {
    this.#store = new LocalPreferenceStore(options);
  }

  saveMeetingConditions({
    entryId,
    venuePreference = "discuss_later",
    timePreference = "not_planning_now",
    transitPreference = "discuss_later",
    substanceBoundary = "discuss_later",
    settingPreference = "discuss_later",
    privacyPreference = "discuss_later",
    exitPreference = "not_planning_now",
    meetingState = "prefer_not_to_label",
    retentionMode = "session_only",
    expiresAt = null
  }) {
    return this.#store.save({
      entryId,
      retentionMode,
      expiresAt,
      payload: {
        venuePreference: assertOneOf(
          venuePreference,
          VENUE_PREFERENCES,
          "venuePreference"
        ),
        timePreference: assertOneOf(
          timePreference,
          TIME_PREFERENCES,
          "timePreference"
        ),
        transitPreference: assertOneOf(
          transitPreference,
          TRANSIT_PREFERENCES,
          "transitPreference"
        ),
        substanceBoundary: assertOneOf(
          substanceBoundary,
          SUBSTANCE_BOUNDARIES,
          "substanceBoundary"
        ),
        settingPreference: assertOneOf(
          settingPreference,
          SETTING_PREFERENCES,
          "settingPreference"
        ),
        privacyPreference: assertOneOf(
          privacyPreference,
          PRIVACY_PREFERENCES,
          "privacyPreference"
        ),
        exitPreference: assertOneOf(
          exitPreference,
          EXIT_PREFERENCES,
          "exitPreference"
        ),
        meetingState: assertOneOf(
          meetingState,
          MEETING_STATES,
          "meetingState"
        )
      },
      reminder:
        "This is your private meeting conditions note. It is not a public demand, a discovery filter, a meeting invitation, or a requirement for another person."
    });
  }

  read(entryId) {
    return this.#store.read(entryId);
  }

  delete(entryId) {
    return this.#store.delete(entryId);
  }

  clearAll() {
    return this.#store.clearAll();
  }
}

export class SocialFrequencyTuner {
  #store;

  constructor(options = {}) {
    this.#store = new LocalPreferenceStore(options);
  }

  saveSocialRhythmNote({
    entryId,
    socialRhythm = "prefer_not_to_label",
    retentionMode = "session_only",
    expiresAt = null
  }) {
    return this.#store.save({
      entryId,
      retentionMode,
      expiresAt,
      payload: {
        socialRhythm: assertOneOf(
          socialRhythm,
          SOCIAL_RHYTHMS,
          "socialRhythm"
        )
      },
      reminder:
        "This is your private social rhythm note. It does not set a response quota, profile status, matching filter, or expectation for another person."
    });
  }

  read(entryId) {
    return this.#store.read(entryId);
  }

  delete(entryId) {
    return this.#store.delete(entryId);
  }

  clearAll() {
    return this.#store.clearAll();
  }
}

export class EncounterReentryProtocol {
  #clock;
  #state = "paused_by_user";

  constructor({ clock = () => new Date() } = {}) {
    if (typeof clock !== "function") {
      throw new TypeError("clock must be a function.");
    }

    this.#clock = clock;
    this.createdAt = this.#clock().toISOString();
    this.updatedAt = this.createdAt;
  }

  enterQuietPresence() {
    this.#state = "quiet_presence";
    this.updatedAt = this.#clock().toISOString();

    return this.snapshot();
  }

  resumeAtOwnPace(reentryMode) {
    this.#state = "resume_at_own_pace";
    this.updatedAt = this.#clock().toISOString();

    return freezeClone({
      ...this.snapshot(),
      selectedMode: assertOneOf(
        reentryMode,
        REENTRY_MODES,
        "reentryMode"
      ),
      reminder:
        "Resuming is your choice. Hearthline does not announce it, revive old contacts, send a welcome-back campaign, or assume you want to meet or discuss intimacy."
    });
  }

  pause() {
    this.#state = "paused_by_user";
    this.updatedAt = this.#clock().toISOString();

    return this.snapshot();
  }

  snapshot() {
    return freezeClone({
      state: this.#state,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      publicStatus: null,
      profileAnnouncement: false,
      campaignNotification: false,
      oldContactRevival: false,
      discoveryBoost: false,
      discoveryPenalty: false,
      externalActionAuthorized: false
    });
  }
}
