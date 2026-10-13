// SPDX-License-Identifier: MIT OR Apache-2.0

export type FacilityType =
  | "park"
  | "library"
  | "community_center"
  | "public_cultural_space";

export type PublicFacility = Readonly<{
  facilityRef: string;
  title: string;
  type: FacilityType;
  broadAreaRef: string;
  sourceUrl: string;
  status: "listed" | "closed" | "unknown";
  reviewedAt: number;
  reviewAfter: number;
}>;

const TYPES = new Set<string>([
  "park",
  "library",
  "community_center",
  "public_cultural_space",
]);

export function browseThirdPlaces(
  facilities: readonly PublicFacility[],
  selectedAreaRef: string,
  selectedTypes: readonly FacilityType[],
  now: number,
): readonly PublicFacility[] {
  if (
    typeof selectedAreaRef !== "string" ||
    !selectedAreaRef.trim() ||
    !Number.isSafeInteger(now) ||
    now < 0 ||
    selectedTypes.some((type) => !TYPES.has(type)) ||
    new Set(selectedTypes).size !== selectedTypes.length
  ) {
    throw new TypeError("Invalid public-facility browsing choice");
  }

  const types = new Set(selectedTypes);
  const seen = new Set<string>();
  const result: PublicFacility[] = [];

  for (const facility of facilities) {
    const url = new URL(facility.sourceUrl);

    if (
      !facility.facilityRef.trim() ||
      seen.has(facility.facilityRef) ||
      !facility.title.trim() ||
      !facility.broadAreaRef.trim() ||
      !TYPES.has(facility.type) ||
      !["listed", "closed", "unknown"].includes(facility.status) ||
      url.protocol !== "https:" ||
      url.username !== "" ||
      url.password !== "" ||
      !Number.isSafeInteger(facility.reviewedAt) ||
      facility.reviewedAt < 0 ||
      facility.reviewedAt > now ||
      !Number.isSafeInteger(facility.reviewAfter) ||
      facility.reviewAfter <= facility.reviewedAt
    ) {
      throw new TypeError("Invalid public-facility record");
    }
    seen.add(facility.facilityRef);

    if (
      facility.broadAreaRef === selectedAreaRef &&
      facility.status === "listed" &&
      now < facility.reviewAfter &&
      (types.size === 0 || types.has(facility.type))
    ) {
      result.push(Object.freeze({ ...facility }));
    }
  }

  return Object.freeze(result);
}
