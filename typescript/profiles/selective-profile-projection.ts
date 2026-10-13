// SPDX-License-Identifier: MIT OR Apache-2.0

export const PROFILE_FIELDS = [
  "display_name",
  "photo_ref",
  "city_region",
  "interests",
  "meeting_preference",
  "phone_number",
  "external_handle",
] as const;

export type ProfileField = (typeof PROFILE_FIELDS)[number];
export type Purpose = "profile_render" | "drafting" | "export";

export type FieldValue = Readonly<{
  revision: number;
  value: string | readonly string[];
}>;

export type Profile = Readonly<
  Partial<Record<ProfileField, FieldValue>>
>;

export type FieldGrant = Readonly<{
  field: ProfileField;
  fieldRevision: number;
  recipientRef: string;
  purpose: Purpose;
  state: "GRANTED" | "REVOKED" | "EXPIRED";
  grantedAt: number;
  expiresAt: number;
}>;

export function projectProfile(
  profile: Profile,
  grants: readonly FieldGrant[],
  recipientRef: string,
  purpose: Purpose,
  now: number,
): Readonly<Partial<Record<ProfileField, string | readonly string[]>>> {
  if (
    !recipientRef.trim() ||
    !["profile_render", "drafting", "export"].includes(purpose) ||
    !Number.isSafeInteger(now) ||
    now < 0
  ) {
    throw new TypeError("Invalid projection context");
  }

  const result: Partial<
    Record<ProfileField, string | readonly string[]>
  > = {};

  for (const field of PROFILE_FIELDS) {
    const stored = profile[field];
    if (stored === undefined) continue;

    if (
      !Number.isSafeInteger(stored.revision) ||
      stored.revision < 0 ||
      (
        typeof stored.value !== "string" &&
        !(
          Array.isArray(stored.value) &&
          stored.value.every((item) => typeof item === "string")
        )
      )
    ) {
      throw new TypeError("Invalid stored field");
    }

    const matching = grants.filter(
      (grant) =>
        grant.field === field &&
        grant.recipientRef === recipientRef &&
        grant.purpose === purpose,
    );

    // The authoritative store must supply one current grant per scope.
    if (matching.length !== 1) continue;
    const grant = matching[0];

    if (
      grant.state !== "GRANTED" ||
      grant.fieldRevision !== stored.revision ||
      !Number.isSafeInteger(grant.grantedAt) ||
      !Number.isSafeInteger(grant.expiresAt) ||
      grant.grantedAt < 0 ||
      grant.expiresAt <= grant.grantedAt ||
      now < grant.grantedAt ||
      now >= grant.expiresAt
    ) {
      continue;
    }

    result[field] = typeof stored.value === "string"
      ? stored.value
      : Object.freeze([...stored.value]);
  }

  return Object.freeze(result);
}
