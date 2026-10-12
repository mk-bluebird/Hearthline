// SPDX-License-Identifier: MIT OR Apache-2.0

export type AccommodationChoices = Readonly<{
  revision: number;
  textFirst: boolean;
  reducedMotion: boolean;
  reducedStimulation: boolean;
  captionsPreferred: boolean;
  remoteOptionsIncluded: boolean;
}>;

const FIELDS = [
  "revision",
  "textFirst",
  "reducedMotion",
  "reducedStimulation",
  "captionsPreferred",
  "remoteOptionsIncluded",
] as const;

export function parseAccommodationChoices(
  input: unknown,
): AccommodationChoices {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new TypeError("Expected accommodation choices");
  }

  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("Expected a plain data object");
  }

  const keys = Reflect.ownKeys(input);
  if (
    keys.length !== FIELDS.length ||
    keys.some(
      (key) =>
        typeof key !== "string" ||
        !FIELDS.some((field) => field === key),
    )
  ) {
    throw new TypeError("Undeclared or missing accommodation fields");
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
    throw new TypeError("Invalid accommodation revision");
  }

  for (const field of FIELDS.slice(1)) {
    if (typeof data[field] !== "boolean") {
      throw new TypeError("Explicit accommodation choices required");
    }
  }

  return Object.freeze({
    revision: data.revision,
    textFirst: data.textFirst as boolean,
    reducedMotion: data.reducedMotion as boolean,
    reducedStimulation: data.reducedStimulation as boolean,
    captionsPreferred: data.captionsPreferred as boolean,
    remoteOptionsIncluded: data.remoteOptionsIncluded as boolean,
  });
}
