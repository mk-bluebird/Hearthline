// SPDX-License-Identifier: MIT OR Apache-2.0

export type Attribute =
  | "public_access"
  | "seating"
  | "indoor_cooling"
  | "step_free_entrance"
  | "accessible_toilet"
  | "transit_service";

export type Assertion = Readonly<{
  attribute: Attribute;
  value: "reported_present" | "reported_absent" | "unknown";
  sourceUrl: string;
  verifiedAt: number;
  reviewAfter: number;
}>;

export type VenueRecord = Readonly<{
  venueRef: string;
  name: string;
  publicInformationUrl: string;
  assertions: readonly Assertion[];
}>;

export type VenueProjection = Readonly<{
  venueRef: string;
  name: string;
  publicInformationUrl: string;
  requirementStatus: "supported" | "unresolved" | "not_supported";
  facts: readonly Readonly<{
    attribute: Attribute;
    value:
      | "reported_present"
      | "reported_absent"
      | "unknown"
      | "stale";
    sourceUrl: string;
    verifiedAt: number;
  }>[];
}>;

const ATTRIBUTES = new Set<string>([
  "public_access",
  "seating",
  "indoor_cooling",
  "step_free_entrance",
  "accessible_toilet",
  "transit_service",
]);

const VALUES = new Set<string>([
  "reported_present",
  "reported_absent",
  "unknown",
]);

function https(value: string): void {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== ""
  ) {
    throw new TypeError("Expected an HTTPS information source");
  }
}

export function projectVenue(
  record: VenueRecord,
  required: readonly Attribute[],
  now: number,
): VenueProjection {
  if (!Number.isSafeInteger(now) || now < 0) {
    throw new TypeError("Invalid evaluation time");
  }
  if (
    typeof record.venueRef !== "string" ||
    record.venueRef.trim() === "" ||
    typeof record.name !== "string" ||
    record.name.trim() === ""
  ) {
    throw new TypeError("Venue reference and name are required");
  }

  https(record.publicInformationUrl);

  if (
    required.some((value) => !ATTRIBUTES.has(value)) ||
    new Set(required).size !== required.length
  ) {
    throw new TypeError("Invalid requirements");
  }

  const seen = new Set<Attribute>();
  const facts: VenueProjection["facts"][number][] = [];

  for (const assertion of record.assertions) {
    if (
      !ATTRIBUTES.has(assertion.attribute) ||
      !VALUES.has(assertion.value) ||
      seen.has(assertion.attribute) ||
      !Number.isSafeInteger(assertion.verifiedAt) ||
      !Number.isSafeInteger(assertion.reviewAfter) ||
      assertion.verifiedAt < 0 ||
      assertion.verifiedAt > now ||
      assertion.reviewAfter <= assertion.verifiedAt
    ) {
      throw new TypeError("Invalid or duplicate venue assertion");
    }

    https(assertion.sourceUrl);
    seen.add(assertion.attribute);

    facts.push(Object.freeze({
      attribute: assertion.attribute,
      value: now >= assertion.reviewAfter
        ? "stale"
        : assertion.value,
      sourceUrl: assertion.sourceUrl,
      verifiedAt: assertion.verifiedAt,
    }));
  }

  const byAttribute = new Map(
    facts.map((fact) => [fact.attribute, fact.value]),
  );

  const contradicted = required.some(
    (attribute) => byAttribute.get(attribute) === "reported_absent",
  );
  const supported = required.every(
    (attribute) => byAttribute.get(attribute) === "reported_present",
  );

  return Object.freeze({
    venueRef: record.venueRef,
    name: record.name,
    publicInformationUrl: record.publicInformationUrl,
    requirementStatus: contradicted
      ? "not_supported"
      : supported
        ? "supported"
        : "unresolved",
    facts: Object.freeze(facts),
  });
}
