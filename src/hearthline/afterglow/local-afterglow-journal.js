const STORAGE_DATABASE = "hearthline-afterglow-local";
const STORAGE_VERSION = 1;
const ENTRY_STORE = "entries";
const KEY_STORE = "keys";

const RETENTION_MODES = Object.freeze([
  "session_only",
  "local_expiring",
  "local_until_deleted"
]);

const REFLECTION_VALUES = Object.freeze([
  "yes",
  "mostly",
  "unsure",
  "no",
  "prefer_not_to_answer"
]);

const REPEAT_VALUES = Object.freeze([
  "yes",
  "maybe",
  "no",
  "not_sure",
  "not_applicable"
]);

const CURRENT_NEEDS = Object.freeze([
  "quiet",
  "check_in_with_self",
  "rest",
  "talk_to_someone_i_trust",
  "nothing_right_now",
  "other"
]);

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

function assertOptionalString(value, name, maximumLength = 5000) {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value !== "string") {
    throw new TypeError(`${name} must be a string when provided.`);
  }

  if (value.length > maximumLength) {
    throw new RangeError(`${name} cannot exceed ${maximumLength} characters.`);
  }

  return value;
}

function assertSecureContext() {
  if (!globalThis.isSecureContext || !globalThis.crypto?.subtle) {
    throw new Error(
      "EncounterAfterglow requires a secure browser context with Web Crypto support."
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
  const output = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    output[index] = binary.charCodeAt(index);
  }

  return output;
}

function utf8Encode(value) {
  return new TextEncoder().encode(value);
}

function utf8Decode(bytes) {
  return new TextDecoder().decode(bytes);
}

function randomId(prefix) {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `${prefix}_${toBase64(bytes).replace(/[+/=]/g, "")}`;
}

function normalizeExpiry(expiresAt) {
  if (expiresAt === null || expiresAt === undefined) {
    return null;
  }

  const date = new Date(expiresAt);

  if (Number.isNaN(date.valueOf())) {
    throw new RangeError("expiresAt must be a valid ISO-8601 date-time.");
  }

  return date.toISOString();
}

function normalizeReflection(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("reflection must be an object.");
  }

  return Object.freeze({
    feltRespected: assertOneOf(
      input.feltRespected ?? "prefer_not_to_answer",
      REFLECTION_VALUES,
      "reflection.feltRespected"
    ),
    feltComfortable: assertOneOf(
      input.feltComfortable ?? "prefer_not_to_answer",
      REFLECTION_VALUES,
      "reflection.feltComfortable"
    ),
    wouldChooseAgain: assertOneOf(
      input.wouldChooseAgain ?? "not_applicable",
      REPEAT_VALUES,
      "reflection.wouldChooseAgain"
    ),
    learnedAboutSelf: assertOptionalString(
      input.learnedAboutSelf,
      "reflection.learnedAboutSelf"
    ),
    learnedForNextTime: assertOptionalString(
      input.learnedForNextTime,
      "reflection.learnedForNextTime"
    ),
    currentNeed: assertOneOf(
      input.currentNeed ?? "nothing_right_now",
      CURRENT_NEEDS,
      "reflection.currentNeed"
    ),
    privateNote: assertOptionalString(
      input.privateNote,
      "reflection.privateNote"
    )
  });
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(STORAGE_DATABASE, STORAGE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(ENTRY_STORE)) {
        database.createObjectStore(ENTRY_STORE, { keyPath: "entryId" });
      }

      if (!database.objectStoreNames.contains(KEY_STORE)) {
        database.createObjectStore(KEY_STORE, { keyPath: "keyId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runTransaction(database, storeName, mode, operation) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);

    transaction.oncomplete = () => resolve(request?.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function getOrCreateLocalKey(database) {
  const existing = await runTransaction(database, KEY_STORE, "readonly", (store) =>
    store.get("afterglow-local-key")
  );

  if (existing?.key) {
    return existing.key;
  }

  const key = await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );

  await runTransaction(database, KEY_STORE, "readwrite", (store) =>
    store.put({
      keyId: "afterglow-local-key",
      key
    })
  );

  return key;
}

async function encryptEntry(key, entry) {
  const initializationVector = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = utf8Encode(JSON.stringify(entry));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: initializationVector
    },
    key,
    plaintext
  );

  return Object.freeze({
    initializationVector: toBase64(initializationVector),
    ciphertext: toBase64(new Uint8Array(ciphertext))
  });
}

async function decryptEntry(key, encryptedRecord) {
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64(encryptedRecord.initializationVector)
    },
    key,
    fromBase64(encryptedRecord.ciphertext)
  );

  return JSON.parse(utf8Decode(new Uint8Array(plaintext)));
}

export class LocalAfterglowJournal {
  #sessionEntries = new Map();
  #databasePromise;
  #clock;

  constructor({ clock = () => new Date() } = {}) {
    if (typeof clock !== "function") {
      throw new TypeError("clock must be a function.");
    }

    assertSecureContext();
    this.#clock = clock;
    this.#databasePromise = openDatabase();
  }

  async save({
    label,
    reflection,
    retentionMode = "session_only",
    expiresAt = null
  }) {
    const normalizedLabel = assertNonEmptyString(label, "label");
    const normalizedReflection = normalizeReflection(reflection);
    const normalizedRetentionMode = assertOneOf(
      retentionMode,
      RETENTION_MODES,
      "retentionMode"
    );
    const normalizedExpiresAt = normalizeExpiry(expiresAt);
    const createdAt = this.#clock().toISOString();

    if (normalizedRetentionMode === "local_expiring" && normalizedExpiresAt === null) {
      throw new Error("local_expiring entries require expiresAt.");
    }

    if (normalizedRetentionMode === "session_only" && normalizedExpiresAt !== null) {
      throw new Error("session_only entries cannot define expiresAt.");
    }

    const entry = Object.freeze({
      entryId: randomId("afterglow"),
      label: normalizedLabel,
      reflection: normalizedReflection,
      createdAt,
      expiresAt: normalizedExpiresAt,
      localOnly: true,
      counterpartReference: null,
      encounterReference: null,
      exportOnlyByUser: true
    });

    if (normalizedRetentionMode === "session_only") {
      this.#sessionEntries.set(entry.entryId, entry);
      return this.#entrySummary(entry, normalizedRetentionMode);
    }

    const database = await this.#databasePromise;
    const key = await getOrCreateLocalKey(database);
    const encrypted = await encryptEntry(key, entry);

    await runTransaction(database, ENTRY_STORE, "readwrite", (store) =>
      store.put({
        entryId: entry.entryId,
        retentionMode: normalizedRetentionMode,
        expiresAt: entry.expiresAt,
        createdAt: entry.createdAt,
        initializationVector: encrypted.initializationVector,
        ciphertext: encrypted.ciphertext
      })
    );

    return this.#entrySummary(entry, normalizedRetentionMode);
  }

  async read(entryId) {
    const normalizedEntryId = assertNonEmptyString(entryId, "entryId");

    if (this.#sessionEntries.has(normalizedEntryId)) {
      return structuredClone(this.#sessionEntries.get(normalizedEntryId));
    }

    const database = await this.#databasePromise;
    const encryptedRecord = await runTransaction(database, ENTRY_STORE, "readonly", (store) =>
      store.get(normalizedEntryId)
    );

    if (!encryptedRecord) {
      return null;
    }

    if (encryptedRecord.expiresAt && new Date(encryptedRecord.expiresAt) <= this.#clock()) {
      await this.delete(normalizedEntryId);
      return null;
    }

    const key = await getOrCreateLocalKey(database);
    return decryptEntry(key, encryptedRecord);
  }

  async list() {
    const sessionSummaries = [...this.#sessionEntries.values()].map((entry) =>
      this.#entrySummary(entry, "session_only")
    );

    const database = await this.#databasePromise;
    const storedRecords = await runTransaction(database, ENTRY_STORE, "readonly", (store) =>
      store.getAll()
    );

    const activeStoredSummaries = [];

    for (const record of storedRecords) {
      if (record.expiresAt && new Date(record.expiresAt) <= this.#clock()) {
        await this.delete(record.entryId);
        continue;
      }

      activeStoredSummaries.push(Object.freeze({
        entryId: record.entryId,
        createdAt: record.createdAt,
        expiresAt: record.expiresAt,
        retentionMode: record.retentionMode,
        localOnly: true
      }));
    }

    return Object.freeze([
      ...sessionSummaries,
      ...activeStoredSummaries
    ]);
  }

  async delete(entryId) {
    const normalizedEntryId = assertNonEmptyString(entryId, "entryId");
    const deletedFromSession = this.#sessionEntries.delete(normalizedEntryId);

    const database = await this.#databasePromise;
    await runTransaction(database, ENTRY_STORE, "readwrite", (store) =>
      store.delete(normalizedEntryId)
    );

    return Object.freeze({
      entryId: normalizedEntryId,
      deletedFromSession,
      deletedAt: this.#clock().toISOString(),
      localOnly: true
    });
  }

  async deleteAll() {
    this.#sessionEntries.clear();

    const database = await this.#databasePromise;
    await runTransaction(database, ENTRY_STORE, "readwrite", (store) =>
      store.clear()
    );

    return Object.freeze({
      deletedAt: this.#clock().toISOString(),
      localOnly: true
    });
  }

  async exportEntry(entryId) {
    const entry = await this.read(entryId);

    if (!entry) {
      throw new Error(`No local afterglow entry exists for "${entryId}".`);
    }

    return Object.freeze({
      filename: `hearthline-afterglow-${entry.entryId}.json`,
      mediaType: "application/json",
      content: JSON.stringify(entry, null, 2),
      warning: "Exported reflections may be accessible to other people or applications depending on where you save them."
    });
  }

  #entrySummary(entry, retentionMode) {
    return Object.freeze({
      entryId: entry.entryId,
      createdAt: entry.createdAt,
      expiresAt: entry.expiresAt,
      retentionMode,
      localOnly: true
    });
  }
}
