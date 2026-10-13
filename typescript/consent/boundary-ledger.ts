// SPDX-License-Identifier: MIT OR Apache-2.0

export const BOUNDARY_ACTIONS = Object.freeze([
  "start_voice_call",
  "start_video_call",
  "send_explicit_media",
  "open_sexual_topic",
  "share_location",
  "start_recording",
  "propose_private_meeting",
] as const);

export type BoundaryAction = (typeof BOUNDARY_ACTIONS)[number];

export type BoundaryRule =
  | "not_permitted"
  | "ask_first"
  | "open_to_review";

export type BoundaryDeclaration = Readonly<{
  action: BoundaryAction;
  rule: BoundaryRule;
  revision: number;
}>;

export type BoundaryDecision =
  | "eligible_for_operation_review"
  | "not_currently_available";

export type BoundaryEvaluation = Readonly<{
  recipientRef: string;
  action: BoundaryAction;
  expectedBoundaryRevision: number;
  currentOperationPermission: boolean;
  participationPermits: boolean;
  acknowledgmentRequired: boolean;
}>;

export type BoundaryDisclosureView = Readonly<{
  declaration: BoundaryDeclaration;
  expiresAt: number;
  acknowledged: boolean;
}>;

type Disclosure = Readonly<{
  revision: number;
  expiresAt: number;
}>;

const ACTIONS: ReadonlySet<string> = new Set(BOUNDARY_ACTIONS);

const RULES: ReadonlySet<string> = new Set([
  "not_permitted",
  "ask_first",
  "open_to_review",
]);

function requireReference(value: unknown): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError("Nonempty reference required");
  }
}

function requireTimestamp(value: unknown): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new TypeError("Invalid timestamp");
  }
}

function requireRevision(value: unknown): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1
  ) {
    throw new TypeError("Invalid revision");
  }
}

function requireBoolean(value: unknown): asserts value is boolean {
  if (typeof value !== "boolean") {
    throw new TypeError("Explicit boolean decision required");
  }
}

function requireAction(
  value: unknown,
): asserts value is BoundaryAction {
  if (typeof value !== "string" || !ACTIONS.has(value)) {
    throw new TypeError("Unknown boundary action");
  }
}

function requireRule(value: unknown): asserts value is BoundaryRule {
  if (typeof value !== "string" || !RULES.has(value)) {
    throw new TypeError("Unknown boundary rule");
  }
}

function plainRecord(
  input: unknown,
): Record<string, unknown> {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new TypeError("Expected a plain data object");
  }

  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("Expected a plain data object");
  }

  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string") {
      throw new TypeError("Symbol fields are not accepted");
    }

    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (
      descriptor === undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError("Expected enumerable data fields");
    }
  }

  return input as Record<string, unknown>;
}

function assertExactKeys(
  input: Record<string, unknown>,
  allowed: readonly string[],
  required: readonly string[] = [],
): void {
  const allowedSet = new Set(allowed);

  if (Object.keys(input).some((key) => !allowedSet.has(key))) {
    throw new TypeError("Undeclared field");
  }

  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) {
      throw new TypeError("Required field missing");
    }
  }
}

/* Boundary ledger */

export class BoundaryLedger {
  #rules = new Map<BoundaryAction, BoundaryDeclaration>();
  #disclosures = new Map<string, Map<BoundaryAction, Disclosure>>();
  #acknowledgments = new Map<string, Map<BoundaryAction, number>>();

  readonly #ownerRef: string;
  readonly #authenticatedActor: () => string;
  readonly #now: () => number;

  constructor(
    ownerRef: string,
    authenticatedActor: () => string,
    now: () => number,
  ) {
    requireReference(ownerRef);

    if (
      typeof authenticatedActor !== "function" ||
      typeof now !== "function"
    ) {
      throw new TypeError("Actor and clock functions are required");
    }

    this.#ownerRef = ownerRef;
    this.#authenticatedActor = authenticatedActor;
    this.#now = now;
  }

  #actor(): string {
    const actor = this.#authenticatedActor();
    requireReference(actor);
    return actor;
  }

  #owner(): void {
    if (this.#actor() !== this.#ownerRef) {
      throw new Error("Boundary owner authorization required");
    }
  }

  #time(): number {
    const time = this.#now();
    requireTimestamp(time);
    return time;
  }

  #recipient(recipientRef: string): void {
    requireReference(recipientRef);

    if (recipientRef === this.#ownerRef) {
      throw new TypeError("Recipient must differ from boundary owner");
    }
  }

  #removeDisclosure(
    recipientRef: string,
    action: BoundaryAction,
  ): void {
    const disclosures = this.#disclosures.get(recipientRef);
    disclosures?.delete(action);

    if (disclosures?.size === 0) {
      this.#disclosures.delete(recipientRef);
    }

    const acknowledgments = this.#acknowledgments.get(recipientRef);
    acknowledgments?.delete(action);

    if (acknowledgments?.size === 0) {
      this.#acknowledgments.delete(recipientRef);
    }
  }

  #currentDisclosure(
    recipientRef: string,
    action: BoundaryAction,
    time: number,
  ): {
    declaration: BoundaryDeclaration;
    disclosure: Disclosure;
  } | null {
    const declaration = this.#rules.get(action);
    const disclosure = this.#disclosures.get(recipientRef)?.get(action);

    if (
      declaration === undefined ||
      disclosure === undefined ||
      time >= disclosure.expiresAt ||
      disclosure.revision !== declaration.revision
    ) {
      if (disclosure !== undefined) {
        this.#removeDisclosure(recipientRef, action);
      }
      return null;
    }

    return { declaration, disclosure };
  }

  declare(
    action: BoundaryAction,
    rule: BoundaryRule,
  ): BoundaryDeclaration {
    this.#owner();
    requireAction(action);
    requireRule(rule);

    const previousRevision = this.#rules.get(action)?.revision ?? 0;
    if (previousRevision >= Number.MAX_SAFE_INTEGER) {
      throw new Error("Boundary revision capacity exhausted");
    }

    const declaration: BoundaryDeclaration = Object.freeze({
      action,
      rule,
      revision: previousRevision + 1,
    });

    this.#rules.set(action, declaration);

    for (const recipientRef of [...this.#disclosures.keys()]) {
      this.#removeDisclosure(recipientRef, action);
    }

    return declaration;
  }

  ownerDeclaration(
    action: BoundaryAction,
  ): BoundaryDeclaration | null {
    this.#owner();
    requireAction(action);
    return this.#rules.get(action) ?? null;
  }

  share(
    recipientRef: string,
    action: BoundaryAction,
    expiresAt: number,
  ): void {
    this.#owner();
    this.#recipient(recipientRef);
    requireAction(action);
    requireTimestamp(expiresAt);

    const declaration = this.#rules.get(action);
    const time = this.#time();

    if (declaration === undefined || expiresAt <= time) {
      throw new TypeError("Invalid boundary disclosure");
    }

    let disclosures = this.#disclosures.get(recipientRef);
    if (disclosures === undefined) {
      disclosures = new Map();
      this.#disclosures.set(recipientRef, disclosures);
    }

    disclosures.set(action, Object.freeze({
      revision: declaration.revision,
      expiresAt,
    }));

    const acknowledgments = this.#acknowledgments.get(recipientRef);
    acknowledgments?.delete(action);
    if (acknowledgments?.size === 0) {
      this.#acknowledgments.delete(recipientRef);
    }
  }

  withdrawDisclosure(
    recipientRef: string,
    action: BoundaryAction,
  ): void {
    this.#owner();
    this.#recipient(recipientRef);
    requireAction(action);
    this.#removeDisclosure(recipientRef, action);
  }

  viewForCurrentRecipient(
    action: BoundaryAction,
  ): BoundaryDeclaration | null {
    requireAction(action);

    const recipientRef = this.#actor();
    const current = this.#currentDisclosure(
      recipientRef,
      action,
      this.#time(),
    );

    return current?.declaration ?? null;
  }

  disclosureForCurrentRecipient(
    action: BoundaryAction,
  ): BoundaryDisclosureView | null {
    requireAction(action);

    const recipientRef = this.#actor();
    const current = this.#currentDisclosure(
      recipientRef,
      action,
      this.#time(),
    );

    if (current === null) return null;

    return Object.freeze({
      declaration: current.declaration,
      expiresAt: current.disclosure.expiresAt,
      acknowledged:
        this.#acknowledgments.get(recipientRef)?.get(action) ===
        current.declaration.revision,
    });
  }

  acknowledge(
    action: BoundaryAction,
    expectedRevision: number,
  ): boolean {
    requireAction(action);
    requireRevision(expectedRevision);

    const recipientRef = this.#actor();
    const current = this.#currentDisclosure(
      recipientRef,
      action,
      this.#time(),
    );

    if (
      current === null ||
      current.declaration.revision !== expectedRevision
    ) {
      return false;
    }

    let acknowledgments = this.#acknowledgments.get(recipientRef);
    if (acknowledgments === undefined) {
      acknowledgments = new Map();
      this.#acknowledgments.set(recipientRef, acknowledgments);
    }

    acknowledgments.set(action, expectedRevision);
    return true;
  }

  withdrawAcknowledgment(action: BoundaryAction): void {
    requireAction(action);
    const recipientRef = this.#actor();
    const acknowledgments = this.#acknowledgments.get(recipientRef);

    acknowledgments?.delete(action);
    if (acknowledgments?.size === 0) {
      this.#acknowledgments.delete(recipientRef);
    }
  }

  evaluateForOwner(
    recipientRef: string,
    action: BoundaryAction,
    currentOperationPermission: boolean,
    participationPermits: boolean,
    acknowledgmentRequired: boolean,
  ): BoundaryDecision {
    this.#owner();
    this.#recipient(recipientRef);
    requireAction(action);
    requireBoolean(currentOperationPermission);
    requireBoolean(participationPermits);
    requireBoolean(acknowledgmentRequired);

    return this.#evaluate(
      recipientRef,
      action,
      currentOperationPermission,
      participationPermits,
      acknowledgmentRequired,
      this.#time(),
    );
  }

  evaluateCurrentForOwner(
    input: BoundaryEvaluation,
  ): BoundaryDecision {
    this.#owner();

    const data = plainRecord(input);
    assertExactKeys(data, [
      "recipientRef",
      "action",
      "expectedBoundaryRevision",
      "currentOperationPermission",
      "participationPermits",
      "acknowledgmentRequired",
    ], [
      "recipientRef",
      "action",
      "expectedBoundaryRevision",
      "currentOperationPermission",
      "participationPermits",
      "acknowledgmentRequired",
    ]);

    requireReference(data.recipientRef);
    this.#recipient(data.recipientRef);
    requireAction(data.action);
    requireRevision(data.expectedBoundaryRevision);
    requireBoolean(data.currentOperationPermission);
    requireBoolean(data.participationPermits);
    requireBoolean(data.acknowledgmentRequired);

    const declaration = this.#rules.get(data.action);

    if (
      declaration === undefined ||
      declaration.revision !== data.expectedBoundaryRevision
    ) {
      return "not_currently_available";
    }

    return this.#evaluate(
      data.recipientRef,
      data.action,
      data.currentOperationPermission,
      data.participationPermits,
      data.acknowledgmentRequired,
      this.#time(),
    );
  }

  #evaluate(
    recipientRef: string,
    action: BoundaryAction,
    currentOperationPermission: boolean,
    participationPermits: boolean,
    acknowledgmentRequired: boolean,
    time: number,
  ): BoundaryDecision {
    const declaration = this.#rules.get(action);

    if (
      declaration === undefined ||
      declaration.rule === "not_permitted" ||
      !currentOperationPermission ||
      !participationPermits
    ) {
      return "not_currently_available";
    }

    if (acknowledgmentRequired) {
      const current = this.#currentDisclosure(
        recipientRef,
        action,
        time,
      );

      if (
        current === null ||
        this.#acknowledgments.get(recipientRef)?.get(action) !==
          declaration.revision
      ) {
        return "not_currently_available";
      }
    }

    return "eligible_for_operation_review";
  }

  sweepExpiredDisclosures(): number {
    this.#owner();
    const time = this.#time();
    let removed = 0;

    for (const [recipientRef, disclosures] of [...this.#disclosures]) {
      for (const [action, disclosure] of [...disclosures]) {
        const declaration = this.#rules.get(action);
        if (
          time >= disclosure.expiresAt ||
          declaration?.revision !== disclosure.revision
        ) {
          this.#removeDisclosure(recipientRef, action);
          removed += 1;
        }
      }
    }

    return removed;
  }
}

/* Relay contract */

export interface RelayBoundary {
  readonly schemaVersion: "1.0";
  readonly allowedOutboundFields: readonly string[];
  readonly forbiddenOutboundFields: readonly string[];
  readonly allowedInboundFields: readonly string[];
  readonly forbiddenInboundFields: readonly string[];
  readonly approverNamed: boolean;
  readonly approverRef: string | null;
  readonly forkProvenanceRequired: true;
  readonly declaredAt: string;
}

export interface RelayBoundaryInput {
  readonly approverNamed?: boolean;
  readonly approverRef?: string | null;
  readonly declaredAt?: string;
  readonly extraOutbound?: readonly string[];
  readonly extraInbound?: readonly string[];
}

export const DEFAULT_OUTBOUND = Object.freeze([
  "schemaVersion",
  "requestId",
  "action",
  "purpose",
  "participantSelectedText",
  "consent",
  "retention",
  "requestedAt",
]);

export const FORBIDDEN_OUTBOUND = Object.freeze([
  "participantId",
  "accountId",
  "deviceFingerprint",
  "ipAddress",
  "geolocation",
  "recoveryStatus",
  "healthStatus",
  "sexualPreference",
  "financialStatus",
  "employerName",
  "homeAddress",
  "relationshipGraph",
  "messageHistory",
  "behavioralPattern",
]);

export const ALLOWED_INBOUND = Object.freeze([
  "suggestionText",
  "suggestionRef",
  "generatedAt",
  "policyVersion",
  "expiresAt",
]);

export const FORBIDDEN_INBOUND = Object.freeze([
  "rankingSignal",
  "trustScore",
  "riskScore",
  "identityInference",
  "recommendedAction",
  "externalContact",
  "thirdPartyCall",
]);

const SECRET_FIELDS = Object.freeze([
  "password",
  "passwords",
  "privateKey",
  "secretKey",
  "recoveryCode",
  "recoveryCodes",
  "accessToken",
  "refreshToken",
  "authorizationHeader",
  "biometricTemplate",
]);

const UNSAFE_PROPERTY_NAMES = new Set([
  "__proto__",
  "prototype",
  "constructor",
]);

function canonicalField(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function fieldNames(input: unknown): readonly string[] {
  if (!Array.isArray(input)) {
    throw new TypeError("Expected field-name list");
  }

  const output: string[] = [];
  const canonicalNames = new Set<string>();

  for (const field of input) {
    if (
      typeof field !== "string" ||
      !/^[A-Za-z][A-Za-z0-9_]*$/.test(field) ||
      UNSAFE_PROPERTY_NAMES.has(field)
    ) {
      throw new TypeError("Invalid relay field name");
    }

    const canonical = canonicalField(field);
    if (canonicalNames.has(canonical)) {
      throw new TypeError("Duplicate or ambiguous relay field");
    }

    canonicalNames.add(canonical);
    output.push(field);
  }

  return Object.freeze(output);
}

function mergedFields(
  base: readonly string[],
  extras: readonly string[],
  forbidden: readonly string[],
): readonly string[] {
  const prohibited = new Set(
    [...forbidden, ...SECRET_FIELDS].map(canonicalField),
  );

  const result: string[] = [];
  const seen = new Set<string>();

  for (const field of [...fieldNames(base), ...fieldNames(extras)]) {
    const canonical = canonicalField(field);

    if (prohibited.has(canonical)) {
      throw new Error("Cannot allow a prohibited relay field");
    }

    if (seen.has(canonical)) {
      if (result.includes(field)) continue;
      throw new TypeError("Ambiguous relay extension");
    }

    seen.add(canonical);
    result.push(field);
  }

  return Object.freeze(result);
}

function utcDateTime(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/
      .test(value)
  ) {
    throw new TypeError("Expected an ISO 8601 UTC date-time");
  }

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new TypeError("Invalid date-time");
  }

  const normalized = new Date(parsed).toISOString();
  if (normalized.slice(0, 19) !== value.slice(0, 19)) {
    throw new TypeError("Invalid calendar date-time");
  }

  return normalized;
}

export function createRelayBoundary(
  input: RelayBoundaryInput = {},
): RelayBoundary {
  const data = plainRecord(input);
  assertExactKeys(data, [
    "approverNamed",
    "approverRef",
    "declaredAt",
    "extraOutbound",
    "extraInbound",
  ]);

  if (data.approverNamed !== undefined) {
    requireBoolean(data.approverNamed);
  }

  const approverRef = data.approverRef ?? null;
  if (approverRef !== null) requireReference(approverRef);

  if (data.approverNamed === true && approverRef === null) {
    throw new TypeError("Named approval requires an approver reference");
  }

  if (data.approverNamed === false && approverRef !== null) {
    throw new TypeError("Conflicting approver declaration");
  }

  const declaredAt = utcDateTime(
    data.declaredAt ?? new Date().toISOString(),
  );

  const extraOutbound = data.extraOutbound === undefined
    ? []
    : fieldNames(data.extraOutbound);

  const extraInbound = data.extraInbound === undefined
    ? []
    : fieldNames(data.extraInbound);

  return Object.freeze({
    schemaVersion: "1.0",
    allowedOutboundFields: mergedFields(
      DEFAULT_OUTBOUND,
      extraOutbound,
      FORBIDDEN_OUTBOUND,
    ),
    forbiddenOutboundFields: FORBIDDEN_OUTBOUND,
    allowedInboundFields: mergedFields(
      ALLOWED_INBOUND,
      extraInbound,
      FORBIDDEN_INBOUND,
    ),
    forbiddenInboundFields: FORBIDDEN_INBOUND,
    approverNamed: approverRef !== null,
    approverRef,
    forkProvenanceRequired: true,
    declaredAt,
  });
}

type RelayDirection = "outbound" | "inbound";

function validatedContract(
  boundary: RelayBoundary,
  direction: RelayDirection,
): {
  allowed: ReadonlySet<string>;
  forbidden: ReadonlySet<string>;
} {
  if (
    boundary.schemaVersion !== "1.0" ||
    boundary.forkProvenanceRequired !== true
  ) {
    throw new TypeError("Unsupported relay boundary");
  }

  utcDateTime(boundary.declaredAt);
  requireBoolean(boundary.approverNamed);

  if (boundary.approverRef !== null) {
    requireReference(boundary.approverRef);
  }

  if (boundary.approverNamed !== (boundary.approverRef !== null)) {
    throw new TypeError("Inconsistent approver declaration");
  }

  const allowedFields = fieldNames(
    direction === "outbound"
      ? boundary.allowedOutboundFields
      : boundary.allowedInboundFields,
  );

  const declaredForbidden = fieldNames(
    direction === "outbound"
      ? boundary.forbiddenOutboundFields
      : boundary.forbiddenInboundFields,
  );

  const baselineForbidden = direction === "outbound"
    ? FORBIDDEN_OUTBOUND
    : FORBIDDEN_INBOUND;

  const forbidden = new Set(
    [
      ...baselineForbidden,
      ...declaredForbidden,
      ...SECRET_FIELDS,
    ].map(canonicalField),
  );

  for (const field of allowedFields) {
    if (forbidden.has(canonicalField(field))) {
      throw new TypeError("Relay allow-list conflicts with prohibition");
    }
  }

  return {
    allowed: new Set(allowedFields),
    forbidden,
  };
}

function assertAllowedKeys(
  boundary: RelayBoundary,
  keys: readonly string[],
  direction: RelayDirection,
): void {
  const contract = validatedContract(boundary, direction);

  for (const key of fieldNames(keys)) {
    if (
      contract.forbidden.has(canonicalField(key)) ||
      !contract.allowed.has(key)
    ) {
      throw new Error("Relay field is not permitted");
    }
  }
}

export function assertOutboundAllowed(
  boundary: RelayBoundary,
  keys: readonly string[],
): void {
  assertAllowedKeys(boundary, keys, "outbound");
}

export function assertInboundAllowed(
  boundary: RelayBoundary,
  keys: readonly string[],
): void {
  assertAllowedKeys(boundary, keys, "inbound");
}

export type RelayJson =
  | null
  | boolean
  | number
  | string
  | readonly RelayJson[]
  | Readonly<{ [key: string]: RelayJson }>;

export type RelayPayload = Readonly<Record<string, RelayJson>>;

function cloneJson(
  value: unknown,
  forbidden: ReadonlySet<string>,
  ancestors: Set<object>,
): RelayJson {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Nonfinite JSON number");
    }
    return value;
  }

  if (typeof value !== "object") {
    throw new TypeError("Expected JSON-compatible relay data");
  }

  if (ancestors.has(value)) {
    throw new TypeError("Cyclic relay payload");
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const keys = Reflect.ownKeys(value);

      if (
        keys.some((key) =>
          typeof key !== "string" ||
          (
            key !== "length" &&
            !/^(0|[1-9]\d*)$/.test(key)
          ))
      ) {
        throw new TypeError("Invalid array properties");
      }

      const result: RelayJson[] = [];

      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(
          value,
          String(index),
        );

        if (
          descriptor === undefined ||
          !("value" in descriptor) ||
          descriptor.enumerable !== true
        ) {
          throw new TypeError("Sparse arrays or accessors are not accepted");
        }

        result.push(cloneJson(
          descriptor.value,
          forbidden,
          ancestors,
        ));
      }

      return Object.freeze(result);
    }

    const data = plainRecord(value);
    const result: Record<string, RelayJson> = Object.create(null);

    for (const key of Object.keys(data)) {
      if (
        UNSAFE_PROPERTY_NAMES.has(key) ||
        forbidden.has(canonicalField(key))
      ) {
        throw new Error("Nested relay field is prohibited");
      }

      result[key] = cloneJson(data[key], forbidden, ancestors);
    }

    return Object.freeze(result);
  } finally {
    ancestors.delete(value);
  }
}

function validatePayload(
  boundary: RelayBoundary,
  payload: unknown,
  direction: RelayDirection,
): RelayPayload {
  const data = plainRecord(payload);
  assertAllowedKeys(boundary, Object.keys(data), direction);

  const forbidden = new Set([
    ...FORBIDDEN_OUTBOUND,
    ...FORBIDDEN_INBOUND,
    ...boundary.forbiddenOutboundFields,
    ...boundary.forbiddenInboundFields,
    ...SECRET_FIELDS,
  ].map(canonicalField));

  return cloneJson(
    data,
    forbidden,
    new Set(),
  ) as RelayPayload;
}

export function validateOutboundPayload(
  boundary: RelayBoundary,
  payload: unknown,
): RelayPayload {
  return validatePayload(boundary, payload, "outbound");
}

export function validateInboundPayload(
  boundary: RelayBoundary,
  payload: unknown,
): RelayPayload {
  return validatePayload(boundary, payload, "inbound");
}

export interface RelayValidationContext {
  readonly now: number;
  readonly expectedRequestId: string;
  readonly expectedConsentRevision: number;
}

export function prepareAssistanceRequest(
  boundary: RelayBoundary,
  payload: unknown,
  context: RelayValidationContext,
): RelayPayload {
  requireTimestamp(context.now);
  requireReference(context.expectedRequestId);
  requireRevision(context.expectedConsentRevision);

  if (!boundary.approverNamed) {
    throw new Error("Approved relay configuration required");
  }

  const safe = validateOutboundPayload(boundary, payload);

  for (const field of DEFAULT_OUTBOUND) {
    if (!Object.prototype.hasOwnProperty.call(safe, field)) {
      throw new TypeError("Required assistance field missing");
    }
  }

  if (
    safe.schemaVersion !== "1.0" ||
    safe.requestId !== context.expectedRequestId ||
    typeof safe.action !== "string" ||
    safe.action.trim() === "" ||
    typeof safe.purpose !== "string" ||
    safe.purpose.trim() === "" ||
    typeof safe.participantSelectedText !== "string"
  ) {
    throw new TypeError("Invalid assistance request");
  }

  const requestedAt = utcDateTime(safe.requestedAt);
  if (Date.parse(requestedAt) > context.now) {
    throw new TypeError("Request date is in the future");
  }

  const consent = plainRecord(safe.consent);
  assertExactKeys(
    consent,
    ["granted", "revision", "expiresAt"],
    ["granted", "revision", "expiresAt"],
  );

  requireBoolean(consent.granted);
  requireRevision(consent.revision);
  const consentExpiry = Date.parse(utcDateTime(consent.expiresAt));

  if (
    !consent.granted ||
    consent.revision !== context.expectedConsentRevision ||
    context.now >= consentExpiry
  ) {
    throw new Error("Current relay permission required");
  }

  const retention = plainRecord(safe.retention);
  assertExactKeys(
    retention,
    ["deleteAfter", "trainingPermitted"],
    ["deleteAfter", "trainingPermitted"],
  );

  requireBoolean(retention.trainingPermitted);
  const deleteAfter = Date.parse(utcDateTime(retention.deleteAfter));

  if (retention.trainingPermitted || deleteAfter <= context.now) {
    throw new Error("Invalid relay retention terms");
  }

  return safe;
}

export function acceptAssistanceSuggestion(
  boundary: RelayBoundary,
  payload: unknown,
  context: Readonly<{
    now: number;
    expectedPolicyVersion: string;
  }>,
): RelayPayload {
  requireTimestamp(context.now);
  requireReference(context.expectedPolicyVersion);

  const safe = validateInboundPayload(boundary, payload);

  for (const field of ALLOWED_INBOUND) {
    if (!Object.prototype.hasOwnProperty.call(safe, field)) {
      throw new TypeError("Required suggestion field missing");
    }
  }

  if (
    typeof safe.suggestionText !== "string" ||
    safe.policyVersion !== context.expectedPolicyVersion
  ) {
    throw new TypeError("Invalid suggestion");
  }

  requireReference(safe.suggestionRef);

  const generatedAt = Date.parse(utcDateTime(safe.generatedAt));
  const expiresAt = Date.parse(utcDateTime(safe.expiresAt));

  if (
    generatedAt > context.now ||
    expiresAt <= generatedAt ||
    context.now >= expiresAt
  ) {
    throw new Error("Suggestion unavailable or expired");
  }

  return safe;
}

/* Deployment requirements and verification evidence */

export interface DeploymentInvariant {
  readonly invariantId: string;
  readonly description: string;
  readonly enforced: boolean;
  readonly testRef: string | null;
}

export interface InvariantEvidence {
  readonly invariantId: string;
  readonly buildRef: string;
  readonly testRef: string;
  readonly passed: boolean;
  readonly verifiedAt: string;
}

export interface VerifiedDeploymentInvariant extends DeploymentInvariant {
  readonly required: true;
  readonly buildRef: string | null;
  readonly verifiedAt: string | null;
}

function requirement(
  invariantId: string,
  description: string,
): DeploymentInvariant {
  return Object.freeze({
    invariantId,
    description,
    enforced: false,
    testRef: null,
  });
}

export const DEFAULT_INVARIANTS:
  readonly DeploymentInvariant[] = Object.freeze([
    requirement(
      "INV-SHELL-001",
      "No third-party telemetry scripts are loaded.",
    ),
    requirement(
      "INV-SHELL-002",
      "Drafts remain local unless explicitly submitted for an allowed purpose.",
    ),
    requirement(
      "INV-SHELL-003",
      "No person-level inference is performed on any input.",
    ),
    requirement(
      "INV-SHELL-004",
      "Consent withdrawal is as accessible as consent granting.",
    ),
    requirement(
      "INV-SHELL-005",
      "AI suggestions require participant review before use.",
    ),
    requirement(
      "INV-SHELL-006",
      "Outbound payloads pass the narrow relay contract.",
    ),
    requirement(
      "INV-SHELL-007",
      "No person-ranking surface exists in the shell.",
    ),
    requirement(
      "INV-SHELL-008",
      "The shell does not store passwords, keys, or recovery material.",
    ),
    requirement(
      "INV-SHELL-009",
      "Accessibility is tested against declared workflows.",
    ),
    requirement(
      "INV-SHELL-010",
      "Fork provenance is disclosed to the participant.",
    ),
  ]);

function cloneInvariant(
  input: DeploymentInvariant,
): DeploymentInvariant {
  requireReference(input.invariantId);
  requireReference(input.description);
  requireBoolean(input.enforced);

  if (input.testRef !== null) {
    requireReference(input.testRef);
  }

  return Object.freeze({
    invariantId: input.invariantId,
    description: input.description,
    enforced: input.enforced,
    testRef: input.testRef,
  });
}

export function createInvariantSet(
  extra: readonly DeploymentInvariant[] = [],
) {
  const ids = new Set<string>();
  const all: DeploymentInvariant[] = [];

  for (const input of [...DEFAULT_INVARIANTS, ...extra]) {
    const invariant = cloneInvariant(input);

    if (ids.has(invariant.invariantId)) {
      throw new Error("Duplicate invariant id");
    }

    ids.add(invariant.invariantId);
    all.push(invariant);
  }

  const evidence = new Map<string, InvariantEvidence>();

  function project(
    invariant: DeploymentInvariant,
  ): VerifiedDeploymentInvariant {
    const verified = evidence.get(invariant.invariantId);

    return Object.freeze({
      invariantId: invariant.invariantId,
      description: invariant.description,
      enforced: verified?.passed === true,
      testRef: verified?.testRef ?? invariant.testRef,
      required: true,
      buildRef: verified?.buildRef ?? null,
      verifiedAt: verified?.verifiedAt ?? null,
    });
  }

  return Object.freeze({
    list(): readonly VerifiedDeploymentInvariant[] {
      return Object.freeze(all.map(project));
    },

    unenforced(): readonly VerifiedDeploymentInvariant[] {
      return Object.freeze(
        all.map(project).filter((invariant) => !invariant.enforced),
      );
    },

    hasTest(invariantId: string): boolean {
      requireReference(invariantId);
      const found = all.find(
        (invariant) => invariant.invariantId === invariantId,
      );
      return found !== undefined && project(found).testRef !== null;
    },

    recordEvidence(input: InvariantEvidence): void {
      requireReference(input.invariantId);
      requireReference(input.buildRef);
      requireReference(input.testRef);
      requireBoolean(input.passed);

      if (!ids.has(input.invariantId)) {
        throw new Error("Evidence references an unknown invariant");
      }

      const verifiedAt = utcDateTime(input.verifiedAt);
      const previous = evidence.get(input.invariantId);

      if (
        previous !== undefined &&
        Date.parse(verifiedAt) < Date.parse(previous.verifiedAt)
      ) {
        throw new Error("Older evidence cannot replace newer evidence");
      }

      evidence.set(input.invariantId, Object.freeze({
        invariantId: input.invariantId,
        buildRef: input.buildRef,
        testRef: input.testRef,
        passed: input.passed,
        verifiedAt,
      }));
    },

    releaseReady(buildRef: string): boolean {
      requireReference(buildRef);
      return all.every((invariant) => {
        const verified = evidence.get(invariant.invariantId);
        return verified?.passed === true &&
          verified.buildRef === buildRef;
      });
    },
  });
}

/* Self-contained contract tests; synthetic fixtures only. */

export interface ContractTestResult {
  readonly testRef: string;
  readonly passed: boolean;
}

function testAssert(
  condition: boolean,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}

function expectFailure(operation: () => unknown): void {
  let failed = false;

  try {
    operation();
  } catch {
    failed = true;
  }

  testAssert(failed, "Expected operation to fail");
}

export function runBoundaryContractTests():
  readonly ContractTestResult[] {
  const results: ContractTestResult[] = [];

  function run(name: string, operation: () => void): void {
    const testRef = `inline:runBoundaryContractTests/${name}`;

    try {
      operation();
      results.push(Object.freeze({ testRef, passed: true }));
    } catch {
      results.push(Object.freeze({ testRef, passed: false }));
    }
  }

  run("revision-and-expiry", () => {
    let actor = "synthetic-owner";
    let time = 100;

    const ledger = new BoundaryLedger(
      "synthetic-owner",
      () => actor,
      () => time,
    );

    const first = ledger.declare("start_voice_call", "ask_first");
    ledger.share("synthetic-recipient", "start_voice_call", 1000);

    actor = "synthetic-recipient";
    testAssert(
      ledger.acknowledge("start_voice_call", first.revision),
      "Acknowledgment should succeed",
    );

    actor = "synthetic-owner";
    testAssert(
      ledger.evaluateForOwner(
        "synthetic-recipient",
        "start_voice_call",
        true,
        true,
        true,
      ) === "eligible_for_operation_review",
      "Current acknowledgment should satisfy review gate",
    );

    const next = ledger.declare("start_voice_call", "open_to_review");

    testAssert(
      ledger.evaluateCurrentForOwner({
        recipientRef: "synthetic-recipient",
        action: "start_voice_call",
        expectedBoundaryRevision: first.revision,
        currentOperationPermission: true,
        participationPermits: true,
        acknowledgmentRequired: false,
      }) === "not_currently_available",
      "Old boundary revision must fail",
    );

    ledger.share("synthetic-recipient", "start_voice_call", 2000);
    actor = "synthetic-recipient";

    testAssert(
      !ledger.acknowledge("start_voice_call", first.revision),
      "Old acknowledgment revision must fail",
    );
    testAssert(
      ledger.acknowledge("start_voice_call", next.revision),
      "Current acknowledgment should succeed",
    );

    time = 2000;
    testAssert(
      ledger.viewForCurrentRecipient("start_voice_call") === null,
      "Disclosure must expire at its deadline",
    );
  });

  run("acknowledgment-does-not-grant-permission", () => {
    let actor = "synthetic-owner";

    const ledger = new BoundaryLedger(
      "synthetic-owner",
      () => actor,
      () => 10,
    );

    const declaration = ledger.declare("start_recording", "ask_first");
    ledger.share("synthetic-recipient", "start_recording", 1000);

    actor = "synthetic-recipient";
    ledger.acknowledge("start_recording", declaration.revision);

    actor = "synthetic-owner";
    testAssert(
      ledger.evaluateForOwner(
        "synthetic-recipient",
        "start_recording",
        false,
        true,
        true,
      ) === "not_currently_available",
      "Acknowledgment cannot substitute for operation permission",
    );
  });

  run("relay-nested-and-alias-rejection", () => {
    const boundary = createRelayBoundary({
      approverRef: "synthetic-reviewer",
      declaredAt: "2026-10-13T00:00:00Z",
    });

    expectFailure(() =>
      createRelayBoundary({
        extraOutbound: ["account_id"],
      }),
    );

    expectFailure(() =>
      validateOutboundPayload(boundary, {
        consent: { nested: { recovery_status: "not-allowed" } },
      }),
    );

    expectFailure(() =>
      validateInboundPayload(boundary, {
        suggestionText: "text",
        riskScore: 1,
      }),
    );

    const input = {
      consent: { granted: true },
    };

    const safe = validateOutboundPayload(boundary, input);
    input.consent.granted = false;

    const copiedConsent = safe.consent as Readonly<{
      granted: boolean;
    }>;

    testAssert(
      copiedConsent.granted === true,
      "Validated payload must not retain mutable input references",
    );
  });

  run("invariant-evidence-is-build-bound", () => {
    const registry = createInvariantSet();

    testAssert(
      registry.unenforced().length === DEFAULT_INVARIANTS.length,
      "Requirements must not claim unverified enforcement",
    );

    for (const invariant of DEFAULT_INVARIANTS) {
      registry.recordEvidence({
        invariantId: invariant.invariantId,
        buildRef: "synthetic-build",
        testRef: "synthetic-evidence-reference",
        passed: true,
        verifiedAt: "2026-10-13T00:00:00Z",
      });
    }

    testAssert(
      registry.releaseReady("synthetic-build"),
      "Matching supplied evidence should satisfy registry checks",
    );
    testAssert(
      !registry.releaseReady("different-synthetic-build"),
      "Evidence must not authorize another build",
    );
  });

  return Object.freeze(results);
}
