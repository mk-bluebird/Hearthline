// SPDX-License-Identifier: MIT OR Apache-2.0

import {
  evaluateAdmission,
  type AdmissionDecision,
  type AdmissionPolicy,
  type EvidenceProfile,
  type EvaluationContext,
  type VerifiedPresentation,
} from "./threshold-trust-policy.js";

export type StatusResult = "not_revoked" | "revoked" | "unknown";

export type StatusSource = Readonly<{
  listRef: string;
  url: string;
  maximumAgeMs: number;
  maximumBytes: number;
  minimumEntryCount: number;
}>;

/**
 * Output of a trusted, format-specific status verifier.
 *
 * The verifier checks the signed source, status purpose, encoding,
 * decompression limits, validity, and configured issuer authority.
 * issuedAt is a signed snapshot time, not merely a fetch timestamp.
 */
export type VerifiedStatusSnapshot = Readonly<{
  listRef: string;
  issuedAt: number;
  expiresAt: number;
  entryCount: number;
  revokedIndices: readonly number[];
}>;

export type StatusDependencies = Readonly<{
  fetchWholeList: (
    configuredUrl: string,
    maximumBytes: number,
  ) => Promise<Uint8Array>;
  verifySnapshot: (
    raw: Uint8Array,
    source: StatusSource,
  ) => Promise<VerifiedStatusSnapshot>;
  now: () => number;
}>;

type CachedSnapshot = {
  issuedAt: number;
  expiresAt: number;
  entryCount: number;
  revoked: ReadonlySet<number>;
};

function ref(value: string): void {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("Nonempty reference required");
  }
}

function time(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("Invalid timestamp");
  }
}

function positive(value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError("Positive safe integer required");
  }
}

export class PrivateStatusCache {
  #sources = new Map<string, StatusSource>();
  #cache = new Map<string, CachedSnapshot>();

  constructor(
    sources: readonly StatusSource[],
    private readonly dependencies: StatusDependencies,
  ) {
    for (const source of sources) {
      ref(source.listRef);
      const url = new URL(source.url);

      if (
        url.protocol !== "https:" ||
        url.username !== "" ||
        url.password !== "" ||
        this.#sources.has(source.listRef)
      ) {
        throw new TypeError("Invalid status source");
      }

      positive(source.maximumAgeMs);
      positive(source.maximumBytes);
      positive(source.minimumEntryCount);

      this.#sources.set(
        source.listRef,
        Object.freeze({ ...source }),
      );
    }
  }

  async refresh(listRef: string): Promise<boolean> {
    ref(listRef);
    const source = this.#sources.get(listRef);
    if (!source) return false;

    try {
      // No credential identifier or index enters the network request.
      const raw = await this.dependencies.fetchWholeList(
        source.url,
        source.maximumBytes,
      );
      return await this.acceptStaple(listRef, raw);
    } catch {
      return false;
    }
  }

  async acceptStaple(
    listRef: string,
    raw: Uint8Array,
  ): Promise<boolean> {
    ref(listRef);
    const source = this.#sources.get(listRef);
    if (!source || raw.byteLength > source.maximumBytes) {
      return false;
    }

    try {
      const verified = await this.dependencies.verifySnapshot(
        raw.slice(),
        source,
      );

      const now = this.dependencies.now();
      time(now);
      time(verified.issuedAt);
      time(verified.expiresAt);
      positive(verified.entryCount);

      if (
        verified.listRef !== listRef ||
        verified.issuedAt > now ||
        verified.expiresAt <= verified.issuedAt ||
        verified.expiresAt <= now ||
        now - verified.issuedAt > source.maximumAgeMs ||
        verified.entryCount < source.minimumEntryCount
      ) {
        return false;
      }

      const revoked = new Set<number>();
      for (const index of verified.revokedIndices) {
        if (
          !Number.isSafeInteger(index) ||
          index < 0 ||
          index >= verified.entryCount ||
          revoked.has(index)
        ) {
          return false;
        }
        revoked.add(index);
      }

      const previous = this.#cache.get(listRef);
      if (previous && verified.issuedAt < previous.issuedAt) {
        return false;
      }

      // Equal-time, different-content snapshots are rejected.
      if (
        previous &&
        verified.issuedAt === previous.issuedAt &&
        (
          verified.expiresAt !== previous.expiresAt ||
          verified.entryCount !== previous.entryCount ||
          revoked.size !== previous.revoked.size ||
          [...revoked].some((index) => !previous.revoked.has(index))
        )
      ) {
        return false;
      }

      this.#cache.set(listRef, {
        issuedAt: verified.issuedAt,
        expiresAt: verified.expiresAt,
        entryCount: verified.entryCount,
        revoked,
      });
      return true;
    } catch {
      return false;
    }
  }

  checkLocally(listRef: string, index: number): StatusResult {
    ref(listRef);
    if (!Number.isSafeInteger(index) || index < 0) {
      throw new TypeError("Invalid local status index");
    }

    const now = this.dependencies.now();
    time(now);

    const source = this.#sources.get(listRef);
    const snapshot = this.#cache.get(listRef);

    if (
      !source ||
      !snapshot ||
      index >= snapshot.entryCount ||
      now < snapshot.issuedAt ||
      now >= snapshot.expiresAt ||
      now - snapshot.issuedAt > source.maximumAgeMs
    ) {
      return "unknown";
    }

    return snapshot.revoked.has(index)
      ? "revoked"
      : "not_revoked";
  }

  clear(): void {
    this.#cache.clear();
  }
}

export type AdapterVerifiedEvidence = Readonly<{
  presentation: VerifiedPresentation;
  holderProofVerified: boolean;
  credentialToHolderBindingVerified: boolean;
}>;

export type CredentialAdapter = Readonly<{
  adapterRef: string;
  verify: (
    rawPresentation: unknown,
    context: EvaluationContext,
  ) => Promise<AdapterVerifiedEvidence>;
}>;

export type SubmittedPresentation = Readonly<{
  adapterRef: string;
  rawPresentation: unknown;
}>;

export async function orchestrateAdmission(
  submissions: readonly SubmittedPresentation[],
  adapters: ReadonlyMap<string, CredentialAdapter>,
  policy: AdmissionPolicy,
  evidenceProfiles: readonly EvidenceProfile[],
  initialContext: EvaluationContext,
  currentContext: () => EvaluationContext,
): Promise<AdmissionDecision> {
  const presentations: VerifiedPresentation[] = [];

  for (const submission of submissions) {
    ref(submission.adapterRef);
    const adapter = adapters.get(submission.adapterRef);
    if (!adapter || adapter.adapterRef !== submission.adapterRef) {
      continue;
    }

    try {
      const result = await adapter.verify(
        submission.rawPresentation,
        Object.freeze({ ...initialContext }),
      );

      if (
        result.holderProofVerified !== true ||
        result.credentialToHolderBindingVerified !== true
      ) {
        continue;
      }

      presentations.push(result.presentation);
    } catch {
      // An unusable route supplies no accepted evidence.
      // Do not log raw presentations in this boundary.
    }
  }

  const current = currentContext();

  const transactionUnchanged =
    current.audience === initialContext.audience &&
    current.challengeRef === initialContext.challengeRef &&
    current.holderBindingRef === initialContext.holderBindingRef &&
    current.evaluationContextRef === initialContext.evaluationContextRef;

  if (!transactionUnchanged) {
    return Object.freeze({
      outcome: "review_required",
      policyRef: policy.policyRef,
      requirements: Object.freeze([]),
    });
  }

  return evaluateAdmission(
    policy,
    evidenceProfiles,
    presentations,
    current,
  );
}
