// SPDX-License-Identifier: MIT OR Apache-2.0

export type DiscoveryInputs = Readonly<{
  revision: number;
  intentIds: readonly string[];
  interestIds: readonly string[];
  broadAreaRef: string | null;
}>;

export type ReviewedVocabulary = Readonly<{
  intentIds: ReadonlySet<string>;
  interestIds: ReadonlySet<string>;
  broadAreaRefs: ReadonlySet<string>;
}>;

const FIELDS = new Set([
  "revision",
  "intentIds",
  "interestIds",
  "broadAreaRef",
]);

function identifiers(
  value: unknown,
  allowed: ReadonlySet<string>,
): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.some(
      (item) => typeof item !== "string" || !allowed.has(item),
    ) ||
    new Set(value).size !== value.length
  ) {
    throw new TypeError("Invalid declared selection");
  }
  return Object.freeze([...value]);
}

export function parseDiscoveryInputs(
  input: unknown,
  vocabulary: ReviewedVocabulary,
): DiscoveryInputs {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new TypeError("Expected a discovery data object");
  }

  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("Expected a plain data object");
  }

  const keys = Reflect.ownKeys(input);
  if (
    keys.length !== FIELDS.size ||
    keys.some(
      (key) => typeof key !== "string" || !FIELDS.has(key),
    )
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
    throw new TypeError("Invalid discovery revision");
  }

  if (
    data.broadAreaRef !== null &&
    (
      typeof data.broadAreaRef !== "string" ||
      !vocabulary.broadAreaRefs.has(data.broadAreaRef)
    )
  ) {
    throw new TypeError("Invalid broad-area choice");
  }

  return Object.freeze({
    revision: data.revision,
    intentIds: identifiers(data.intentIds, vocabulary.intentIds),
    interestIds: identifiers(data.interestIds, vocabulary.interestIds),
    broadAreaRef: data.broadAreaRef as string | null,
  });
}
