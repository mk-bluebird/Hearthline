// SPDX-License-Identifier: MIT OR Apache-2.0

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

export type Intent = (typeof INTENTS)[number];

export const CONTINUITY = [
  "not_specified",
  "one_meeting_at_a_time",
  "occasional",
  "ongoing",
  "open_to_discussing",
] as const;

export type Continuity = (typeof CONTINUITY)[number];

export type IntentCard = Readonly<{
  revision: number;
  intents: readonly Intent[];
  continuity: Continuity;
}>;

export type RecipientPermission = Readonly<{
  cardRevision: number;
  intentsVisible: boolean;
  continuityVisible: boolean;
}>;

export type VisibleIntentCard = Readonly<{
  revision: number;
  intents?: readonly Intent[];
  continuity?: Continuity;
}>;

const VALID_INTENTS = new Set<string>(INTENTS);
const VALID_CONTINUITY = new Set<string>(CONTINUITY);

export function createIntentCard(
  revision: number,
  intents: readonly Intent[],
  continuity: Continuity,
): IntentCard {
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new RangeError("Invalid card revision");
  }
  if (
    !Array.isArray(intents) ||
    intents.some((intent) => !VALID_INTENTS.has(intent)) ||
    new Set(intents).size !== intents.length
  ) {
    throw new TypeError("Invalid or duplicate intent");
  }
  if (!VALID_CONTINUITY.has(continuity)) {
    throw new TypeError("Invalid continuity preference");
  }
  if (intents.includes("still_deciding") && intents.length !== 1) {
    throw new TypeError(
      "Use still_deciding alone, or select specific intentions",
    );
  }

  return Object.freeze({
    revision,
    intents: Object.freeze([...intents]),
    continuity,
  });
}

export function projectForRecipient(
  card: IntentCard,
  permission: RecipientPermission,
): VisibleIntentCard | null {
  if (
    permission.intentsVisible !== true &&
    permission.intentsVisible !== false
  ) {
    throw new TypeError("Explicit visibility decision required");
  }
  if (
    permission.continuityVisible !== true &&
    permission.continuityVisible !== false
  ) {
    throw new TypeError("Explicit visibility decision required");
  }
  if (permission.cardRevision !== card.revision) {
    return null;
  }
  if (!permission.intentsVisible && !permission.continuityVisible) {
    return null;
  }

  return Object.freeze({
    revision: card.revision,
    ...(permission.intentsVisible
      ? { intents: Object.freeze([...card.intents]) }
      : {}),
    ...(permission.continuityVisible
      ? { continuity: card.continuity }
      : {}),
  });
}

export function sharedDeclaredIntents(
  first: VisibleIntentCard,
  second: VisibleIntentCard,
): readonly Intent[] {
  const secondIntents = new Set(second.intents ?? []);

  return Object.freeze(
    (first.intents ?? []).filter(
      (intent) =>
        intent !== "still_deciding" &&
        secondIntents.has(intent),
    ),
  );
}
