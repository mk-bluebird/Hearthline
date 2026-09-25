const REQUIRED_SECTIONS = Object.freeze([
  "purpose",
  "commercial-boundary",
  "consent",
  "logistics",
  "limits"
]);

const REQUIRED_TRACKING_FLAGS = Object.freeze([
  "accountLinkedViewTracking",
  "acknowledgementTracking",
  "analyticsTracking",
  "userRiskScoring"
]);

function assertPlainObject(value, name) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object.`);
  }

  return value;
}

function assertNonEmptyString(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${name} must be a non-empty string.`);
  }

  return value.trim();
}

function assertBoolean(value, name) {
  if (typeof value !== "boolean") {
    throw new TypeError(`${name} must be a boolean.`);
  }

  return value;
}

function cloneAndFreeze(value) {
  return Object.freeze(structuredClone(value));
}

function validateTracking(tracking) {
  const normalized = assertPlainObject(tracking, "compass.tracking");

  for (const field of REQUIRED_TRACKING_FLAGS) {
    if (normalized[field] !== false) {
      throw new Error(`compass.tracking.${field} must be false.`);
    }
  }

  return Object.freeze({
    accountLinkedViewTracking: false,
    acknowledgementTracking: false,
    analyticsTracking: false,
    userRiskScoring: false
  });
}

function validateSections(sections) {
  if (!Array.isArray(sections)) {
    throw new TypeError("compass.plainLanguageSections must be an array.");
  }

  const sectionMap = new Map();

  for (const section of sections) {
    const normalized = assertPlainObject(section, "plainLanguageSection");
    const id = assertNonEmptyString(normalized.id, "plainLanguageSection.id");

    if (sectionMap.has(id)) {
      throw new Error(`Duplicate compass section "${id}".`);
    }

    sectionMap.set(id, Object.freeze({
      id,
      title: assertNonEmptyString(normalized.title, "plainLanguageSection.title"),
      body: assertNonEmptyString(normalized.body, "plainLanguageSection.body")
    }));
  }

  for (const requiredId of REQUIRED_SECTIONS) {
    if (!sectionMap.has(requiredId)) {
      throw new Error(`Compass is missing required section "${requiredId}".`);
    }
  }

  return Object.freeze(
    REQUIRED_SECTIONS.map((requiredId) => sectionMap.get(requiredId))
  );
}

function validateSources(sources) {
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new TypeError("compass.officialSources must contain at least one source.");
  }

  return Object.freeze(
    sources.map((source) => {
      const normalized = assertPlainObject(source, "officialSource");
      const url = assertNonEmptyString(normalized.url, "officialSource.url");

      if (!url.startsWith("https://")) {
        throw new Error("officialSource.url must use HTTPS.");
      }

      return Object.freeze({
        label: assertNonEmptyString(normalized.label, "officialSource.label"),
        url
      });
    })
  );
}

function validateAccessibility(accessibility) {
  const normalized = assertPlainObject(accessibility, "compass.accessibility");

  const requiredFlags = [
    "plainLanguageAvailable",
    "keyboardNavigable",
    "screenReaderStructured",
    "printFriendly",
    "reducedMotionCompatible",
    "textResizeCompatible"
  ];

  for (const field of requiredFlags) {
    if (assertBoolean(normalized[field], `compass.accessibility.${field}`) !== true) {
      throw new Error(`compass.accessibility.${field} must be true.`);
    }
  }

  return Object.freeze(
    Object.fromEntries(requiredFlags.map((field) => [field, true]))
  );
}

export function validateArizonaComplianceCompass(compass) {
  const normalized = assertPlainObject(compass, "compass");

  if (assertNonEmptyString(normalized.objectType, "compass.objectType") !== "ArizonaComplianceCompass") {
    throw new Error('compass.objectType must equal "ArizonaComplianceCompass".');
  }

  if (assertNonEmptyString(normalized.jurisdiction, "compass.jurisdiction") !== "AZ") {
    throw new Error('compass.jurisdiction must equal "AZ".');
  }

  if (normalized.readOnly !== true) {
    throw new Error("compass.readOnly must be true.");
  }

  if (normalized.personalized !== false) {
    throw new Error("compass.personalized must be false.");
  }

  if (normalized.externalActionAuthorized !== false) {
    throw new Error("compass.externalActionAuthorized must be false.");
  }

  return cloneAndFreeze({
    objectType: "ArizonaComplianceCompass",
    version: assertNonEmptyString(normalized.version, "compass.version"),
    jurisdiction: "AZ",
    language: assertNonEmptyString(normalized.language, "compass.language"),
    effectiveDate: assertNonEmptyString(normalized.effectiveDate, "compass.effectiveDate"),
    reviewRequiredBy: assertNonEmptyString(normalized.reviewRequiredBy, "compass.reviewRequiredBy"),
    readOnly: true,
    personalized: false,
    tracking: validateTracking(normalized.tracking),
    nonAdviceNotice: assertNonEmptyString(
      normalized.nonAdviceNotice,
      "compass.nonAdviceNotice"
    ),
    plainLanguageSections: validateSections(normalized.plainLanguageSections),
    officialSources: validateSources(normalized.officialSources),
    accessibility: validateAccessibility(normalized.accessibility),
    externalActionAuthorized: false
  });
}

export function createArizonaCompassResponse(compass) {
  const validatedCompass = validateArizonaComplianceCompass(compass);

  return Object.freeze({
    status: 200,
    headers: Object.freeze({
      "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
      "content-type": "application/json; charset=utf-8",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      "x-hearthline-personalization": "disabled",
      "x-hearthline-tracking": "disabled"
    }),
    body: validatedCompass
  });
}
