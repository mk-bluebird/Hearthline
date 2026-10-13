// SPDX-License-Identifier: MIT OR Apache-2.0

export type ResourceCategory =
  | "social_connection"
  | "community_information"
  | "legal_information"
  | "health_information"
  | "transit_information"
  | "digital_access";

export type ResourceRecord = Readonly<{
  resourceRef: string;
  title: string;
  category: ResourceCategory;
  sourceUrl: string;
  coverageAreaRefs: readonly string[];
  remoteAvailable: boolean;
  status: "listed" | "unknown" | "withdrawn";
  reviewedAt: number;
  reviewAfter: number;
}>;

export type AreaChoice = Readonly<{
  areaRef: string | null;
  includeRemote: boolean;
}>;

export type ProductPrice = Readonly<{
  productRef: string;
  configurationRef: string;
  currency: string;
  amountMinor: number;
  appliesToEligibleAdults: boolean;
}>;

const CATEGORIES = new Set<string>([
  "social_connection",
  "community_information",
  "legal_information",
  "health_information",
  "transit_information",
  "digital_access",
]);

function reference(value: string): void {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("Nonempty reference required");
  }
}

function validTime(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("Invalid timestamp");
  }
}

export function browseResources(
  records: readonly ResourceRecord[],
  category: ResourceCategory,
  choice: AreaChoice,
  now: number,
): readonly ResourceRecord[] {
  if (
    !CATEGORIES.has(category) ||
    typeof choice.includeRemote !== "boolean" ||
    (
      choice.areaRef !== null &&
      (typeof choice.areaRef !== "string" || !choice.areaRef.trim())
    )
  ) {
    throw new TypeError("Invalid member-selected browsing choice");
  }
  validTime(now);

  const seen = new Set<string>();
  const selected: ResourceRecord[] = [];

  for (const record of records) {
    reference(record.resourceRef);
    reference(record.title);

    const source = new URL(record.sourceUrl);
    if (
      seen.has(record.resourceRef) ||
      !CATEGORIES.has(record.category) ||
      source.protocol !== "https:" ||
      source.username !== "" ||
      source.password !== "" ||
      typeof record.remoteAvailable !== "boolean" ||
      !["listed", "unknown", "withdrawn"].includes(record.status) ||
      record.coverageAreaRefs.some(
        (area) => typeof area !== "string" || !area.trim(),
      ) ||
      new Set(record.coverageAreaRefs).size !==
        record.coverageAreaRefs.length
    ) {
      throw new TypeError("Invalid resource record");
    }

    validTime(record.reviewedAt);
    validTime(record.reviewAfter);
    if (
      record.reviewedAt > now ||
      record.reviewAfter <= record.reviewedAt
    ) {
      throw new TypeError("Invalid resource freshness");
    }
    seen.add(record.resourceRef);

    const selectedContext =
      record.remoteAvailable && choice.includeRemote ||
      (
        choice.areaRef !== null &&
        record.coverageAreaRefs.includes(choice.areaRef)
      );

    if (
      record.category === category &&
      record.status === "listed" &&
      now < record.reviewAfter &&
      selectedContext
    ) {
      selected.push(Object.freeze({
        ...record,
        coverageAreaRefs: Object.freeze([...record.coverageAreaRefs]),
      }));
    }
  }

  return Object.freeze(selected);
}

export function validateEqualAdultPrices(
  prices: readonly ProductPrice[],
  productRef: string,
  configurationRef: string,
): void {
  reference(productRef);
  reference(configurationRef);

  const applicable = prices.filter((price) =>
    price.productRef === productRef &&
    price.configurationRef === configurationRef &&
    price.appliesToEligibleAdults,
  );

  if (applicable.length === 0) {
    throw new Error("No price is configured for this product");
  }

  const first = applicable[0];
  reference(first.currency);

  if (
    !Number.isSafeInteger(first.amountMinor) ||
    first.amountMinor < 0
  ) {
    throw new TypeError("Invalid product price");
  }

  for (const price of applicable) {
    reference(price.productRef);
    reference(price.configurationRef);
    reference(price.currency);

    if (
      !Number.isSafeInteger(price.amountMinor) ||
      price.amountMinor < 0 ||
      price.currency !== first.currency ||
      price.amountMinor !== first.amountMinor
    ) {
      throw new Error(
        "Age-differentiated or inconsistent eligible-adult pricing",
      );
    }
  }
}
