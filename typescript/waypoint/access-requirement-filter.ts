// SPDX-License-Identifier: MIT OR Apache-2.0

export type AccessAttribute =
  | "step_free_entrance"
  | "circulation_space"
  | "seating"
  | "accessible_toilet"
  | "transit_access"
  | "lower_noise"
  | "lighting"
  | "indoor_waiting";

export type EvidenceStatus =
  | "reported_present"
  | "reported_absent"
  | "unknown"
  | "conflicting";

export type AccessFact = Readonly<{
  attribute: AccessAttribute;
  status: EvidenceStatus;
  sourceRef: string;
  reviewedAt: number;
  reviewAfter: number;
}>;

export type VenueAccessRecord = Readonly<{
  venueRef: string;
  facts: readonly AccessFact[];
}>;

export type FilteredVenues = Readonly<{
  supported: readonly string[];
  unresolved: readonly string[];
  contradicted: readonly string[];
}>;

const ATTRIBUTES = new Set<string>([
  "step_free_entrance",
  "circulation_space",
  "seating",
  "accessible_toilet",
  "transit_access",
  "lower_noise",
  "lighting",
  "indoor_waiting",
]);

const STATUSES = new Set<string>([
  "reported_present",
  "reported_absent",
  "unknown",
  "conflicting",
]);

export function filterByAccessRequirements(
  venues: readonly VenueAccessRecord[],
  required: readonly AccessAttribute[],
  now: number,
): FilteredVenues {
  if (!Number.isSafeInteger(now) || now < 0) {
    throw new TypeError("Invalid evaluation time");
  }
  if (
    required.length === 0 ||
    required.some((attribute) => !ATTRIBUTES.has(attribute)) ||
    new Set(required).size !== required.length
  ) {
    throw new TypeError("Select distinct, supported requirements");
  }

  const supported: string[] = [];
  const unresolved: string[] = [];
  const contradicted: string[] = [];
  const seenVenues = new Set<string>();

  for (const venue of venues) {
    if (
      typeof venue.venueRef !== "string" ||
      !venue.venueRef.trim() ||
      seenVenues.has(venue.venueRef)
    ) {
      throw new TypeError("Invalid or duplicate venue reference");
    }
    seenVenues.add(venue.venueRef);

    const facts = new Map<AccessAttribute, EvidenceStatus | "stale">();

    for (const fact of venue.facts) {
      if (
        !ATTRIBUTES.has(fact.attribute) ||
        !STATUSES.has(fact.status) ||
        facts.has(fact.attribute) ||
        typeof fact.sourceRef !== "string" ||
        !fact.sourceRef.trim() ||
        !Number.isSafeInteger(fact.reviewedAt) ||
        !Number.isSafeInteger(fact.reviewAfter) ||
        fact.reviewedAt < 0 ||
        fact.reviewedAt > now ||
        fact.reviewAfter <= fact.reviewedAt
      ) {
        throw new TypeError("Invalid access evidence");
      }

      facts.set(
        fact.attribute,
        now >= fact.reviewAfter ? "stale" : fact.status,
      );
    }

    if (
      required.some(
        (attribute) => facts.get(attribute) === "reported_absent",
      )
    ) {
      contradicted.push(venue.venueRef);
    } else if (
      required.every(
        (attribute) => facts.get(attribute) === "reported_present",
      )
    ) {
      supported.push(venue.venueRef);
    } else {
      unresolved.push(venue.venueRef);
    }
  }

  return Object.freeze({
    supported: Object.freeze(supported),
    unresolved: Object.freeze(unresolved),
    contradicted: Object.freeze(contradicted),
  });
}
