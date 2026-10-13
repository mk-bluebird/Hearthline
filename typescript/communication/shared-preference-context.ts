// SPDX-License-Identifier: MIT OR Apache-2.0

export const COMMUNICATION_LABELS = {
  text_first: "Text first",
  ask_before_voice: "Ask before voice calls",
  ask_before_video: "Ask before video calls",
  asynchronous: "Asynchronous conversation",
  occasional: "Occasional conversation",
  brief: "Brief exchanges",
  longer: "Longer conversation",
  direct: "Direct wording",
  formal: "Formal tone",
  casual: "Casual tone",
  playful: "Playful tone",
} as const;

export type CommunicationPreference =
  keyof typeof COMMUNICATION_LABELS;

function validate(
  values: readonly CommunicationPreference[],
): void {
  if (
    !Array.isArray(values) ||
    values.some((value) =>
      !Object.prototype.hasOwnProperty.call(
        COMMUNICATION_LABELS,
        value,
      )) ||
    new Set(values).size !== values.length
  ) {
    throw new TypeError("Invalid declared preferences");
  }
}

export function sharedPreferenceContext(
  firstVisible: readonly CommunicationPreference[],
  secondVisible: readonly CommunicationPreference[],
): readonly string[] {
  validate(firstVisible);
  validate(secondVisible);

  const first = new Set(firstVisible);
  const second = new Set(secondVisible);

  return Object.freeze(
    (Object.keys(COMMUNICATION_LABELS) as CommunicationPreference[])
      .filter((key) => first.has(key) && second.has(key))
      .map((key) => COMMUNICATION_LABELS[key]),
  );
}
