// SPDX-License-Identifier: MIT OR Apache-2.0

export const CORE_CAPABILITIES = [
  "eligibility_support",
  "discovery",
  "permissioned_text",
  "ordinary_drafting",
  "consent_controls",
  "privacy_controls",
  "accessibility_controls",
  "block_and_report",
  "review_and_appeal",
  "account_security",
  "account_recovery",
  "account_export",
  "account_deletion",
  "public_resource_browsing",
  "optional_planning",
  "private_reflection",
] as const;

export type CoreCapability =
  (typeof CORE_CAPABILITIES)[number];

const CORE = new Set<string>(CORE_CAPABILITIES);

export function commercialRequirement(
  capability: CoreCapability,
): "none" {
  if (!CORE.has(capability)) {
    throw new TypeError("Unknown core capability");
  }
  return "none";
}

export type AccessSettings = Readonly<{
  revision: number;
  media: "on_request" | "standard";
  backgroundPrefetch: boolean;
  sharedDevice: boolean;
  persistentLocalDrafts: boolean;
  deviceNotifications: boolean;
}>;

const FIELDS = new Set([
  "revision",
  "media",
  "backgroundPrefetch",
  "sharedDevice",
  "persistentLocalDrafts",
  "deviceNotifications",
]);

export function parseAccessSettings(input: unknown): AccessSettings {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new TypeError("Expected access settings");
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
    throw new TypeError("Undeclared or missing access fields");
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
    (data.media !== "on_request" && data.media !== "standard")
  ) {
    throw new TypeError("Invalid revision or media preference");
  }

  for (const field of [
    "backgroundPrefetch",
    "sharedDevice",
    "persistentLocalDrafts",
    "deviceNotifications",
  ]) {
    if (typeof data[field] !== "boolean") {
      throw new TypeError("Explicit access choices are required");
    }
  }

  if (
    data.sharedDevice &&
    (data.persistentLocalDrafts || data.deviceNotifications)
  ) {
    throw new TypeError(
      "Shared-device mode requires no persistent drafts or notifications",
    );
  }

  if (data.media === "on_request" && data.backgroundPrefetch) {
    throw new TypeError(
      "On-request media requires background prefetch to be disabled",
    );
  }

  return Object.freeze({
    revision: data.revision,
    media: data.media,
    backgroundPrefetch: data.backgroundPrefetch as boolean,
    sharedDevice: data.sharedDevice as boolean,
    persistentLocalDrafts: data.persistentLocalDrafts as boolean,
    deviceNotifications: data.deviceNotifications as boolean,
  });
}
