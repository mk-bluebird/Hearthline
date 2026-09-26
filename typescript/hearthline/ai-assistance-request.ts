export type AiAssistanceAction =
  | "clarify"
  | "translate"
  | "consent_summary";

export type RetentionMode =
  | "ephemeral"
  | "participant-controlled"
  | "documented-limited-retention";

export interface SingleRequestConsent {
  readonly scope: "single-request";
  readonly grantedAt: string;
  readonly revocable: true;
  readonly informed: true;
}

export interface RetentionDeclaration {
  readonly mode: RetentionMode;
  readonly trainingUseAllowed: false;
  readonly deletionRoute: string;
}

export interface AiAssistanceRequest {
  readonly schemaVersion: "1.0";
  readonly requestId: string;
  readonly action: AiAssistanceAction;
  readonly purpose: string;
  readonly participantSelectedText: string;
  readonly consent: SingleRequestConsent;
  readonly retention: RetentionDeclaration;
  readonly decisionUseProhibited: true;
  readonly personLevelInferenceProhibited: true;
  readonly participantReviewRequired: true;
  readonly requestedAt: string;
}

export interface ValidationIssue {
  readonly path: string;
  readonly code:
    | "required"
    | "type"
    | "format"
    | "enum"
    | "length"
    | "constraint";
  readonly message: string;
}

export type ValidationResult =
  | { readonly ok: true; readonly value: AiAssistanceRequest }
  | { readonly ok: false; readonly issues: readonly ValidationIssue[] };

const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,159}$/;
const ISO_8601_UTC_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;

const ACTIONS = new Set<AiAssistanceAction>([
  "clarify",
  "translate",
  "consent_summary"
]);

const RETENTION_MODES = new Set<RetentionMode>([
  "ephemeral",
  "participant-controlled",
  "documented-limited-retention"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidDateTime(value: string): boolean {
  if (!ISO_8601_UTC_PATTERN.test(value)) {
    return false;
  }

  return !Number.isNaN(Date.parse(value));
}

function pushIssue(
  issues: ValidationIssue[],
  path: string,
  code: ValidationIssue["code"],
  message: string
): void {
  issues.push({ path, code, message });
}

function readString(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: ValidationIssue[],
  options: { min?: number; max?: number; pattern?: RegExp } = {}
): string | undefined {
  const value = record[key];

  if (typeof value !== "string") {
    pushIssue(issues, path, "type", "Must be a string.");
    return undefined;
  }

  if (options.min !== undefined && value.trim().length < options.min) {
    pushIssue(
      issues,
      path,
      "length",
      `Must contain at least ${options.min} non-whitespace characters.`
    );
  }

  if (options.max !== undefined && value.length > options.max) {
    pushIssue(
      issues,
      path,
      "length",
      `Must not exceed ${options.max} characters.`
    );
  }

  if (options.pattern && !options.pattern.test(value)) {
    pushIssue(issues, path, "format", "Has an invalid format.");
  }

  return value;
}

function requireExactBoolean(
  record: Record<string, unknown>,
  key: string,
  expected: boolean,
  path: string,
  issues: ValidationIssue[]
): void {
  if (record[key] !== expected) {
    pushIssue(
      issues,
      path,
      "constraint",
      `Must be exactly ${String(expected)}.`
    );
  }
}

function rejectUnexpectedKeys(
  record: Record<string, unknown>,
  allowedKeys: readonly string[],
  path: string,
  issues: ValidationIssue[]
): void {
  const allowed = new Set(allowedKeys);

  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      pushIssue(
        issues,
        path ? `${path}.${key}` : key,
        "constraint",
        "Unexpected field is not permitted."
      );
    }
  }
}

export function validateAiAssistanceRequest(
  input: unknown
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isRecord(input)) {
    return {
      ok: false,
      issues: [
        {
          path: "$",
          code: "type",
          message: "Request must be a JSON object."
        }
      ]
    };
  }

  rejectUnexpectedKeys(
    input,
    [
      "schemaVersion",
      "requestId",
      "action",
      "purpose",
      "participantSelectedText",
      "consent",
      "retention",
      "decisionUseProhibited",
      "personLevelInferenceProhibited",
      "participantReviewRequired",
      "requestedAt"
    ],
    "",
    issues
  );

  if (input.schemaVersion !== "1.0") {
    pushIssue(
      issues,
      "schemaVersion",
      "constraint",
      'Must be exactly "1.0".'
    );
  }

  readString(input, "requestId", "requestId", issues, {
    min: 16,
    max: 160,
    pattern: REQUEST_ID_PATTERN
  });

  const action = readString(input, "action", "action", issues, {
    min: 1,
    max: 64
  });

  if (action !== undefined && !ACTIONS.has(action as AiAssistanceAction)) {
    pushIssue(
      issues,
      "action",
      "enum",
      "Must be one of: clarify, translate, consent_summary."
    );
  }

  readString(input, "purpose", "purpose", issues, {
    min: 16,
    max: 500
  });

  readString(input, "participantSelectedText", "participantSelectedText", issues, {
    min: 1,
    max: 20_000
  });

  requireExactBoolean(
    input,
    "decisionUseProhibited",
    true,
    "decisionUseProhibited",
    issues
  );

  requireExactBoolean(
    input,
    "personLevelInferenceProhibited",
    true,
    "personLevelInferenceProhibited",
    issues
  );

  requireExactBoolean(
    input,
    "participantReviewRequired",
    true,
    "participantReviewRequired",
    issues
  );

  const requestedAt = readString(input, "requestedAt", "requestedAt", issues, {
    min: 20,
    max: 64
  });

  if (requestedAt !== undefined && !isValidDateTime(requestedAt)) {
    pushIssue(
      issues,
      "requestedAt",
      "format",
      "Must be a valid UTC ISO 8601 date-time ending in Z."
    );
  }

  if (!isRecord(input.consent)) {
    pushIssue(issues, "consent", "type", "Must be an object.");
  } else {
    rejectUnexpectedKeys(
      input.consent,
      ["scope", "grantedAt", "revocable", "informed"],
      "consent",
      issues
    );

    if (input.consent.scope !== "single-request") {
      pushIssue(
        issues,
        "consent.scope",
        "constraint",
        'Must be exactly "single-request".'
      );
    }

    const grantedAt = readString(
      input.consent,
      "grantedAt",
      "consent.grantedAt",
      issues,
      { min: 20, max: 64 }
    );

    if (grantedAt !== undefined && !isValidDateTime(grantedAt)) {
      pushIssue(
        issues,
        "consent.grantedAt",
        "format",
        "Must be a valid UTC ISO 8601 date-time ending in Z."
      );
    }

    requireExactBoolean(
      input.consent,
      "revocable",
      true,
      "consent.revocable",
      issues
    );

    requireExactBoolean(
      input.consent,
      "informed",
      true,
      "consent.informed",
      issues
    );
  }

  if (!isRecord(input.retention)) {
    pushIssue(issues, "retention", "type", "Must be an object.");
  } else {
    rejectUnexpectedKeys(
      input.retention,
      ["mode", "trainingUseAllowed", "deletionRoute"],
      "retention",
      issues
    );

    const mode = readString(
      input.retention,
      "mode",
      "retention.mode",
      issues,
      { min: 1, max: 64 }
    );

    if (
      mode !== undefined &&
      !RETENTION_MODES.has(mode as RetentionMode)
    ) {
      pushIssue(
        issues,
        "retention.mode",
        "enum",
        "Must be ephemeral, participant-controlled, or documented-limited-retention."
      );
    }

    requireExactBoolean(
      input.retention,
      "trainingUseAllowed",
      false,
      "retention.trainingUseAllowed",
      issues
    );

    readString(
      input.retention,
      "deletionRoute",
      "retention.deletionRoute",
      issues,
      { min: 8, max: 500 }
    );
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: input as AiAssistanceRequest
  };
}
