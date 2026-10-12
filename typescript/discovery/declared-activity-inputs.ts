// SPDX-License-Identifier: MIT OR Apache-2.0

const INTERESTS = [
  "walking",
  "arts",
  "games",
  "learning",
  "conversation",
  "community_activities",
] as const;

const MODES = ["remote", "public_place", "either"] as const;
const PACES = ["self_directed", "unhurried", "open_to_discussing"] as const;

export type ActivityInputs = Readonly<{
  revision: number;
  interests: readonly (typeof INTERESTS)[number][];
  mode: (typeof MODES)[number];
  pace: (typeof PACES)[number];
}>;

const FIELDS = new Set(["revision", "interests", "mode", "pace"]);
const VALID_INTERESTS = new Set<string>(INTERESTS);
const VALID_MODES = new Set<string>(MODES);
const VALID_PACES = new Set<string>(PACES);

export function parseActivityInputs(input: unknown): ActivityInputs {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input)
  ) {
    throw new TypeError("Expected an activity-input object");
  }

  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("Expected a plain data object");
  }

  const keys = Reflect.ownKeys(input);
  if (
    keys.length !== FIELDS.size ||
    keys.some((key) => typeof key !== "string" || !FIELDS.has(key))
  ) {
    throw new TypeError("Undeclared or missing discovery fields");
  }

  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !("value" in descriptor)) {
      throw new TypeError("Accessors are not accepted");
    }
  }

  const data = input as Record<string, unknown>;

  if (
    typeof data.revision !== "number" ||
    !Number.isSafeInteger(data.revision) ||
    data.revision < 0
  ) {
    throw new TypeError("Invalid revision");
  }

  if (
    !Array.isArray(data.interests) ||
    data.interests.some(
      (value) =>
        typeof value !== "string" || !VALID_INTERESTS.has(value),
    ) ||
    new Set(data.interests).size !== data.interests.length
  ) {
    throw new TypeError("Invalid or duplicate interests");
  }

  if (
    typeof data.mode !== "string" ||
    !VALID_MODES.has(data.mode) ||
    typeof data.pace !== "string" ||
    !VALID_PACES.has(data.pace)
  ) {
    throw new TypeError("Invalid mode or pace");
  }

  return Object.freeze({
    revision: data.revision,
    interests: Object.freeze(
      [...data.interests] as (typeof INTERESTS)[number][],
    ),
    mode: data.mode as ActivityInputs["mode"],
    pace: data.pace as ActivityInputs["pace"],
  });
}
