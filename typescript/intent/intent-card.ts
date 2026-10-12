// SPDX-License-Identifier: MIT OR Apache-2.0

export const INTENTS = [
  "conversation",
  "friendship",
  "companionship",
  "shared_activities",
  "dates",
  "romance",
  "intimacy",
  "casual_connection",
  "casual_intimacy",
  "friendship_with_optional_intimacy",
  "still_deciding",
] as const;

export type Intent = (typeof INTENTS)[number];

export const CONTINUITY = [
  "not_specified",
  "one_meeting_at_a_time",
  "occasional",
  "ongoing",
  "open_to_discussing",
] as const;

export type Continuity = (typeof CONTINUITY)[number];

export const PACING = [
  "text_first",
  "public_first",
  "conversation_first",
  "low_pressure",
  "gentle_pacing",
  "short_activity_preferred",
  "slower_replies_welcome",
  "no_photo_required",
  "ask_before_sexual_topics",
  "not_discussing_personal_context_yet",
  "no_answer_needed",
] as const;

export type PacingPreference = (typeof PACING)[number];
export type CardStatus = "active" | "paused";

export const MEMBER_FACING_REMINDER =
  "What you choose here describes what you are open to right now. " +
  "It is not consent to a message, photo, call, meeting, location sharing, " +
  "sexual topic, recording, touch, or intimacy. " +
  "You can change it at any time.";

export type IntentCard = Readonly<{
  revision: number;
  intents: readonly Intent[];
  continuity: Continuity;
  pacing: readonly PacingPreference[];
  status: CardStatus;
}>;

export type IntentCardOptions = Readonly<{
  pacing?: readonly PacingPreference[];
  status?: CardStatus;
}>;

export type IntentCardChanges = Readonly<{
  intents?: readonly Intent[];
  continuity?: Continuity;
  pacing?: readonly PacingPreference[];
  status?: CardStatus;
}>;

export type RecipientPermission = Readonly<{
  cardRevision: number;
  intentsVisible: boolean;
  continuityVisible: boolean;
  pacingVisible?: boolean;
}>;

export type VisibleIntentCard = Readonly<{
  revision: number;
  intents?: readonly Intent[];
  continuity?: Continuity;
  pacing?: readonly PacingPreference[];
}>;

export type DisclosurePurpose =
  | "discovery_presentation"
  | "connection_context";

export type RecipientGrant = Readonly<{
  cardRef: string;
  recipientRef: string;
  purpose: DisclosurePurpose;
  status: "granted" | "revoked";
  notBefore: number;
  expiresAt: number;
  permission: RecipientPermission;
}>;

export type ProjectionContext = Readonly<{
  cardRef: string;
  recipientRef: string;
  purpose: DisclosurePurpose;
  now: number;
}>;

type RecordValue = Record<string, unknown>;

function record(
  value: unknown,
  allowed: readonly string[],
  required: readonly string[],
): RecordValue {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new TypeError("Expected a structured object");
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("Expected a plain object");
  }

  const result = value as RecordValue;

  for (const key of Reflect.ownKeys(result)) {
    if (typeof key !== "string" || !allowed.includes(key)) {
      throw new TypeError("Unknown structured field");
    }

    const descriptor = Object.getOwnPropertyDescriptor(result, key);
    if (descriptor === undefined || !("value" in descriptor)) {
      throw new TypeError("Accessor fields are not supported");
    }
  }

  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(result, key)) {
      throw new TypeError("Missing required structured field");
    }
  }

  return result;
}

function nonnegativeInteger(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new RangeError("Expected a nonnegative safe integer");
  }
  return value;
}

function reference(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 512 ||
    value.trim() !== value ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    throw new TypeError("Invalid reference");
  }
  return value;
}

function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new TypeError("Explicit boolean decision required");
  }
  return value;
}

function memberOf<T extends string>(
  value: unknown,
  choices: readonly T[],
): T {
  if (
    typeof value !== "string" ||
    !choices.includes(value as T)
  ) {
    throw new TypeError("Unsupported structured value");
  }
  return value as T;
}

function selection<T extends string>(
  value: unknown,
  choices: readonly T[],
): readonly T[] {
  if (!Array.isArray(value) || value.length > choices.length) {
    throw new TypeError("Invalid selection");
  }

  const result: T[] = [];
  const seen = new Set<T>();

  for (let index = 0; index < value.length; index += 1) {
    const item = memberOf(value[index], choices);
    if (seen.has(item)) {
      throw new TypeError("Duplicate selection");
    }
    seen.add(item);
    result.push(item);
  }

  return Object.freeze(result);
}

export function parseIntentCard(value: unknown): IntentCard {
  const input = record(
    value,
    ["revision", "intents", "continuity", "pacing", "status"],
    ["revision", "intents", "continuity"],
  );

  return Object.freeze({
    revision: nonnegativeInteger(input.revision),
    intents: selection(input.intents, INTENTS),
    continuity: memberOf(input.continuity, CONTINUITY),
    pacing: selection(input.pacing ?? [], PACING),
    status: memberOf(input.status ?? "active", ["active", "paused"]),
  });
}

export function createIntentCard(
  revision: number,
  intents: readonly Intent[],
  continuity: Continuity,
  options: IntentCardOptions = {},
): IntentCard {
  const settings = record(options, ["pacing", "status"], []);

  return parseIntentCard({
    revision,
    intents,
    continuity,
    pacing: settings.pacing ?? [],
    status: settings.status ?? "active",
  });
}

export function reviseIntentCard(
  current: IntentCard,
  revision: number,
  changes: IntentCardChanges,
): IntentCard {
  const card = parseIntentCard(current);
  const nextRevision = nonnegativeInteger(revision);

  if (nextRevision <= card.revision) {
    throw new RangeError("Revision must increase");
  }

  const update = record(
    changes,
    ["intents", "continuity", "pacing", "status"],
    [],
  );

  if (Object.keys(update).length === 0) {
    throw new TypeError("At least one change is required");
  }

  for (const key of Object.keys(update)) {
    if (update[key] === undefined || update[key] === null) {
      throw new TypeError("Changes must contain explicit values");
    }
  }

  return parseIntentCard({
    revision: nextRevision,
    intents: update.intents ?? card.intents,
    continuity: update.continuity ?? card.continuity,
    pacing: update.pacing ?? card.pacing,
    status: update.status ?? card.status,
  });
}

function parsePermission(value: unknown): RecipientPermission {
  const input = record(
    value,
    [
      "cardRevision",
      "intentsVisible",
      "continuityVisible",
      "pacingVisible",
    ],
    ["cardRevision", "intentsVisible", "continuityVisible"],
  );

  return Object.freeze({
    cardRevision: nonnegativeInteger(input.cardRevision),
    intentsVisible: boolean(input.intentsVisible),
    continuityVisible: boolean(input.continuityVisible),
    pacingVisible: input.pacingVisible === undefined
      ? false
      : boolean(input.pacingVisible),
  });
}

// Structural projection only; authorization is a separate entry point.
export function projectForRecipient(
  card: IntentCard,
  permission: RecipientPermission,
): VisibleIntentCard | null {
  const current = parseIntentCard(card);
  const fields = parsePermission(permission);

  if (
    current.status !== "active" ||
    fields.cardRevision !== current.revision ||
    (
      !fields.intentsVisible &&
      !fields.continuityVisible &&
      !fields.pacingVisible
    )
  ) {
    return null;
  }

  return Object.freeze({
    revision: current.revision,
    ...(fields.intentsVisible ? { intents: current.intents } : {}),
    ...(fields.continuityVisible
      ? { continuity: current.continuity }
      : {}),
    ...(fields.pacingVisible ? { pacing: current.pacing } : {}),
  });
}

export function authorizedRecipientProjection(
  card: IntentCard,
  grant: RecipientGrant | null,
  context: ProjectionContext,
): VisibleIntentCard | null {
  const request = record(
    context,
    ["cardRef", "recipientRef", "purpose", "now"],
    ["cardRef", "recipientRef", "purpose", "now"],
  );

  const cardRef = reference(request.cardRef);
  const recipientRef = reference(request.recipientRef);
  const purpose = memberOf(request.purpose, [
    "discovery_presentation",
    "connection_context",
  ]);
  const now = nonnegativeInteger(request.now);

  if (grant === null) return null;

  const input = record(
    grant,
    [
      "cardRef",
      "recipientRef",
      "purpose",
      "status",
      "notBefore",
      "expiresAt",
      "permission",
    ],
    [
      "cardRef",
      "recipientRef",
      "purpose",
      "status",
      "notBefore",
      "expiresAt",
      "permission",
    ],
  );

  const grantCard = reference(input.cardRef);
  const grantRecipient = reference(input.recipientRef);
  const grantPurpose = memberOf(input.purpose, [
    "discovery_presentation",
    "connection_context",
  ]);
  const status = memberOf(input.status, ["granted", "revoked"]);
  const notBefore = nonnegativeInteger(input.notBefore);
  const expiresAt = nonnegativeInteger(input.expiresAt);
  const permission = parsePermission(input.permission);

  if (expiresAt <= notBefore) {
    throw new RangeError("Invalid grant validity period");
  }

  if (
    status !== "granted" ||
    grantCard !== cardRef ||
    grantRecipient !== recipientRef ||
    grantPurpose !== purpose ||
    now < notBefore ||
    now >= expiresAt
  ) {
    return null;
  }

  return projectForRecipient(card, permission);
}

function parseVisibleCard(value: unknown): VisibleIntentCard {
  const input = record(
    value,
    ["revision", "intents", "continuity", "pacing"],
    ["revision"],
  );

  return Object.freeze({
    revision: nonnegativeInteger(input.revision),
    ...(Object.prototype.hasOwnProperty.call(input, "intents")
      ? { intents: selection(input.intents, INTENTS) }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(input, "continuity")
      ? { continuity: memberOf(input.continuity, CONTINUITY) }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(input, "pacing")
      ? { pacing: selection(input.pacing, PACING) }
      : {}),
  });
}

export function sharedDeclaredIntents(
  first: VisibleIntentCard,
  second: VisibleIntentCard,
): readonly Intent[] {
  const firstCard = parseVisibleCard(first);
  const secondCard = parseVisibleCard(second);
  const secondIntents = new Set(secondCard.intents ?? []);

  return Object.freeze(
    (firstCard.intents ?? []).filter(
      (intent) =>
        intent !== "still_deciding" &&
        secondIntents.has(intent),
    ),
  );
}
