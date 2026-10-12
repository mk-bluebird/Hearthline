// SPDX-License-Identifier: MIT OR Apache-2.0

export type IdentityDescription = Readonly<{
  revision: number;
  gender: string | null;
  pronouns: string | null;
}>;

export type IdentityVisibility = Readonly<{
  revision: number;
  genderPermitted: boolean;
  pronounsPermitted: boolean;
}>;

function optionalText(value: string | null): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || value.length > 200) {
    throw new TypeError("Invalid optional self-description");
  }
  const text = value.trim();
  return text === "" ? null : text;
}

export function createIdentityDescription(
  revision: number,
  gender: string | null,
  pronouns: string | null,
): IdentityDescription {
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new TypeError("Invalid identity revision");
  }
  return Object.freeze({
    revision,
    gender: optionalText(gender),
    pronouns: optionalText(pronouns),
  });
}

export function projectIdentity(
  description: IdentityDescription,
  visibility: IdentityVisibility,
): Readonly<{ gender?: string; pronouns?: string }> {
  if (
    !Number.isSafeInteger(visibility.revision) ||
    visibility.revision < 0 ||
    typeof visibility.genderPermitted !== "boolean" ||
    typeof visibility.pronounsPermitted !== "boolean"
  ) {
    throw new TypeError("Invalid visibility decision");
  }

  if (description.revision !== visibility.revision) {
    return Object.freeze({});
  }

  return Object.freeze({
    ...(visibility.genderPermitted && description.gender !== null
      ? { gender: description.gender }
      : {}),
    ...(visibility.pronounsPermitted && description.pronouns !== null
      ? { pronouns: description.pronouns }
      : {}),
  });
}
