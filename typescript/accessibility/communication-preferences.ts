// SPDX-License-Identifier: MIT OR Apache-2.0

export const COMMUNICATION_CHOICES = [
  "text_first",
  "asynchronous",
  "direct_questions",
  "ask_before_calls",
  "ask_before_sensitive_topics",
  "one_topic_at_a_time",
] as const;

export type CommunicationChoice =
  (typeof COMMUNICATION_CHOICES)[number];

export type PreferenceCard = Readonly<{
  revision: number;
  choices: readonly CommunicationChoice[];
}>;

export type RecipientGrant = Readonly<{
  revision: number;
  permittedChoices: readonly CommunicationChoice[];
}>;

const VALID_CHOICES = new Set<string>(COMMUNICATION_CHOICES);

function validateChoices(values: readonly CommunicationChoice[]): void {
  if (
    !Array.isArray(values) ||
    values.some((value) => !VALID_CHOICES.has(value)) ||
    new Set(values).size !== values.length
  ) {
    throw new TypeError("Invalid or duplicate communication choice");
  }
}

function validateRevision(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("Invalid preference revision");
  }
}

export function createPreferenceCard(
  revision: number,
  choices: readonly CommunicationChoice[],
): PreferenceCard {
  validateRevision(revision);
  validateChoices(choices);

  return Object.freeze({
    revision,
    choices: Object.freeze([...choices]),
  });
}

export function projectCommunicationPreferences(
  card: PreferenceCard,
  grant: RecipientGrant,
): readonly CommunicationChoice[] {
  validateRevision(card.revision);
  validateRevision(grant.revision);
  validateChoices(card.choices);
  validateChoices(grant.permittedChoices);

  if (card.revision !== grant.revision) {
    return Object.freeze([]);
  }

  const permitted = new Set(grant.permittedChoices);

  return Object.freeze(
    card.choices.filter((choice) => permitted.has(choice)),
  );
}
