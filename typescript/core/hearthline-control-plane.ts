// SPDX-License-Identifier: MIT OR Apache-2.0

/**
 * Hearthline control-plane reference implementation.
 *
 * No network calls, billing calls, location collection, persistent storage,
 * content analytics, protected-attribute inference, or autonomous messages.
 *
 * The host must provide authenticated actor resolution and a vetted
 * cryptographic age-evidence verifier. Client-supplied booleans are not
 * authorization evidence.
 */

export const HEARTHLINE_VERSION = "0.1.0" as const;

/* -------------------------------------------------------------------------- */
/* Public vocabulary                                                          */
/* -------------------------------------------------------------------------- */

export const INTENTS = [
  "conversation",
  "friendship",
  "companionship",
  "shared_activities",
  "dates",
  "romance",
  "casual_intimacy",
  "friendship_with_optional_intimacy",
  "still_deciding",
] as const;

export const INTERESTS = [
  "books",
  "films",
  "museums",
  "drawing",
  "writing",
  "crafts",
  "board_games",
  "puzzles",
  "language_learning",
  "science_discussion",
  "gardening",
  "nature_observation",
  "cooking",
  "travel_discussion",
] as const;

export const PROFILE_FIELDS = [
  "display_name",
  "photo_ref",
  "broad_area_ref",
  "intents",
  "interests",
  "meeting_preference",
  "phone_number",
  "external_handle",
  "gender_description",
  "pronouns",
] as const;

export const CORE_CAPABILITIES = [
  "discovery",
  "permissioned_text",
  "ordinary_drafting",
  "privacy",
  "consent",
  "accessibility",
  "reporting",
  "appeal",
  "account_security",
  "eligibility_support",
  "export",
  "deletion",
  "resources",
  "planning",
  "reflection",
] as const;

export type Intent = (typeof INTENTS)[number];
export type Interest = (typeof INTERESTS)[number];
export type ProfileField = (typeof PROFILE_FIELDS)[number];
export type CoreCapability = (typeof CORE_CAPABILITIES)[number];

export type ProfileValue = string | readonly string[];

export type GrantState =
  | "NO_GRANT"
  | "GRANTED"
  | "REVOKED"
  | "EXPIRED";

export type Purpose =
  | "profile_render"
  | "drafting"
  | "export";

export type PairStage =
  | "INTEREST_REVIEW"
  | "LIMITED_CONVERSATION"
  | "OPTIONAL_PLANNING"
  | "CLOSED";

export type LifecycleKind =
  | "eligibility_updated"
  | "profile_updated"
  | "privacy_updated"
  | "preferences_updated"
  | "draft_invalidated"
  | "connection_updated"
  | "report_received"
  | "account_closed";

export type LifecycleReceipt = Readonly<{
  eventRef: string;
  kind: LifecycleKind;
  occurredAt: number;
  policyRef: string;
}>;

export type ComfortSettings = Readonly<{
  candidatesPerPage: 1 | 5 | 10;
  reducedMotion: boolean;
  reducedStimulation: boolean;
  textFirst: boolean;
  reminders: "off" | "member_selected_digest";
  media: "on_request" | "standard";
  sharedDevice: boolean;
}>;

export type AdmissionChallenge = Readonly<{
  challengeRef: string;
  accountRef: string;
  audience: string;
  thresholdYears: number;
  configurationRef: string;
  expiresAt: number;
}>;

export type VerifiedAgeEvidence = Readonly<{
  challengeRef: string;
  accountRef: string;
  audience: string;
  thresholdYears: number;
  configurationRef: string;
  thresholdSatisfied: boolean;
  validUntil: number;
}>;

export type HearthlineDependencies = Readonly<{
  actor: () => string;
  now: () => number;
  opaqueRef: () => string;
  verifyAgeEvidence: (
    presentation: unknown,
    challenge: AdmissionChallenge,
  ) => Promise<VerifiedAgeEvidence>;
}>;

export type HearthlineConfiguration = Readonly<{
  policyRef: string;
  configurationRef: string;
  audience: string;
  membershipThresholdYears: number;
  legalReviewExpiresAt: number;
  admissionChallengeTtlMs: number;
  maximumGrantTtlMs: number;
  maximumDraftTtlMs: number;
  maximumProposalTtlMs: number;
  allowedBroadAreaRefs: readonly string[];
  caseReviewerRefs: readonly string[];
}>;

export type PlanningDetails = Readonly<{
  publicVenueRef: string;
  activityRef: string;
  startsAt: number;
  endsAt: number;
}>;

export type ReportCategory =
  | "unwanted_contact"
  | "identity_targeted_harassment"
  | "privacy_disclosure"
  | "age_eligibility_concern"
  | "coercion_or_threat"
  | "other";

/* -------------------------------------------------------------------------- */
/* Internal records                                                           */
/* -------------------------------------------------------------------------- */

type StoredField = {
  revision: number;
  value: ProfileValue;
};

type Account = {
  closed: boolean;
  paused: boolean;
  concealed: boolean;
  eligibilityUntil: number;
  revision: number;
  fields: Map<ProfileField, StoredField>;
  comfort: ComfortSettings;
};

type Grant = {
  ownerRef: string;
  recipientRef: string;
  field: ProfileField;
  purpose: Purpose;
  fieldRevision: number;
  state: GrantState;
  expiresAt: number;
};

type Dependency = {
  ownerRef: string;
  field: ProfileField;
  fieldRevision: number;
  purpose: "drafting";
};

type Draft = {
  ownerRef: string;
  recipientRef: string;
  text: string;
  contentRevision: number;
  reviewedRevision: number | null;
  expiresAt: number;
  dependencies: readonly Dependency[];
  state: "ACTIVE" | "INVALIDATED" | "EXPIRED" | "CONSUMED";
};

type Pair = {
  participants: readonly [string, string];
  stage: PairStage;
  revision: number;
  proposal: {
    proposalRef: string;
    details: PlanningDetails;
    pairRevision: number;
    accountRevisions: readonly [number, number];
    expiresAt: number;
    confirmations: Set<string>;
  } | null;
};

type CaseRecord = {
  reporterRef: string;
  subjectRef: string;
  category: ReportCategory;
  evidenceRef: string | null;
  status: "INTAKE" | "UNDER_REVIEW" | "CLOSED";
  createdAt: number;
};

const INTENT_SET = new Set<string>(INTENTS);
const INTEREST_SET = new Set<string>(INTERESTS);
const FIELD_SET = new Set<string>(PROFILE_FIELDS);
const PURPOSE_SET = new Set<string>([
  "profile_render",
  "drafting",
  "export",
]);

const REPORT_SET = new Set<string>([
  "unwanted_contact",
  "identity_targeted_harassment",
  "privacy_disclosure",
  "age_eligibility_concern",
  "coercion_or_threat",
  "other",
]);

const DEFAULT_COMFORT: ComfortSettings = Object.freeze({
  candidatesPerPage: 1,
  reducedMotion: true,
  reducedStimulation: true,
  textFirst: true,
  reminders: "off",
  media: "on_request",
  sharedDevice: false,
});

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

function reference(value: unknown): asserts value is string {
  if (
    typeof value !== "string" ||
    value.trim() === "" ||
    value.length > 300
  ) {
    throw new TypeError("Invalid reference");
  }
}

function timestamp(value: unknown): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new TypeError("Invalid timestamp");
  }
}

function positiveInteger(value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError("Expected positive safe integer");
  }
}

function strictObject(
  input: unknown,
  expectedKeys: readonly string[],
): Record<string, unknown> {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new TypeError("Expected a plain data object");
  }

  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("Expected a plain data object");
  }

  const keys = Reflect.ownKeys(input);
  const expected = new Set(expectedKeys);

  if (
    keys.length !== expected.size ||
    keys.some(
      (key) => typeof key !== "string" || !expected.has(key),
    )
  ) {
    throw new TypeError("Undeclared or missing fields");
  }

  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !("value" in descriptor)) {
      throw new TypeError("Accessors are not accepted");
    }
  }

  return input as Record<string, unknown>;
}

function copyValue(value: ProfileValue): ProfileValue {
  return typeof value === "string"
    ? value
    : Object.freeze([...value]);
}

function pairKey(first: string, second: string): string {
  return JSON.stringify(
    first < second ? [first, second] : [second, first],
  );
}

function grantKey(
  owner: string,
  recipient: string,
  field: ProfileField,
  purpose: Purpose,
): string {
  return JSON.stringify([owner, recipient, field, purpose]);
}

function planningDetails(input: unknown): PlanningDetails {
  const data = strictObject(input, [
    "publicVenueRef",
    "activityRef",
    "startsAt",
    "endsAt",
  ]);

  reference(data.publicVenueRef);
  reference(data.activityRef);
  timestamp(data.startsAt);
  timestamp(data.endsAt);

  if (data.endsAt <= data.startsAt) {
    throw new TypeError("Invalid planning interval");
  }

  return Object.freeze({
    publicVenueRef: data.publicVenueRef,
    activityRef: data.activityRef,
    startsAt: data.startsAt,
    endsAt: data.endsAt,
  });
}

/* -------------------------------------------------------------------------- */
/* Control plane                                                              */
/* -------------------------------------------------------------------------- */

export class HearthlineControlPlane {
  #accounts = new Map<string, Account>();
  #challenges = new Map<string, AdmissionChallenge>();
  #grants = new Map<string, Grant>();
  #drafts = new Map<string, Draft>();
  #pairs = new Map<string, Pair>();
  #blocks = new Set<string>();
  #cases = new Map<string, CaseRecord>();
  #receipts: LifecycleReceipt[] = [];
  #usedReferences = new Set<string>();
  #lastTime = -1;

  #configuration: HearthlineConfiguration;
  #dependencies: HearthlineDependencies;
  #areas: ReadonlySet<string>;
  #reviewers: ReadonlySet<string>;

  constructor(
    configuration: HearthlineConfiguration,
    dependencies: HearthlineDependencies,
  ) {
    reference(configuration.policyRef);
    reference(configuration.configurationRef);
    reference(configuration.audience);
    timestamp(configuration.legalReviewExpiresAt);

    if (
      !Number.isSafeInteger(configuration.membershipThresholdYears) ||
      configuration.membershipThresholdYears < 18
    ) {
      throw new TypeError("Invalid membership threshold");
    }

    for (const ttl of [
      configuration.admissionChallengeTtlMs,
      configuration.maximumGrantTtlMs,
      configuration.maximumDraftTtlMs,
      configuration.maximumProposalTtlMs,
    ]) {
      positiveInteger(ttl);
    }

    for (const ref of [
      ...configuration.allowedBroadAreaRefs,
      ...configuration.caseReviewerRefs,
    ]) {
      reference(ref);
    }

    if (
      new Set(configuration.allowedBroadAreaRefs).size !==
        configuration.allowedBroadAreaRefs.length ||
      new Set(configuration.caseReviewerRefs).size !==
        configuration.caseReviewerRefs.length
    ) {
      throw new TypeError("Duplicate configured reference");
    }

    this.#configuration = Object.freeze({
      ...configuration,
      allowedBroadAreaRefs: Object.freeze(
        [...configuration.allowedBroadAreaRefs],
      ),
      caseReviewerRefs: Object.freeze(
        [...configuration.caseReviewerRefs],
      ),
    });
    this.#dependencies = Object.freeze({ ...dependencies });
    this.#areas = new Set(configuration.allowedBroadAreaRefs);
    this.#reviewers = new Set(configuration.caseReviewerRefs);
  }

  #now(): number {
    const now = this.#dependencies.now();
    timestamp(now);
    if (now < this.#lastTime) {
      throw new Error("Authoritative clock regressed");
    }
    this.#lastTime = now;
    return now;
  }

  #actor(): string {
    const actor = this.#dependencies.actor();
    reference(actor);
    return actor;
  }

  #reference(): string {
    const ref = this.#dependencies.opaqueRef();
    reference(ref);
    if (this.#usedReferences.has(ref)) {
      throw new Error("Opaque-reference collision");
    }
    this.#usedReferences.add(ref);
    return ref;
  }

  #account(ref: string): Account {
    reference(ref);
    const account = this.#accounts.get(ref);
    if (!account || account.closed) {
      throw new Error("Account unavailable");
    }
    return account;
  }

  #policyCurrent(now: number): boolean {
    return now < this.#configuration.legalReviewExpiresAt;
  }

  #eligible(ref: string, now: number): boolean {
    const account = this.#accounts.get(ref);
    return account !== undefined &&
      !account.closed &&
      account.eligibilityUntil > now &&
      this.#policyCurrent(now);
  }

  #blocked(first: string, second: string): boolean {
    return this.#blocks.has(JSON.stringify([first, second])) ||
      this.#blocks.has(JSON.stringify([second, first]));
  }

  #pairAvailable(first: string, second: string, now: number): boolean {
    if (first === second || this.#blocked(first, second)) return false;
    const a = this.#accounts.get(first);
    const b = this.#accounts.get(second);

    return this.#eligible(first, now) &&
      this.#eligible(second, now) &&
      a !== undefined &&
      b !== undefined &&
      !a.paused &&
      !b.paused;
  }

  #expiry(now: number, ttl: number, maximum: number): number {
    positiveInteger(ttl);
    if (ttl > maximum || !Number.isSafeInteger(now + ttl)) {
      throw new RangeError("Lifetime outside approved limits");
    }
    return now + ttl;
  }

  #bump(account: Account): void {
    if (account.revision >= Number.MAX_SAFE_INTEGER) {
      throw new Error("Account revision capacity exhausted");
    }
    account.revision += 1;
  }

  #receipt(kind: LifecycleKind, now: number): void {
    this.#receipts.push(Object.freeze({
      eventRef: this.#reference(),
      kind,
      occurredAt: now,
      policyRef: this.#configuration.policyRef,
    }));
  }

  #invalidateRelatedDrafts(accountRef: string): void {
    for (const draft of this.#drafts.values()) {
      if (
        draft.ownerRef === accountRef ||
        draft.recipientRef === accountRef ||
        draft.dependencies.some(
          (dependency) => dependency.ownerRef === accountRef,
        )
      ) {
        draft.text = "";
        draft.reviewedRevision = null;
        if (draft.state === "ACTIVE") draft.state = "INVALIDATED";
      }
    }
  }

  #invalidateRelatedPlans(accountRef: string): void {
    for (const pair of this.#pairs.values()) {
      if (pair.participants.includes(accountRef)) {
        pair.proposal = null;
      }
    }
  }

  #grantPermits(
    ownerRef: string,
    recipientRef: string,
    field: ProfileField,
    purpose: Purpose,
    now: number,
  ): boolean {
    const owner = this.#accounts.get(ownerRef);
    const recipient = this.#accounts.get(recipientRef);
    const stored = owner?.fields.get(field);
    const grant = this.#grants.get(
      grantKey(ownerRef, recipientRef, field, purpose),
    );

    if (
      !owner ||
      !recipient ||
      owner.closed ||
      recipient.closed ||
      this.#blocked(ownerRef, recipientRef) ||
      !this.#eligible(ownerRef, now) ||
      !this.#eligible(recipientRef, now) ||
      !stored ||
      !grant
    ) {
      return false;
    }

    if (grant.state === "GRANTED" && now >= grant.expiresAt) {
      grant.state = "EXPIRED";
    }

    return grant.state === "GRANTED" &&
      grant.fieldRevision === stored.revision &&
      now < grant.expiresAt;
  }

  /* Admission -------------------------------------------------------------- */

  createAccount(): void {
    const actor = this.#actor();
    if (this.#accounts.has(actor)) {
      throw new Error("Account already exists");
    }

    this.#accounts.set(actor, {
      closed: false,
      paused: false,
      concealed: false,
      eligibilityUntil: 0,
      revision: 0,
      fields: new Map(),
      comfort: DEFAULT_COMFORT,
    });
  }

  beginAdmission(): AdmissionChallenge {
    const actor = this.#actor();
    this.#account(actor);
    const now = this.#now();

    if (!this.#policyCurrent(now)) {
      throw new Error("Current legal-policy review required");
    }

    // One outstanding admission challenge per account.
    for (const [ref, challenge] of this.#challenges) {
      if (challenge.accountRef === actor) {
        this.#challenges.delete(ref);
      }
    }

    const challenge: AdmissionChallenge = Object.freeze({
      challengeRef: this.#reference(),
      accountRef: actor,
      audience: this.#configuration.audience,
      thresholdYears: this.#configuration.membershipThresholdYears,
      configurationRef: this.#configuration.configurationRef,
      expiresAt: this.#expiry(
        now,
        this.#configuration.admissionChallengeTtlMs,
        this.#configuration.admissionChallengeTtlMs,
      ),
    });

    this.#challenges.set(challenge.challengeRef, challenge);
    return challenge;
  }

  async completeAdmission(
    challengeRef: string,
    presentation: unknown,
  ): Promise<boolean> {
    reference(challengeRef);
    const actor = this.#actor();
    this.#account(actor);

    const challenge = this.#challenges.get(challengeRef);
    const startedAt = this.#now();

    if (
      !challenge ||
      challenge.accountRef !== actor ||
      startedAt >= challenge.expiresAt ||
      !this.#policyCurrent(startedAt)
    ) {
      return false;
    }

    const evidence = await this.#dependencies.verifyAgeEvidence(
      presentation,
      challenge,
    );

    const now = this.#now();
    const current = this.#challenges.get(challengeRef);

    // Recheck after the asynchronous verifier completes.
    if (
      current !== challenge ||
      now >= challenge.expiresAt ||
      !this.#policyCurrent(now)
    ) {
      return false;
    }

    const account = this.#account(actor);
    this.#challenges.delete(challengeRef);

    const valid =
      evidence.thresholdSatisfied === true &&
      evidence.challengeRef === challenge.challengeRef &&
      evidence.accountRef === actor &&
      evidence.audience === challenge.audience &&
      evidence.thresholdYears === challenge.thresholdYears &&
      evidence.configurationRef === challenge.configurationRef &&
      Number.isSafeInteger(evidence.validUntil) &&
      evidence.validUntil > now;

    if (!valid) return false;

    account.eligibilityUntil = Math.min(
      evidence.validUntil,
      this.#configuration.legalReviewExpiresAt,
    );
    this.#bump(account);
    this.#receipt("eligibility_updated", now);
    return true;
  }

  /* Profile and disclosure ------------------------------------------------- */

  setProfileField(field: ProfileField, value: ProfileValue): number {
    const actor = this.#actor();
    const account = this.#account(actor);
    const now = this.#now();

    if (!FIELD_SET.has(field)) {
      throw new TypeError("Unsupported profile field");
    }

    if (field === "intents" || field === "interests") {
      const allowed = field === "intents" ? INTENT_SET : INTEREST_SET;
      if (
        !Array.isArray(value) ||
        value.some(
          (item) => typeof item !== "string" || !allowed.has(item),
        ) ||
        new Set(value).size !== value.length
      ) {
        throw new TypeError("Invalid declared selections");
      }
      if (
        field === "intents" &&
        value.includes("still_deciding") &&
        value.length !== 1
      ) {
        throw new TypeError("Select still_deciding alone");
      }
    } else {
      if (typeof value !== "string" || value.length > 2000) {
        throw new TypeError("Invalid profile text");
      }
      if (field === "broad_area_ref" && !this.#areas.has(value)) {
        throw new TypeError("Unknown broad-area context");
      }
    }

    const previous = account.fields.get(field);
    const revision = (previous?.revision ?? 0) + 1;
    if (!Number.isSafeInteger(revision)) {
      throw new Error("Field revision capacity exhausted");
    }

    account.fields.set(field, {
      revision,
      value: copyValue(value),
    });

    for (const grant of this.#grants.values()) {
      if (grant.ownerRef === actor && grant.field === field) {
        grant.state = "REVOKED";
      }
    }

    this.#bump(account);
    this.#invalidateRelatedDrafts(actor);
    this.#invalidateRelatedPlans(actor);
    this.#receipt("profile_updated", now);
    return revision;
  }

  grantField(
    recipientRef: string,
    field: ProfileField,
    purpose: Purpose,
    ttlMs: number,
  ): void {
    const actor = this.#actor();
    const owner = this.#account(actor);
    this.#account(recipientRef);
    const now = this.#now();

    if (
      !FIELD_SET.has(field) ||
      !PURPOSE_SET.has(purpose) ||
      !this.#pairAvailable(actor, recipientRef, now)
    ) {
      throw new Error("Disclosure unavailable");
    }

    const stored = owner.fields.get(field);
    if (!stored) throw new Error("Field unavailable");

    this.#grants.set(grantKey(actor, recipientRef, field, purpose), {
      ownerRef: actor,
      recipientRef,
      field,
      purpose,
      fieldRevision: stored.revision,
      state: "GRANTED",
      expiresAt: this.#expiry(
        now,
        ttlMs,
        this.#configuration.maximumGrantTtlMs,
      ),
    });

    this.#receipt("privacy_updated", now);
  }

  revokeField(
    recipientRef: string,
    field: ProfileField,
    purpose: Purpose,
  ): void {
    const actor = this.#actor();
    this.#account(actor);
    reference(recipientRef);

    if (!FIELD_SET.has(field) || !PURPOSE_SET.has(purpose)) {
      throw new TypeError("Invalid disclosure scope");
    }

    const grant = this.#grants.get(
      grantKey(actor, recipientRef, field, purpose),
    );
    if (grant) grant.state = "REVOKED";

    this.#invalidateRelatedDrafts(actor);
    this.#invalidateRelatedPlans(actor);
    this.#receipt("privacy_updated", this.#now());
  }

  profileForMe(
    ownerRef: string,
    purpose: Purpose = "profile_render",
  ): Readonly<Partial<Record<ProfileField, ProfileValue>>> {
    const recipient = this.#actor();
    const recipientAccount = this.#account(recipient);
    const owner = this.#account(ownerRef);
    const now = this.#now();

    if (!PURPOSE_SET.has(purpose)) {
      throw new TypeError("Invalid projection purpose");
    }
    if (recipientAccount.concealed) {
      return Object.freeze({});
    }

    const result: Partial<Record<ProfileField, ProfileValue>> = {};
    for (const field of PROFILE_FIELDS) {
      if (this.#grantPermits(ownerRef, recipient, field, purpose, now)) {
        result[field] = copyValue(owner.fields.get(field)!.value);
      }
    }
    return Object.freeze(result);
  }

  /* Declared discovery: no scores or identity inference -------------------- */

  discover(
    candidateRefs: readonly string[],
    requiredIntent: Intent | null = null,
    requiredInterest: Interest | null = null,
  ): readonly Readonly<{ candidateRef: string }>[] {
    const actor = this.#actor();
    const viewer = this.#account(actor);
    const now = this.#now();

    if (
      requiredIntent !== null && !INTENT_SET.has(requiredIntent) ||
      requiredInterest !== null && !INTEREST_SET.has(requiredInterest)
    ) {
      throw new TypeError("Invalid discovery choice");
    }

    if (
      viewer.paused ||
      viewer.concealed ||
      !this.#eligible(actor, now)
    ) {
      return Object.freeze([]);
    }

    const seen = new Set<string>();
    const result: Readonly<{ candidateRef: string }>[] = [];

    for (const candidateRef of candidateRefs) {
      reference(candidateRef);
      if (seen.has(candidateRef)) {
        throw new TypeError("Duplicate candidate");
      }
      seen.add(candidateRef);

      if (!this.#pairAvailable(actor, candidateRef, now)) continue;

      // Both members must permit identification in this pair context.
      if (
        !this.#grantPermits(
          candidateRef, actor, "display_name", "profile_render", now,
        ) ||
        !this.#grantPermits(
          actor, candidateRef, "display_name", "profile_render", now,
        )
      ) {
        continue;
      }

      const candidate = this.#account(candidateRef);

      if (requiredIntent !== null) {
        if (
          !this.#grantPermits(
            candidateRef, actor, "intents", "profile_render", now,
          )
        ) continue;
        const value = candidate.fields.get("intents")?.value;
        if (!Array.isArray(value) || !value.includes(requiredIntent)) {
          continue;
        }
      }

      if (requiredInterest !== null) {
        if (
          !this.#grantPermits(
            candidateRef, actor, "interests", "profile_render", now,
          )
        ) continue;
        const value = candidate.fields.get("interests")?.value;
        if (!Array.isArray(value) || !value.includes(requiredInterest)) {
          continue;
        }
      }

      result.push(Object.freeze({ candidateRef }));
    }

    // Preserve the host's already approved chronological/self-directed order.
    return Object.freeze(result);
  }

  /* Private comfort and observer controls --------------------------------- */

  setComfort(input: unknown): ComfortSettings {
    const actor = this.#actor();
    const account = this.#account(actor);
    const data = strictObject(input, [
      "candidatesPerPage",
      "reducedMotion",
      "reducedStimulation",
      "textFirst",
      "reminders",
      "media",
      "sharedDevice",
    ]);

    if (
      ![1, 5, 10].includes(data.candidatesPerPage as number) ||
      !["off", "member_selected_digest"].includes(
        data.reminders as string,
      ) ||
      !["on_request", "standard"].includes(data.media as string)
    ) {
      throw new TypeError("Invalid comfort settings");
    }

    for (const key of [
      "reducedMotion",
      "reducedStimulation",
      "textFirst",
      "sharedDevice",
    ]) {
      if (typeof data[key] !== "boolean") {
        throw new TypeError("Explicit comfort choices required");
      }
    }

    if (
      data.sharedDevice === true &&
      data.reminders !== "off"
    ) {
      throw new TypeError("Shared-device reminders must be off");
    }

    account.comfort = Object.freeze({
      candidatesPerPage: data.candidatesPerPage as 1 | 5 | 10,
      reducedMotion: data.reducedMotion as boolean,
      reducedStimulation: data.reducedStimulation as boolean,
      textFirst: data.textFirst as boolean,
      reminders: data.reminders as ComfortSettings["reminders"],
      media: data.media as ComfortSettings["media"],
      sharedDevice: data.sharedDevice as boolean,
    });

    this.#receipt("preferences_updated", this.#now());
    return account.comfort;
  }

  myComfort(): ComfortSettings {
    return this.#account(this.#actor()).comfort;
  }

  setPaused(paused: boolean): void {
    if (typeof paused !== "boolean") {
      throw new TypeError("Explicit pause choice required");
    }
    const actor = this.#actor();
    const account = this.#account(actor);

    account.paused = paused;
    this.#bump(account);
    this.#invalidateRelatedDrafts(actor);
    this.#invalidateRelatedPlans(actor);
    this.#receipt("connection_updated", this.#now());
  }

  conceal(): void {
    const actor = this.#actor();
    const account = this.#account(actor);
    account.concealed = true;
    this.#invalidateRelatedDrafts(actor);
  }

  reveal(): void {
    // The host should require suitable fresh authentication before calling.
    this.#account(this.#actor()).concealed = false;
  }

  block(otherRef: string): void {
    const actor = this.#actor();
    this.#account(actor);
    this.#account(otherRef);
    if (actor === otherRef) throw new Error("Cannot block self");

    this.#blocks.add(JSON.stringify([actor, otherRef]));
    this.#invalidateRelatedDrafts(actor);

    const pair = this.#pairs.get(pairKey(actor, otherRef));
    if (pair) {
      pair.stage = "CLOSED";
      pair.proposal = null;
    }

    this.#receipt("privacy_updated", this.#now());
  }

  /* Pair participation and planning --------------------------------------- */

  expressInterest(otherRef: string): void {
    const actor = this.#actor();
    const now = this.#now();
    if (!this.#pairAvailable(actor, otherRef, now)) {
      throw new Error("Connection unavailable");
    }

    const key = pairKey(actor, otherRef);
    let pair = this.#pairs.get(key);
    if (!pair) {
      const participants: readonly [string, string] =
        actor < otherRef ? [actor, otherRef] : [otherRef, actor];
      pair = {
        participants,
        stage: "INTEREST_REVIEW",
        revision: 0,
        proposal: null,
      };
      this.#pairs.set(key, pair);
    }

    // Interest is represented as a scoped, revocable connection grant.
    const field = this.#account(actor).fields.get("display_name");
    if (!field) throw new Error("Display name required for this workflow");

    this.#grants.set(
      grantKey(actor, otherRef, "display_name", "profile_render"),
      {
        ownerRef: actor,
        recipientRef: otherRef,
        field: "display_name",
        purpose: "profile_render",
        fieldRevision: field.revision,
        state: "GRANTED",
        expiresAt: this.#expiry(
          now,
          this.#configuration.maximumGrantTtlMs,
          this.#configuration.maximumGrantTtlMs,
        ),
      },
    );

    if (
      pair.stage !== "CLOSED" &&
      this.#grantPermits(
        otherRef, actor, "display_name", "profile_render", now,
      )
    ) {
      pair.stage = "LIMITED_CONVERSATION";
    }

    this.#receipt("connection_updated", now);
  }

  proposePlan(
    otherRef: string,
    input: unknown,
    ttlMs: number,
  ): Readonly<{ proposalRef: string; expiresAt: number }> {
    const actor = this.#actor();
    const now = this.#now();
    const pair = this.#pairs.get(pairKey(actor, otherRef));

    if (
      !pair ||
      pair.stage !== "LIMITED_CONVERSATION" ||
      !this.#pairAvailable(actor, otherRef, now)
    ) {
      throw new Error("Planning unavailable");
    }

    const details = planningDetails(input);
    if (details.startsAt <= now) {
      throw new Error("Plan must be in the future");
    }

    if (pair.revision >= Number.MAX_SAFE_INTEGER) {
      throw new Error("Pair revision capacity exhausted");
    }
    pair.revision += 1;

    const proposalRef = this.#reference();
    const expiresAt = this.#expiry(
      now,
      ttlMs,
      this.#configuration.maximumProposalTtlMs,
    );

    const [first, second] = pair.participants;
    pair.proposal = {
      proposalRef,
      details,
      pairRevision: pair.revision,
      accountRevisions: [
        this.#account(first).revision,
        this.#account(second).revision,
      ],
      expiresAt,
      confirmations: new Set(),
    };

    return Object.freeze({ proposalRef, expiresAt });
  }

  planForMe(otherRef: string): Readonly<PlanningDetails> | null {
    const actor = this.#actor();
    const account = this.#account(actor);
    const now = this.#now();
    const pair = this.#pairs.get(pairKey(actor, otherRef));

    if (
      account.concealed ||
      !pair ||
      !this.#pairAvailable(actor, otherRef, now) ||
      !this.#planCurrent(pair, now)
    ) {
      return null;
    }

    return Object.freeze({ ...pair.proposal!.details });
  }

  #planCurrent(pair: Pair, now: number): boolean {
    const proposal = pair.proposal;
    if (!proposal || now >= proposal.expiresAt) return false;

    const [first, second] = pair.participants;
    return proposal.pairRevision === pair.revision &&
      proposal.accountRevisions[0] === this.#account(first).revision &&
      proposal.accountRevisions[1] === this.#account(second).revision;
  }

  confirmPlan(otherRef: string, proposalRef: string): boolean {
    const actor = this.#actor();
    const now = this.#now();
    const pair = this.#pairs.get(pairKey(actor, otherRef));

    if (
      !pair ||
      !this.#pairAvailable(actor, otherRef, now) ||
      !this.#planCurrent(pair, now) ||
      pair.proposal!.proposalRef !== proposalRef
    ) {
      return false;
    }

    pair.proposal!.confirmations.add(actor);
    if (pair.proposal!.confirmations.size === 2) {
      pair.stage = "OPTIONAL_PLANNING";
      this.#receipt("connection_updated", now);
      return true;
    }
    return false;
  }

  /* Drafts: review before controlled submission ---------------------------- */

  createDraft(
    recipientRef: string,
    text: string,
    dependencyFields: readonly ProfileField[],
    ttlMs: number,
  ): string {
    const actor = this.#actor();
    const owner = this.#account(actor);
    const now = this.#now();
    const pair = this.#pairs.get(pairKey(actor, recipientRef));

    if (
      owner.concealed ||
      !pair ||
      !["LIMITED_CONVERSATION", "OPTIONAL_PLANNING"].includes(pair.stage) ||
      !this.#pairAvailable(actor, recipientRef, now)
    ) {
      throw new Error("Composition unavailable");
    }

    if (
      typeof text !== "string" ||
      text.length > 8000 ||
      dependencyFields.some((field) => !FIELD_SET.has(field)) ||
      new Set(dependencyFields).size !== dependencyFields.length
    ) {
      throw new TypeError("Invalid composition");
    }

    const dependencies: Dependency[] = [];
    for (const field of dependencyFields) {
      if (!this.#grantPermits(
        actor, recipientRef, field, "drafting", now,
      )) {
        throw new Error("Protected draft dependency unavailable");
      }

      dependencies.push(Object.freeze({
        ownerRef: actor,
        field,
        fieldRevision: owner.fields.get(field)!.revision,
        purpose: "drafting",
      }));
    }

    const draftRef = this.#reference();
    this.#drafts.set(draftRef, {
      ownerRef: actor,
      recipientRef,
      text,
      contentRevision: 1,
      reviewedRevision: null,
      expiresAt: this.#expiry(
        now,
        ttlMs,
        this.#configuration.maximumDraftTtlMs,
      ),
      dependencies: Object.freeze(dependencies),
      state: "ACTIVE",
    });
    return draftRef;
  }

  #ownedDraft(draftRef: string): Draft {
    reference(draftRef);
    const actor = this.#actor();
    const draft = this.#drafts.get(draftRef);
    if (!draft || draft.ownerRef !== actor) {
      throw new Error("Draft unavailable");
    }
    return draft;
  }

  #draftCurrent(draft: Draft, now: number): boolean {
    if (draft.state !== "ACTIVE") return false;
    if (now >= draft.expiresAt) {
      draft.state = "EXPIRED";
      draft.text = "";
      draft.reviewedRevision = null;
      return false;
    }

    const pair = this.#pairs.get(
      pairKey(draft.ownerRef, draft.recipientRef),
    );

    const valid =
      !this.#account(draft.ownerRef).concealed &&
      this.#pairAvailable(draft.ownerRef, draft.recipientRef, now) &&
      pair !== undefined &&
      ["LIMITED_CONVERSATION", "OPTIONAL_PLANNING"].includes(pair.stage) &&
      draft.dependencies.every((dependency) =>
        this.#account(dependency.ownerRef)
          .fields.get(dependency.field)?.revision ===
            dependency.fieldRevision &&
        this.#grantPermits(
          dependency.ownerRef,
          draft.recipientRef,
          dependency.field,
          dependency.purpose,
          now,
        ));

    if (!valid) {
      draft.state = "INVALIDATED";
      draft.text = "";
      draft.reviewedRevision = null;
    }
    return valid;
  }

  previewDraft(draftRef: string): string | null {
    const draft = this.#ownedDraft(draftRef);
    return this.#draftCurrent(draft, this.#now()) ? draft.text : null;
  }

  reviewDraft(draftRef: string): void {
    const draft = this.#ownedDraft(draftRef);
    if (!this.#draftCurrent(draft, this.#now())) {
      throw new Error("New composition required");
    }
    draft.reviewedRevision = draft.contentRevision;
  }

  takeReviewedSubmission(
    draftRef: string,
  ): Readonly<{
    submissionRef: string;
    recipientRef: string;
    text: string;
  }> | null {
    const draft = this.#ownedDraft(draftRef);
    const now = this.#now();

    if (
      !this.#draftCurrent(draft, now) ||
      draft.reviewedRevision !== draft.contentRevision ||
      !draft.text.trim()
    ) {
      return null;
    }

    const submission = Object.freeze({
      submissionRef: this.#reference(),
      recipientRef: draft.recipientRef,
      text: draft.text,
    });

    draft.state = "CONSUMED";
    draft.text = "";
    draft.reviewedRevision = null;
    return submission;
  }

  discardDraft(draftRef: string): void {
    const draft = this.#ownedDraft(draftRef);
    draft.state = "INVALIDATED";
    draft.text = "";
    draft.reviewedRevision = null;
    this.#receipt("draft_invalidated", this.#now());
  }

  /* Confidential reporting: intake, not automatic restriction -------------- */

  submitReport(
    subjectRef: string,
    category: ReportCategory,
    evidenceRef: string | null = null,
  ): string {
    const reporter = this.#actor();
    this.#account(reporter);
    this.#account(subjectRef);

    if (reporter === subjectRef || !REPORT_SET.has(category)) {
      throw new TypeError("Invalid report target or category");
    }
    if (evidenceRef !== null) reference(evidenceRef);

    const now = this.#now();
    const caseRef = this.#reference();
    this.#cases.set(caseRef, {
      reporterRef: reporter,
      subjectRef,
      category,
      evidenceRef,
      status: "INTAKE",
      createdAt: now,
    });

    // No block, discovery demotion, or integrity restriction is created.
    this.#receipt("report_received", now);
    return caseRef;
  }

  myReportStatus(
    caseRef: string,
  ): Readonly<{ status: CaseRecord["status"] }> {
    const actor = this.#actor();
    const record = this.#cases.get(caseRef);

    if (!record || record.reporterRef !== actor) {
      throw new Error("Case unavailable");
    }

    return Object.freeze({ status: record.status });
  }

  reviewCase(
    caseRef: string,
    status: "UNDER_REVIEW" | "CLOSED",
  ): void {
    const reviewer = this.#actor();
    if (!this.#reviewers.has(reviewer)) {
      throw new Error("Case-review authority required");
    }
    if (status !== "UNDER_REVIEW" && status !== "CLOSED") {
      throw new TypeError("Invalid case status");
    }

    const record = this.#cases.get(caseRef);
    if (!record) throw new Error("Case unavailable");

    if (
      record.status === "CLOSED" ||
      status === "CLOSED" && record.status !== "UNDER_REVIEW"
    ) {
      throw new Error("Unsupported case transition");
    }

    record.status = status;
  }

  /* Housekeeping and account closure -------------------------------------- */

  sweepExpired(): void {
    const actor = this.#actor();
    if (!this.#reviewers.has(actor)) {
      throw new Error("Maintenance authority required");
    }

    const now = this.#now();
    for (const [ref, challenge] of this.#challenges) {
      if (now >= challenge.expiresAt) this.#challenges.delete(ref);
    }

    for (const grant of this.#grants.values()) {
      if (grant.state === "GRANTED" && now >= grant.expiresAt) {
        grant.state = "EXPIRED";
      }
    }

    for (const draft of this.#drafts.values()) {
      if (now >= draft.expiresAt) {
        draft.text = "";
        draft.reviewedRevision = null;
        if (draft.state === "ACTIVE") draft.state = "EXPIRED";
      }
    }

    for (const pair of this.#pairs.values()) {
      if (pair.proposal && now >= pair.proposal.expiresAt) {
        pair.proposal = null;
      }
    }
  }

  closeMyAccount(): void {
    const actor = this.#actor();
    const account = this.#account(actor);
    account.closed = true;
    account.paused = true;
    account.eligibilityUntil = 0;
    account.fields.clear();

    this.#invalidateRelatedDrafts(actor);

    for (const [ref, challenge] of this.#challenges) {
      if (challenge.accountRef === actor) {
        this.#challenges.delete(ref);
      }
    }

    for (const grant of this.#grants.values()) {
      if (grant.ownerRef === actor || grant.recipientRef === actor) {
        grant.state = "REVOKED";
      }
    }

    for (const pair of this.#pairs.values()) {
      if (pair.participants.includes(actor)) {
        pair.stage = "CLOSED";
        pair.proposal = null;
      }
    }

    // Case retention is separate from ordinary profile closure.
    this.#receipt("account_closed", this.#now());
  }

  lifecycleReceiptsForReview(): readonly LifecycleReceipt[] {
    if (!this.#reviewers.has(this.#actor())) {
      throw new Error("Governance review authority required");
    }
    return Object.freeze([...this.#receipts]);
  }

  commercialRequirement(capability: CoreCapability): "none" {
    if (!(CORE_CAPABILITIES as readonly string[]).includes(capability)) {
      throw new TypeError("Unknown core capability");
    }
    return "none";
  }
}
