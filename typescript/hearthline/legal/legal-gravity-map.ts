export type LegalGravityStatus =
  | "information_only"
  | "reviewed_available"
  | "reviewed_restricted"
  | "not_available"
  | "under_review";

export type LegalFeatureId =
  | "general_adult_connection"
  | "noncommercial_integrity"
  | "coarse_meeting_context"
  | "private_compatibility_discussion"
  | "meeting_plan"
  | "public_activity_invitation"
  | "private_venue_discussion"
  | "financial_or_value_exchange";

export type OfficialSourceType =
  | "statute"
  | "regulation"
  | "official_guidance"
  | "court_opinion"
  | "legislative_summary";

export interface LegalSource {
  readonly label: string;
  readonly url: string;
  readonly sourceType: OfficialSourceType;
}

export interface FeaturePosture {
  readonly featureId: LegalFeatureId;
  readonly status: LegalGravityStatus;
  readonly plainLanguageBoundary: string;
  readonly lastCounselReviewDate: string;
}

export interface AccessibilityDeclaration {
  readonly plainLanguageAvailable: true;
  readonly keyboardNavigable: true;
  readonly screenReaderStructured: true;
  readonly printFriendly: true;
  readonly reducedMotionCompatible: true;
  readonly textResizeCompatible: true;
}

export interface JurisdictionEntry {
  readonly jurisdictionCode: string;
  readonly displayName: string;
  readonly effectiveDate: string;
  readonly reviewRequiredBy: string;
  readonly nonAdviceNotice: string;
  readonly featurePostures: readonly FeaturePosture[];
  readonly officialSources: readonly LegalSource[];
  readonly accessibility: AccessibilityDeclaration;
}

export interface LegalGravityMap {
  readonly objectType: "LegalGravityMap";
  readonly version: string;
  readonly publishedAt: string;
  readonly globalNonAdviceNotice: string;
  readonly tracking: {
    readonly accountLinkedViewTracking: false;
    readonly jurisdictionSelectionTracking: false;
    readonly acknowledgementTracking: false;
    readonly analyticsTracking: false;
    readonly personLevelScoring: false;
  };
  readonly entries: readonly JurisdictionEntry[];
  readonly externalActionAuthorized: false;
}

const ALLOWED_STATUSES = new Set<LegalGravityStatus>([
  "information_only",
  "reviewed_available",
  "reviewed_restricted",
  "not_available",
  "under_review"
]);

const ALLOWED_FEATURES = new Set<LegalFeatureId>([
  "general_adult_connection",
  "noncommercial_integrity",
  "coarse_meeting_context",
  "private_compatibility_discussion",
  "meeting_plan",
  "public_activity_invitation",
  "private_venue_discussion",
  "financial_or_value_exchange"
]);

function assertNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string.`);
  }

  return value.trim();
}

function assertHttpsUrl(value: unknown, field: string): string {
  const url = assertNonEmptyString(value, field);

  if (!url.startsWith("https://")) {
    throw new RangeError(`${field} must begin with https://.`);
  }

  return url;
}

function assertDate(value: unknown, field: string): string {
  const date = assertNonEmptyString(value, field);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new RangeError(`${field} must use YYYY-MM-DD format.`);
  }

  return date;
}

function assertFutureReviewDate(effectiveDate: string, reviewDate: string): void {
  if (new Date(reviewDate).valueOf() <= new Date(effectiveDate).valueOf()) {
    throw new RangeError("reviewRequiredBy must be later than effectiveDate.");
  }
}

function assertAccessibility(
  value: unknown
): AccessibilityDeclaration {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("accessibility must be an object.");
  }

  const accessibility = value as Record<string, unknown>;
  const fields = [
    "plainLanguageAvailable",
    "keyboardNavigable",
    "screenReaderStructured",
    "printFriendly",
    "reducedMotionCompatible",
    "textResizeCompatible"
  ] as const;

  for (const field of fields) {
    if (accessibility[field] !== true) {
      throw new Error(`accessibility.${field} must be true.`);
    }
  }

  return Object.freeze({
    plainLanguageAvailable: true,
    keyboardNavigable: true,
    screenReaderStructured: true,
    printFriendly: true,
    reducedMotionCompatible: true,
    textResizeCompatible: true
  });
}

function validateFeaturePosture(value: unknown): FeaturePosture {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("featurePosture must be an object.");
  }

  const posture = value as Record<string, unknown>;
  const featureId = assertNonEmptyString(posture.featureId, "featurePosture.featureId") as LegalFeatureId;
  const status = assertNonEmptyString(posture.status, "featurePosture.status") as LegalGravityStatus;

  if (!ALLOWED_FEATURES.has(featureId)) {
    throw new RangeError(`Unsupported featureId "${featureId}".`);
  }

  if (!ALLOWED_STATUSES.has(status)) {
    throw new RangeError(`Unsupported legal-map status "${status}".`);
  }

  return Object.freeze({
    featureId,
    status,
    plainLanguageBoundary: assertNonEmptyString(
      posture.plainLanguageBoundary,
      "featurePosture.plainLanguageBoundary"
    ),
    lastCounselReviewDate: assertDate(
      posture.lastCounselReviewDate,
      "featurePosture.lastCounselReviewDate"
    )
  });
}

function validateSource(value: unknown): LegalSource {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("source must be an object.");
  }

  const source = value as Record<string, unknown>;
  const sourceType = assertNonEmptyString(source.sourceType, "source.sourceType") as OfficialSourceType;

  const allowedSourceTypes = new Set<OfficialSourceType>([
    "statute",
    "regulation",
    "official_guidance",
    "court_opinion",
    "legislative_summary"
  ]);

  if (!allowedSourceTypes.has(sourceType)) {
    throw new RangeError(`Unsupported source type "${sourceType}".`);
  }

  return Object.freeze({
    label: assertNonEmptyString(source.label, "source.label"),
    url: assertHttpsUrl(source.url, "source.url"),
    sourceType
  });
}

export function validateLegalGravityMap(value: unknown): LegalGravityMap {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("legalGravityMap must be an object.");
  }

  const map = value as Record<string, unknown>;

  if (map.objectType !== "LegalGravityMap") {
    throw new Error('objectType must equal "LegalGravityMap".');
  }

  if (map.externalActionAuthorized !== false) {
    throw new Error("externalActionAuthorized must be false.");
  }

  if (map.tracking === null || typeof map.tracking !== "object" || Array.isArray(map.tracking)) {
    throw new TypeError("tracking must be an object.");
  }

  const tracking = map.tracking as Record<string, unknown>;
  const trackingFields = [
    "accountLinkedViewTracking",
    "jurisdictionSelectionTracking",
    "acknowledgementTracking",
    "analyticsTracking",
    "personLevelScoring"
  ] as const;

  for (const field of trackingFields) {
    if (tracking[field] !== false) {
      throw new Error(`tracking.${field} must be false.`);
    }
  }

  if (!Array.isArray(map.entries) || map.entries.length === 0) {
    throw new TypeError("entries must be a non-empty array.");
  }

  const entries = map.entries.map((entryValue): JurisdictionEntry => {
    if (entryValue === null || typeof entryValue !== "object" || Array.isArray(entryValue)) {
      throw new TypeError("jurisdiction entry must be an object.");
    }

    const entry = entryValue as Record<string, unknown>;
    const effectiveDate = assertDate(entry.effectiveDate, "entry.effectiveDate");
    const reviewRequiredBy = assertDate(entry.reviewRequiredBy, "entry.reviewRequiredBy");

    assertFutureReviewDate(effectiveDate, reviewRequiredBy);

    if (!Array.isArray(entry.featurePostures) || entry.featurePostures.length === 0) {
      throw new TypeError("entry.featurePostures must be a non-empty array.");
    }

    if (!Array.isArray(entry.officialSources) || entry.officialSources.length === 0) {
      throw new TypeError("entry.officialSources must be a non-empty array.");
    }

    return Object.freeze({
      jurisdictionCode: assertNonEmptyString(entry.jurisdictionCode, "entry.jurisdictionCode"),
      displayName: assertNonEmptyString(entry.displayName, "entry.displayName"),
      effectiveDate,
      reviewRequiredBy,
      nonAdviceNotice: assertNonEmptyString(entry.nonAdviceNotice, "entry.nonAdviceNotice"),
      featurePostures: Object.freeze(entry.featurePostures.map(validateFeaturePosture)),
      officialSources: Object.freeze(entry.officialSources.map(validateSource)),
      accessibility: assertAccessibility(entry.accessibility)
    });
  });

  return Object.freeze({
    objectType: "LegalGravityMap",
    version: assertNonEmptyString(map.version, "version"),
    publishedAt: assertNonEmptyString(map.publishedAt, "publishedAt"),
    globalNonAdviceNotice: assertNonEmptyString(
      map.globalNonAdviceNotice,
      "globalNonAdviceNotice"
    ),
    tracking: Object.freeze({
      accountLinkedViewTracking: false,
      jurisdictionSelectionTracking: false,
      acknowledgementTracking: false,
      analyticsTracking: false,
      personLevelScoring: false
    }),
    entries: Object.freeze(entries),
    externalActionAuthorized: false
  });
}

export function readJurisdictionEntry(
  legalGravityMap: LegalGravityMap,
  jurisdictionCode: string
): JurisdictionEntry | null {
  const normalizedCode = assertNonEmptyString(jurisdictionCode, "jurisdictionCode");

  return legalGravityMap.entries.find(
    (entry) => entry.jurisdictionCode === normalizedCode
  ) ?? null;
}
