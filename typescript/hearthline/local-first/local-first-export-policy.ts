export type LocalFirstRetentionMode =
  | "disabled"
  | "session_only"
  | "local_expiring"
  | "until_deleted"
  | "export_only";

export type LocalFirstContentType =
  | "afterglow_reflection"
  | "mutuality_reflection"
  | "desire_cartography"
  | "privacy_comfort_note"
  | "meeting_conditions_note"
  | "social_rhythm_note"
  | "private_checkin_plan"
  | "scroll_depth_companion";

export interface LocalFirstExportEnvelope {
  readonly format: "hearthline-local-first-export";
  readonly schemaVersion: "v1";
  readonly createdAt: string;
  readonly contentType: LocalFirstContentType;
  readonly ciphertext: string;
  readonly encryptionMetadata: {
    readonly algorithm: "implementation_review_required";
    readonly salt: string;
    readonly nonce: string;
    readonly integrityProtected: true;
  };
  readonly warning: string;
  readonly networkTransportAuthorized: false;
  readonly autoMergeAuthorized: false;
  readonly externalActionAuthorized: false;
}

export interface LocalFirstImportDecision {
  readonly action: "import" | "replace_local" | "discard";
  readonly userInitiated: true;
  readonly automaticMerge: false;
  readonly networkTransportAuthorized: false;
  readonly externalActionAuthorized: false;
}

function assertNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${fieldName} must be a non-empty string.`);
  }

  return value.trim();
}

function assertIsoDate(value: unknown, fieldName: string): string {
  const normalized = assertNonEmptyString(value, fieldName);
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.valueOf())) {
    throw new RangeError(`${fieldName} must be a valid ISO-8601 date-time.`);
  }

  return parsed.toISOString();
}

export function validateLocalFirstExport(
  value: unknown
): LocalFirstExportEnvelope {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("export envelope must be an object.");
  }

  const envelope = value as Record<string, unknown>;

  if (envelope.format !== "hearthline-local-first-export") {
    throw new Error("format must equal hearthline-local-first-export.");
  }

  if (envelope.schemaVersion !== "v1") {
    throw new Error("schemaVersion must equal v1.");
  }

  if (envelope.networkTransportAuthorized !== false) {
    throw new Error("networkTransportAuthorized must be false.");
  }

  if (envelope.autoMergeAuthorized !== false) {
    throw new Error("autoMergeAuthorized must be false.");
  }

  if (envelope.externalActionAuthorized !== false) {
    throw new Error("externalActionAuthorized must be false.");
  }

  if (
    envelope.encryptionMetadata === null ||
    typeof envelope.encryptionMetadata !== "object" ||
    Array.isArray(envelope.encryptionMetadata)
  ) {
    throw new TypeError("encryptionMetadata must be an object.");
  }

  const metadata = envelope.encryptionMetadata as Record<string, unknown>;

  if (metadata.algorithm !== "implementation_review_required") {
    throw new Error(
      "The export policy does not select an encryption algorithm before review."
    );
  }

  if (metadata.integrityProtected !== true) {
    throw new Error("integrityProtected must be true.");
  }

  return Object.freeze({
    format: "hearthline-local-first-export",
    schemaVersion: "v1",
    createdAt: assertIsoDate(envelope.createdAt, "createdAt"),
    contentType: assertNonEmptyString(
      envelope.contentType,
      "contentType"
    ) as LocalFirstContentType,
    ciphertext: assertNonEmptyString(envelope.ciphertext, "ciphertext"),
    encryptionMetadata: Object.freeze({
      algorithm: "implementation_review_required",
      salt: assertNonEmptyString(metadata.salt, "encryptionMetadata.salt"),
      nonce: assertNonEmptyString(metadata.nonce, "encryptionMetadata.nonce"),
      integrityProtected: true
    }),
    warning: assertNonEmptyString(envelope.warning, "warning"),
    networkTransportAuthorized: false,
    autoMergeAuthorized: false,
    externalActionAuthorized: false
  });
}

export function validateImportDecision(
  decision: LocalFirstImportDecision
): LocalFirstImportDecision {
  if (decision.userInitiated !== true) {
    throw new Error("Local import must be user initiated.");
  }

  if (decision.automaticMerge !== false) {
    throw new Error("Automatic merge is prohibited.");
  }

  if (decision.networkTransportAuthorized !== false) {
    throw new Error("Network transport is prohibited by default.");
  }

  if (decision.externalActionAuthorized !== false) {
    throw new Error("External action is prohibited.");
  }

  return Object.freeze({ ...decision });
}
