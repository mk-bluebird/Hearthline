const CAPSULE_PURPOSES = Object.freeze([
  "meeting_detail",
  "private_note_to_match",
  "boundary_reminder",
  "closure_note"
]);

const CAPSULE_STATES = Object.freeze([
  "draft_local",
  "proposed",
  "active",
  "deleted",
  "expired",
  "revoked"
]);

const TERMINAL_STATES = new Set([
  "deleted",
  "expired",
  "revoked"
]);

const MAXIMUM_PLAINTEXT_LENGTH = 1600;
const MINIMUM_TTL_MS = 5 * 60 * 1000;
const MAXIMUM_TTL_MS = 24 * 60 * 60 * 1000;

function assertNonEmptyString(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${name} must be a non-empty string.`);
  }

  return value.trim();
}

function assertOneOf(value, allowedValues, name) {
  if (!allowedValues.includes(value)) {
    throw new RangeError(`${name} must be one of: ${allowedValues.join(", ")}.`);
  }

  return value;
}

function assertPlainObject(value, name) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object.`);
  }

  return value;
}

function requireSecureContext() {
  if (!globalThis.isSecureContext || !globalThis.crypto?.subtle) {
    throw new Error(
      "EncounterTimeCapsule requires a secure context with Web Crypto support."
    );
  }
}

function toBase64(bytes) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function fromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function encodeUtf8(value) {
  return new TextEncoder().encode(value);
}

function decodeUtf8(bytes) {
  return new TextDecoder().decode(bytes);
}

function randomId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function normalizeExpiresAt(expiresAt, now) {
  const expiry = new Date(assertNonEmptyString(expiresAt, "expiresAt"));

  if (Number.isNaN(expiry.valueOf())) {
    throw new RangeError("expiresAt must be a valid ISO-8601 date-time.");
  }

  const ttl = expiry.valueOf() - now.valueOf();

  if (ttl < MINIMUM_TTL_MS || ttl > MAXIMUM_TTL_MS) {
    throw new RangeError(
      "expiresAt must be between five minutes and twenty-four hours in the future."
    );
  }

  return expiry.toISOString();
}

function assertSafePlaintext(value) {
  const plaintext = assertNonEmptyString(value, "plaintext");

  if (plaintext.length > MAXIMUM_PLAINTEXT_LENGTH) {
    throw new RangeError(
      `plaintext cannot exceed ${MAXIMUM_PLAINTEXT_LENGTH} characters.`
    );
  }

  const prohibitedPatterns = [
    /\b(?:cashapp|cash app|venmo|zelle|paypal|apple pay|google pay)\b/i,
    /\b(?:bitcoin|btc|ethereum|eth|usdt|wallet address)\b/i,
    /\b(?:rate|rates|price|pricing|fee|fees|tip|tips|deposit|donation)\b/i,
    /\b(?:pay(?:ing)?|payment|compensat(?:e|ion)|valuable consideration)\b/i,
    /\b(?:sex|sexual|hookup|intimacy)\b.{0,96}\b(?:for|in exchange for|if you)\b.{0,96}\b(?:money|cash|rent|ride|hotel|room|gift|drugs?)\b/i,
    /\b(?:money|cash|rent|ride|hotel|room|gift|drugs?)\b.{0,96}\b(?:for|in exchange for|if you)\b.{0,96}\b(?:sex|sexual|hookup|intimacy)\b/i
  ];

  if (prohibitedPatterns.some((pattern) => pattern.test(plaintext))) {
    throw new Error(
      "Capsule content cannot include payment, value-for-intimacy, or commercial arrangement language."
    );
  }

  return plaintext;
}

function freezeClone(value) {
  return Object.freeze(structuredClone(value));
}

export class LocalTimeCapsule {
  #clock;
  #state;
  #contentKey;
  #ciphertext;
  #initializationVector;
  #plaintextCache;

  constructor({
    purpose,
    plaintext,
    expiresAt,
    clock = () => new Date()
  }) {
    requireSecureContext();

    if (typeof clock !== "function") {
      throw new TypeError("clock must be a function.");
    }

    this.#clock = clock;

    const now = this.#clock();
    this.capsuleId = randomId("capsule");
    this.purpose = assertOneOf(purpose, CAPSULE_PURPOSES, "purpose");
    this.expiresAt = normalizeExpiresAt(expiresAt, now);
    this.createdAt = now.toISOString();
    this.#state = "draft_local";
    this.#contentKey = null;
    this.#ciphertext = null;
    this.#initializationVector = null;
    this.#plaintextCache = assertSafePlaintext(plaintext);
  }

  get state() {
    this.#expireIfNeeded();
    return this.#state;
  }

  async seal() {
    this.#assertNonTerminal();

    if (this.#state !== "draft_local") {
      throw new Error(`Capsule cannot be sealed from "${this.#state}".`);
    }

    this.#contentKey = await crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256
      },
      false,
      ["encrypt", "decrypt"]
    );

    this.#initializationVector = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: this.#initializationVector
      },
      this.#contentKey,
      encodeUtf8(this.#plaintextCache)
    );

    this.#ciphertext = new Uint8Array(encrypted);
    this.#plaintextCache = null;
    this.#state = "proposed";

    return this.metadata();
  }

  activateByMutualAcceptance() {
    this.#assertNonTerminal();

    if (this.#state !== "proposed") {
      throw new Error(`Capsule cannot activate from "${this.#state}".`);
    }

    this.#state = "active";
    return this.metadata();
  }

  async readLocal() {
    this.#assertActive();

    if (!this.#contentKey || !this.#ciphertext || !this.#initializationVector) {
      throw new Error("Capsule key material is unavailable.");
    }

    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: this.#initializationVector
      },
      this.#contentKey,
      this.#ciphertext
    );

    return decodeUtf8(new Uint8Array(decrypted));
  }

  deleteNow() {
    if (TERMINAL_STATES.has(this.#state)) {
      return this.metadata();
    }

    this.#destroyMaterial();
    this.#state = "deleted";

    return this.metadata();
  }

  revokeBeforeAcceptance() {
    if (this.#state !== "proposed") {
      throw new Error("Only a proposed capsule may be revoked before acceptance.");
    }

    this.#destroyMaterial();
    this.#state = "revoked";

    return this.metadata();
  }

  metadata() {
    this.#expireIfNeeded();

    return freezeClone({
      capsuleId: this.capsuleId,
      purpose: this.purpose,
      state: this.#state,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
      contentFormat: "text_plain",
      noExportUi: true,
      noPlatformRecovery: true,
      externalActionAuthorized: false,
      reminder: "This capsule can expire in Hearthline. A recipient may still copy information outside the feature."
    });
  }

  toEncryptedPayload() {
    this.#assertNonTerminal();

    if (this.#state !== "proposed" && this.#state !== "active") {
      throw new Error(`Capsule cannot be serialized from "${this.#state}".`);
    }

    if (!this.#ciphertext || !this.#initializationVector) {
      throw new Error("Capsule ciphertext is unavailable.");
    }

    return freezeClone({
      capsuleId: this.capsuleId,
      purpose: this.purpose,
      expiresAt: this.expiresAt,
      ciphertext: toBase64(this.#ciphertext),
      initializationVector: toBase64(this.#initializationVector),
      contentFormat: "text_plain"
    });
  }

  #assertActive() {
    this.#expireIfNeeded();

    if (this.#state !== "active") {
      throw new Error(`Capsule is not active because it is "${this.#state}".`);
    }
  }

  #assertNonTerminal() {
    this.#expireIfNeeded();

    if (TERMINAL_STATES.has(this.#state)) {
      throw new Error(`Capsule is terminal because it is "${this.#state}".`);
    }
  }

  #expireIfNeeded() {
    if (
      !TERMINAL_STATES.has(this.#state) &&
      new Date(this.expiresAt) <= this.#clock()
    ) {
      this.#destroyMaterial();
      this.#state = "expired";
    }
  }

  #destroyMaterial() {
    this.#contentKey = null;
    this.#ciphertext = null;
    this.#initializationVector = null;
    this.#plaintextCache = null;
  }
}
