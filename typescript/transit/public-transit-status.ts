// SPDX-License-Identifier: MIT OR Apache-2.0

export type TransitObservation = Readonly<{
  sourceUrl: string;
  kind: "trip_update" | "vehicle_position" | "service_alert";
  publishedAt: number;
  observedAt: number | null;
  fetchedAt: number;
}>;

export type TransitStatus = Readonly<{
  sourceUrl: string;
  kind: TransitObservation["kind"];
  freshness: "current" | "stale" | "unverifiable";
  timestampBasis: "entity" | "unavailable";
  checkedAt: number;
}>;

const MAX_AGE_MS = {
  trip_update: 90_000,
  vehicle_position: 90_000,
  service_alert: 600_000,
} as const;

export function publicTransitStatus(
  observation: TransitObservation,
  now: number,
): TransitStatus {
  const source = new URL(observation.sourceUrl);
  if (
    source.protocol !== "https:" ||
    source.username !== "" ||
    source.password !== ""
  ) {
    throw new TypeError("Invalid public transit source");
  }

  if (
    !Object.prototype.hasOwnProperty.call(
      MAX_AGE_MS,
      observation.kind,
    )
  ) {
    throw new TypeError("Unsupported observation kind");
  }

  for (const time of [
    observation.publishedAt,
    observation.fetchedAt,
    now,
  ]) {
    if (!Number.isSafeInteger(time) || time < 0) {
      throw new TypeError("Invalid timestamp");
    }
  }

  if (
    observation.publishedAt > observation.fetchedAt ||
    observation.fetchedAt > now
  ) {
    throw new TypeError("Inconsistent observation times");
  }

  if (observation.observedAt === null) {
    return Object.freeze({
      sourceUrl: observation.sourceUrl,
      kind: observation.kind,
      freshness: "unverifiable",
      timestampBasis: "unavailable",
      checkedAt: now,
    });
  }

  if (
    !Number.isSafeInteger(observation.observedAt) ||
    observation.observedAt < 0 ||
    observation.observedAt > observation.fetchedAt
  ) {
    throw new TypeError("Invalid entity observation time");
  }

  return Object.freeze({
    sourceUrl: observation.sourceUrl,
    kind: observation.kind,
    freshness:
      now - observation.observedAt <= MAX_AGE_MS[observation.kind]
        ? "current"
        : "stale",
    timestampBasis: "entity",
    checkedAt: now,
  });
}
