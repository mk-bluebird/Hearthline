// SPDX-License-Identifier: MIT OR Apache-2.0

export type BroadAreaChoice = Readonly<{
  revision: number;
  areaRef: string | null;
  includeRemote: boolean;
}>;

export type AreaCatalog = ReadonlyMap<string, string>;

export function parseBroadAreaChoice(
  input: unknown,
  catalog: AreaCatalog,
): BroadAreaChoice {
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

  const allowed = new Set(["revision", "areaRef", "includeRemote"]);
  const keys = Reflect.ownKeys(input);

  if (
    keys.length !== allowed.size ||
    keys.some(
      (key) => typeof key !== "string" || !allowed.has(key),
    )
  ) {
    throw new TypeError("Undeclared or missing context fields");
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
    data.revision < 0 ||
    typeof data.includeRemote !== "boolean"
  ) {
    throw new TypeError("Invalid revision or remote choice");
  }

  if (
    data.areaRef !== null &&
    (
      typeof data.areaRef !== "string" ||
      !catalog.has(data.areaRef)
    )
  ) {
    throw new TypeError("Unknown broad area");
  }

  return Object.freeze({
    revision: data.revision,
    areaRef: data.areaRef as string | null,
    includeRemote: data.includeRemote,
  });
}

export function areaLabel(
  choice: BroadAreaChoice,
  catalog: AreaCatalog,
): string {
  if (choice.areaRef === null) {
    return "No broad area selected";
  }

  const label = catalog.get(choice.areaRef);
  if (label === undefined) {
    throw new Error("Selected area is no longer in the catalog");
  }

  return label;
}
