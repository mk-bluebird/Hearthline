// SPDX-License-Identifier: MIT OR Apache-2.0
//
// Hearthline — Private Member Session
// ===================================
//
// A member-invoked, session-scoped, zero-dependency lifecycle primitive
// that any private Hearthline tool (reflection, offline planning,
// decompression, boundary review) can compose with to obtain a uniform
// non-leakage contract.
//
// This module does NOT:
//   - verify age, consent, or membership eligibility
//   - persist to disk, IndexedDB, localStorage, cookies, or the network
//   - score, rank, or profile the member
//   - transmit to Afterlight, Lantern, TrueCompass, HearthChat, BridgeAdapters
//   - call any browser API beyond the injected monotonic clock
//
// This module DOES:
//   - enforce a monotonic-clock-bounded session lifetime
//   - expose a named sink-exclusion registry so surrounding code can
//     attest which downstream sinks have been denied access
//   - provide runtime-evaluable acceptance gates for test harnesses
//   - clear controller-held references on close
//
// The module is intentionally small in surface area and large in
// invariant density. Collaborators should treat every exported symbol
// as part of the boundary contract, not as an implementation detail.

/* ------------------------------------------------------------------ *
 * 1. Public constants
 * ------------------------------------------------------------------ */

/**
 * Upper bound on a single private session. Members may close earlier.
 * This is a safety ceiling, not a target duration.
 */
export const MAX_SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Default session TTL when the caller does not supply one.
 */
export const DEFAULT_SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Minimum session TTL accepted by the constructor. Below this value
 * the session is too short to be usable and is almost certainly a
 * configuration error.
 */
export const MIN_SESSION_TTL_MS = 1_000; // 1 second

/**
 * Named downstream sinks that must never receive private-session
 * content. The list is frozen; adding a sink requires a code review
 * against the Hearthline blueprint's trust-zone boundaries.
 */
export const LEAK_VECTORS = Object.freeze([
  "analytics",
  "session_replay",
  "crash_reporter",
  "error_logger",
  "ai_model_input",
  "draft_synchronization",
  "afterlight_ledger",
  "lantern_integrity",
  "true_compass_matching",
  "hearthchat_suggestion",
  "bridge_adapters",
  "notification_queue",
  "export_pipeline",
  "search_index",
  "service_worker_cache",
  "third_party_embed",
] as const);

export type LeakVector = (typeof LEAK_VECTORS)[number];

const LEAK_VECTOR_SET: ReadonlySet<LeakVector> = Object.freeze(
  new Set(LEAK_VECTORS),
);

/**
 * Named acceptance gates. Each gate is a runtime-evaluable predicate
 * that a test harness can call against a live session. Gate IDs are
 * stable so downstream test suites can reference them by name.
 */
export const GATE_IDS = Object.freeze([
  "SESSION_MONOTONIC_CLOCK",
  "SESSION_TTL_BOUNDED",
  "SESSION_HANDLE_STABLE",
  "SESSION_CLOSE_CLEARS",
  "SESSION_NO_PERSISTENCE_HINT",
  "SESSION_SINK_REGISTRY_EXPOSED",
] as const);

export type GateId = (typeof GATE_IDS)[number];

/* ------------------------------------------------------------------ *
 * 2. Public types
 * ------------------------------------------------------------------ */

export type SessionPhase = "idle" | "open" | "closed";

export type GateStatus = "pass" | "fail" | "not_applicable";

export interface GateResult {
  readonly id: GateId;
  readonly status: GateStatus;
  readonly detail: string;
}

/**
 * A frozen, immutable snapshot of session state. Callers receive
 * snapshots rather than live references so that no external code can
 * mutate internal session state.
 */
export interface SessionSnapshot {
  readonly phase: SessionPhase;
  readonly sessionId: string;
  readonly openedAt: number | null;
  readonly touchedAt: number | null;
  readonly ttlMs: number;
  readonly ageMs: number;
  readonly remainingMs: number;
  readonly excludedSinks: readonly LeakVector[];
}

/**
 * Caller-supplied options. The monotonic clock is required so that the
 * session cannot be extended or shortened by wall-clock adjustments.
 */
export interface SessionOptions {
  /**
   * Monotonic time source. In browsers, pass `performance.now`.
   * In Node.js test environments, pass `performance.now` from
   * `node:perf_hooks`. A monotonically non-decreasing function is
   * required; values must be finite and non-negative.
   */
  readonly monotonicNow: () => number;

  /**
   * Session lifetime in milliseconds. Defaults to
   * DEFAULT_SESSION_TTL_MS. Must be within [MIN_SESSION_TTL_MS,
   * MAX_SESSION_TTL_MS].
   */
  readonly ttlMs?: number;

  /**
   * Optional stable identifier for the session, useful for correlating
   * logs that do NOT contain session content. Must match
   * /^[a-z0-9-]{8,64}$/ when supplied. A random identifier is
   * generated when omitted.
   */
  readonly sessionId?: string;

  /**
   * Optional label describing the composing tool ("reflection",
   * "offline-planning", "decompression", "boundary-review", ...).
   * The label is metadata only and must never enter a leak vector.
   */
  readonly toolLabel?: string;
}

/**
 * A boundary contract is a frozen, plain-language statement of what a
 * private session guarantees and what it explicitly does not guarantee.
 * Tools should expose their contract to collaborators and test authors.
 */
export interface BoundaryContract {
  readonly guarantees: readonly string[];
  readonly nonGuarantees: readonly string[];
  readonly exclusions: readonly LeakVector[];
}

/* ------------------------------------------------------------------ *
 * 3. Boundary contract factory
 * ------------------------------------------------------------------ */

/**
 * Returns the canonical boundary contract for any Hearthline private
 * member session. Tools may wrap this contract with tool-specific
 * statements, but they must not weaken it.
 */
export function createBoundaryContract(
  toolLabel: string = "private-session",
): BoundaryContract {
  if (typeof toolLabel !== "string" || toolLabel.length === 0) {
    throw new TypeError("toolLabel must be a non-empty string");
  }

  const guarantees = Object.freeze([
    "Session state is held only in memory for the lifetime of the controller instance.",
    "Session state is cleared when close() is called or the TTL elapses.",
    "Session lifetime is measured exclusively by the injected monotonic clock.",
    "Snapshots returned to callers are frozen and structurally isolated from internal state.",
    `Downstream sinks are declared by name and can be attested as excluded: ${LEAK_VECTORS.join(", ")}.`,
  ]);

  const nonGuarantees = Object.freeze([
    "JavaScript does not guarantee secure memory erasure; clearing references is logical deletion.",
    "Other scripts executing in the same origin can observe rendered DOM, so render hygiene is the caller's responsibility.",
    "A member can copy, screenshot, or externally retain any content they personally wrote.",
    "The session does not verify age, consent, membership eligibility, or counterpart identity.",
    "The session does not prevent the surrounding application from misusing returned snapshots; integration review is required.",
    "The session does not establish that any particular leak vector has been technically blocked; it records the caller's intent via the sink registry.",
  ]);

  // Freeze the whole contract so collaborators cannot mutate it at
  // runtime even if they hold a reference.
  return Object.freeze({
    guarantees,
    nonGuarantees,
    exclusions: LEAK_VECTORS,
  });
}

/* ------------------------------------------------------------------ *
 * 4. Internal utilities
 * ------------------------------------------------------------------ */

const SESSION_ID_PATTERN = /^[a-z0-9-]{8,64}$/;

function generateSessionId(): string {
  // Prefer crypto.randomUUID when available; fall back to a
  // non-cryptographic identifier for test environments.
  const cryptoObj =
    typeof globalThis !== "undefined" &&
    typeof (globalThis as { crypto?: Crypto }).crypto !== "undefined"
      ? (globalThis as { crypto: Crypto }).crypto
      : undefined;

  if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
    return cryptoObj.randomUUID();
  }

  // Non-cryptographic fallback: acceptable because the session id is
  // never used as a secret, never leaves the process, and is only
  // meant to disambiguate concurrent sessions in the same page.
  const entropy = Math.random().toString(36).slice(2, 10);
  const stamp = Date.now().toString(36);
  return `s-${stamp}-${entropy}`.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

function assertFiniteNonNegative(value: number, name: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite, non-negative number`);
  }
}

function assertIntegerInRange(
  value: number,
  min: number,
  max: number,
  name: string,
): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${name} must be a safe integer`);
  }
  if (value < min || value > max) {
    throw new RangeError(
      `${name} must be within [${min}, ${max}] (received ${value})`,
    );
  }
}

/* ------------------------------------------------------------------ *
 * 5. The PrivateMemberSession class
 * ------------------------------------------------------------------ */

/**
 * A monotonic-clock-bounded private session.
 *
 * Lifecycle:
 *
 *   idle ──open()──▶ open ──close() or TTL──▶ closed
 *
 * The class is single-use by default. Once closed, a session cannot be
 * reopened; callers must construct a new instance. This is deliberate:
 * it prevents accidental reuse of stale state across UI re-renders.
 */
export class PrivateMemberSession {
  readonly #sessionId: string;
  readonly #toolLabel: string;
  readonly #ttlMs: number;
  readonly #monotonicNow: () => number;

  #phase: SessionPhase = "idle";
  #openedAt: number | null = null;
  #touchedAt: number | null = null;
  #lastObserved: number = -Infinity;
  #excludedSinks: Set<LeakVector> = new Set<LeakVector>();

  constructor(options: SessionOptions) {
    if (options === null || typeof options !== "object") {
      throw new TypeError("options must be an object");
    }
    if (typeof options.monotonicNow !== "function") {
      throw new TypeError("options.monotonicNow must be a function");
    }

    const ttlMs = options.ttlMs ?? DEFAULT_SESSION_TTL_MS;
    assertIntegerInRange(ttlMs, MIN_SESSION_TTL_MS, MAX_SESSION_TTL_MS, "ttlMs");

    const sessionId = options.sessionId ?? generateSessionId();
    if (!SESSION_ID_PATTERN.test(sessionId)) {
      throw new TypeError(
        "sessionId must match /^[a-z0-9-]{8,64}$/ when supplied",
      );
    }

    const toolLabel = options.toolLabel ?? "private-session";
    if (typeof toolLabel !== "string" || toolLabel.length === 0) {
      throw new TypeError("toolLabel must be a non-empty string");
    }

    this.#sessionId = sessionId;
    this.#toolLabel = toolLabel;
    this.#ttlMs = ttlMs;
    this.#monotonicNow = options.monotonicNow;
  }

  /* -------- public read-only identifiers -------- */

  get sessionId(): string {
    return this.#sessionId;
  }

  get toolLabel(): string {
    return this.#toolLabel;
  }

  get ttlMs(): number {
    return this.#ttlMs;
  }

  /* -------- internal clock handling -------- */

  #readClock(): number {
    const now = this.#monotonicNow();
    if (typeof now !== "number" || !Number.isFinite(now) || now < 0) {
      // A non-monotonic or non-finite clock is a contract violation.
      // Fail closed: close the session and rethrow.
      this.close();
      throw new Error("Monotonic clock must return finite, non-negative values");
    }
    if (now < this.#lastObserved) {
      this.close();
      throw new Error("Monotonic clock regressed");
    }
    this.#lastObserved = now;
    return now;
  }

  #maybeExpire(now: number): void {
    if (this.#phase !== "open" || this.#openedAt === null) {
      return;
    }
    if (now - this.#openedAt >= this.#ttlMs) {
      this.close();
    }
  }

  /* -------- lifecycle -------- */

  /**
   * Opens the session. Throws if the session has already been opened
   * at least once. Returns a frozen snapshot of the newly opened state.
   */
  open(): SessionSnapshot {
    if (this.#phase !== "idle") {
      throw new Error(
        `Session cannot be reopened (current phase: ${this.#phase})`,
      );
    }
    const now = this.#readClock();
    this.#phase = "open";
    this.#openedAt = now;
    this.#touchedAt = now;
    return this.snapshot();
  }

  /**
   * Records a heartbeat. Extends nothing; the TTL is fixed at open
   * time. The heartbeat is useful only for observing activity and for
   * returning a fresh snapshot. Calling touch() on a closed or idle
   * session throws.
   */
  touch(): SessionSnapshot {
    if (this.#phase !== "open") {
      throw new Error(
        `Session is not open (current phase: ${this.#phase})`,
      );
    }
    const now = this.#readClock();
    this.#maybeExpire(now);
    if (this.#phase !== "open") {
      throw new Error("Session expired during touch()");
    }
    this.#touchedAt = now;
    return this.snapshot();
  }

  /**
   * Closes the session. Idempotent: calling close() on an already
   * closed session is a no-op. Clears all internal references.
   */
  close(): void {
    this.#phase = "closed";
    this.#openedAt = null;
    this.#touchedAt = null;
    this.#excludedSinks.clear();
  }

  /* -------- observation -------- */

  status(): SessionPhase {
    return this.#phase;
  }

  /**
   * Returns a frozen snapshot. Expiry is checked on every call so that
   * a snapshot never reports an expired session as open.
   */
  snapshot(): SessionSnapshot {
    const now = this.#phase === "open" ? this.#readClock() : this.#lastObserved;
    if (this.#phase === "open") {
      this.#maybeExpire(now);
    }

    const openedAt = this.#openedAt;
    const touchedAt = this.#touchedAt;
    const ageMs =
      this.#phase === "open" && openedAt !== null ? Math.max(0, now - openedAt) : 0;
    const remainingMs =
      this.#phase === "open" && openedAt !== null
        ? Math.max(0, this.#ttlMs - ageMs)
        : 0;

    return Object.freeze({
      phase: this.#phase,
      sessionId: this.#sessionId,
      openedAt,
      touchedAt,
      ttlMs: this.#ttlMs,
      ageMs,
      remainingMs,
      excludedSinks: Object.freeze([...this.#excludedSinks]),
    });
  }

  ageMs(): number {
    return this.snapshot().ageMs;
  }

  remainingMs(): number {
    return this.snapshot().remainingMs;
  }

  /**
   * Throws if the session is not currently open. Composing tools
   * should call this at the top of every public method that assumes
   * an active session.
   */
  assertActive(): void {
    if (this.#phase !== "open") {
      throw new Error(
        `Session is not active (current phase: ${this.#phase})`,
      );
    }
  }

  /* -------- leak-vector sink registry -------- */

  /**
   * Records that the caller has excluded the named sink from receiving
   * session content. The registry is descriptive: it asserts intent,
   * it does not itself block any pipeline. Integration review must
   * confirm that each named sink actually respects the exclusion.
   */
  markSinkExcluded(vector: LeakVector): void {
    if (!LEAK_VECTOR_SET.has(vector)) {
      throw new TypeError(`Unknown leak vector: ${String(vector)}`);
    }
    this.#excludedSinks.add(vector);
  }

  isSinkExcluded(vector: LeakVector): boolean {
    if (!LEAK_VECTOR_SET.has(vector)) {
      return false;
    }
    return this.#excludedSinks.has(vector);
  }

  excludedSinks(): readonly LeakVector[] {
    return Object.freeze([...this.#excludedSinks]);
  }

  /**
   * Convenience helper: mark every known sink as excluded. Useful for
   * strict integrations and for test harnesses that want to assert
   * the strongest possible posture.
   */
  markAllSinksExcluded(): void {
    for (const vector of LEAK_VECTORS) {
      this.#excludedSinks.add(vector);
    }
  }

  /* -------- acceptance gates -------- */

  /**
   * Runs the standard acceptance gates against the current session
   * state. Returns a frozen list of results. Safe to call in any
   * phase.
   */
  runGates(): readonly GateResult[] {
    const results: GateResult[] = [];
    const snap = this.snapshot();

    // Gate 1: monotonic clock
    {
      const ok =
        Number.isFinite(this.#lastObserved) || this.#phase === "idle";
      results.push(
        Object.freeze({
          id: "SESSION_MONOTONIC_CLOCK" as GateId,
          status: ok ? "pass" : "fail",
          detail: ok
            ? "Clock observations are finite and non-decreasing."
            : "Clock observations are not finite or have regressed.",
        }),
      );
    }

    // Gate 2: TTL bounded
    {
      const ok =
        Number.isSafeInteger(this.#ttlMs) &&
        this.#ttlMs >= MIN_SESSION_TTL_MS &&
        this.#ttlMs <= MAX_SESSION_TTL_MS;
      results.push(
        Object.freeze({
          id: "SESSION_TTL_BOUNDED" as GateId,
          status: ok ? "pass" : "fail",
          detail: ok
            ? `TTL ${this.#ttlMs}ms within [${MIN_SESSION_TTL_MS}, ${MAX_SESSION_TTL_MS}].`
            : `TTL ${this.#ttlMs}ms outside permitted range.`,
        }),
      );
    }

    // Gate 3: handle stable
    {
      const ok =
        typeof this.#sessionId === "string" &&
        SESSION_ID_PATTERN.test(this.#sessionId);
      results.push(
        Object.freeze({
          id: "SESSION_HANDLE_STABLE" as GateId,
          status: ok ? "pass" : "fail",
          detail: ok
            ? "Session id is stable and well-formed."
            : "Session id failed pattern validation.",
        }),
      );
    }

    // Gate 4: close clears
    {
      if (snap.phase === "closed") {
        const cleared =
          snap.openedAt === null &&
          snap.touchedAt === null &&
          snap.excludedSinks.length === 0;
        results.push(
          Object.freeze({
            id: "SESSION_CLOSE_CLEARS" as GateId,
            status: cleared ? "pass" : "fail",
            detail: cleared
              ? "Closed session holds no timestamps or sink records."
              : "Closed session retains residual state.",
          }),
        );
      } else {
        results.push(
          Object.freeze({
            id: "SESSION_CLOSE_CLEARS" as GateId,
            status: "not_applicable",
            detail: "Session is not yet closed.",
          }),
        );
      }
    }

    // Gate 5: no persistence hint — this module has no persistence
    // surface, so the gate reports what the module can attest.
    {
      results.push(
        Object.freeze({
          id: "SESSION_NO_PERSISTENCE_HINT" as GateId,
          status: "pass",
          detail:
            "Module exposes no localStorage, IndexedDB, cookie, or fetch surface.",
        }),
      );
    }

    // Gate 6: sink registry exposed
    {
      const ok = typeof this.markSinkExcluded === "function";
      results.push(
        Object.freeze({
          id: "SESSION_SINK_REGISTRY_EXPOSED" as GateId,
          status: ok ? "pass" : "fail",
          detail: ok
            ? "Sink registry is present and callable."
            : "Sink registry is not callable.",
        }),
      );
    }

    return Object.freeze(results);
  }
}

/* ------------------------------------------------------------------ *
 * 6. Factory
 * ------------------------------------------------------------------ */

/**
 * Creates a new PrivateMemberSession. The factory performs no I/O and
 * holds no global registry; each call yields an independent session.
 */
export function createPrivateSession(
  options: SessionOptions,
): PrivateMemberSession {
  return new PrivateMemberSession(options);
}

/**
 * Convenience factory for tests and browser code. Uses
 * performance.now when available and falls back to a Date-based
 * monotonic approximation. The fallback is acceptable only because
 * Date.now is monotonic enough for short sessions in practice; it is
 * NOT a substitute for a true monotonic source and should not be used
 * in production code paths that depend on strict monotonicity.
 */
export function createBrowserPrivateSession(
  options: Omit<SessionOptions, "monotonicNow"> & {
    monotonicNow?: () => number;
  } = {},
): PrivateMemberSession {
  const monotonicNow =
    options.monotonicNow ??
    (() => {
      const perf =
        typeof globalThis !== "undefined" &&
        typeof (globalThis as { performance?: Performance }).performance !==
          "undefined"
          ? (globalThis as { performance: Performance }).performance
          : undefined;
      if (perf && typeof perf.now === "function") {
        return perf.now();
      }
      // Fallback: not strictly monotonic across system clock changes.
      return Date.now();
    });

  return new PrivateMemberSession({ ...options, monotonicNow });
}

/* ------------------------------------------------------------------ *
 * 7. Integration requirements (documented, not enforced)
 * ------------------------------------------------------------------ *
 *
 * Surrounding code MUST:
 *
 *   - construct the session with a monotonic clock
 *   - call open() once, when the member explicitly invokes the tool
 *   - call close() when the member leaves the tool view, when the
 *     tool completes, or when the browser tab is hidden
 *   - call markAllSinksExcluded() during tool initialization and
 *     verify in integration tests that each named sink respects the
 *     exclusion
 *   - treat snapshots as frozen and never mutate them
 *   - exclude session content from analytics, session replay, crash
 *     reports, error logs, AI input, and any draft-synchronization or
 *     cross-device persistence layer
 *
 * Surrounding code MUST NOT:
 *
 *   - reopen a closed session; construct a new one instead
 *   - use the session id as a secret; it is a correlation handle only
 *   - place session content in URLs, query strings, hash fragments,
 *     window.name, or any browser-history-visible surface
 *   - auto-reopen the tool after inactivity
 *   - display completion percentages, streaks, or improvement trends
 *     derived from session activity
 *   - gate any other capability on session completion
 *
 * The module deliberately omits a network surface, a persistence
 * surface, and a global registry so that integration review can focus
 * on the composing tool, not on this foundation.
 *
 * ------------------------------------------------------------------ */
