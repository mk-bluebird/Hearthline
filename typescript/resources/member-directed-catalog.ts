// SPDX-License-Identifier: MIT OR Apache-2.0

export const RESOURCE_CATEGORIES = [
  "counseling",
  "housing",
  "food",
  "healthcare",
  "legal_aid",
  "employment",
  "financial_assistance",
  "community_centers",
  "libraries",
  "transit_assistance",
] as const;

export type ResourceCategory =
  (typeof RESOURCE_CATEGORIES)[number];

export type ResourceRecord = Readonly<{
  resourceRef: string;
  title: string;
  category: ResourceCategory;
  sourceUrl: string;
  coverageRefs: readonly string[];
  statewide: boolean;
  eligibilityNote: string;
  reviewedAt: number;
  reviewAfter: number;
  status: "listed" | "withdrawn" | "unknown";
}>;

const CATEGORIES = new Set<string>(RESOURCE_CATEGORIES);

export function browseResources(
  records: readonly ResourceRecord[],
  category: ResourceCategory,
  selectedAreaRef: string | null,
  now: number,
): readonly ResourceRecord[] {
  if (
    !CATEGORIES.has(category) ||
    !Number.isSafeInteger(now) ||
    now < 0 ||
    (
      selectedAreaRef !== null &&
      (
        typeof selectedAreaRef !== "string" ||
        !selectedAreaRef.trim()
      )
    )
  ) {
    throw new TypeError("Invalid resource browsing choice");
  }

  const selected: ResourceRecord[] = [];
  const seen = new Set<string>();

  for (const record of records) {
    const source = new URL(record.sourceUrl);

    if (
      !record.resourceRef.trim() ||
      seen.has(record.resourceRef) ||
      !record.title.trim() ||
      !CATEGORIES.has(record.category) ||
      source.protocol !== "https:" ||
      source.username !== "" ||
      source.password !== "" ||
      typeof record.statewide !== "boolean" ||
      typeof record.eligibilityNote !== "string" ||
      record.coverageRefs.some(
        (ref) => typeof ref !== "string" || !ref.trim(),
      ) ||
      new Set(record.coverageRefs).size !== record.coverageRefs.length ||
      !Number.isSafeInteger(record.reviewedAt) ||
      record.reviewedAt < 0 ||
      record.reviewedAt > now ||
      !Number.isSafeInteger(record.reviewAfter) ||
      record.reviewAfter <= record.reviewedAt ||
      !["listed", "withdrawn", "unknown"].includes(record.status)
    ) {
      throw new TypeError("Invalid resource record");
    }
    seen.add(record.resourceRef);

    const withinSelectedCoverage =
      record.statewide ||
      (
        selectedAreaRef !== null &&
        record.coverageRefs.includes(selectedAreaRef)
      );

    if (
      record.category === category &&
      record.status === "listed" &&
      now < record.reviewAfter &&
      withinSelectedCoverage
    ) {
      selected.push(Object.freeze({
        ...record,
        coverageRefs: Object.freeze([...record.coverageRefs]),
      }));
    }
  }

  // Preserve reviewed catalog order; do not rank by inferred need.
  return Object.freeze(selected);
}
