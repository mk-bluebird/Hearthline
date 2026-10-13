// SPDX-License-Identifier: MIT OR Apache-2.0

export type ReviewTask = Readonly<{
  taskRef: string;
  evidenceRef: string;
  qualification: string;
  createdAt: number;
  deadlineAt: number | null;
}>;

type TaskRecord = {
  task: ReviewTask;
  state: "WAITING" | "LEASED" | "COMPLETE";
  lease: {
    token: string;
    reviewerRef: string;
    expiresAt: number;
  } | null;
};

export type Reviewer = Readonly<{
  reviewerRef: string;
  qualifications: readonly string[];
  available: boolean;
  maximumActiveLeases: number;
}>;

export type ReviewLease = Readonly<{
  taskRef: string;
  evidenceRef: string;
  leaseToken: string;
  expiresAt: number;
}>;

function reference(value: string): void {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("Nonempty reference required");
  }
}

function time(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("Invalid timestamp");
  }
}

export class ReviewQueue {
  #tasks = new Map<string, TaskRecord>();
  #tokens = new Set<string>();

  constructor(
    private readonly opaqueToken: () => string,
    private readonly leaseDurationMs: number,
  ) {
    if (
      !Number.isSafeInteger(leaseDurationMs) ||
      leaseDurationMs <= 0
    ) {
      throw new TypeError("Invalid lease duration");
    }
  }

  enqueue(task: ReviewTask): void {
    reference(task.taskRef);
    reference(task.evidenceRef);
    reference(task.qualification);
    time(task.createdAt);
    if (task.deadlineAt !== null) {
      time(task.deadlineAt);
      if (task.deadlineAt < task.createdAt) {
        throw new TypeError("Deadline precedes task creation");
      }
    }
    if (this.#tasks.has(task.taskRef)) {
      throw new Error("Task already exists");
    }

    this.#tasks.set(task.taskRef, {
      task: Object.freeze({ ...task }),
      state: "WAITING",
      lease: null,
    });
  }

  #expire(now: number): void {
    for (const record of this.#tasks.values()) {
      if (
        record.state === "LEASED" &&
        record.lease !== null &&
        now >= record.lease.expiresAt
      ) {
        record.state = "WAITING";
        record.lease = null;
      }
    }
  }

  acquire(reviewer: Reviewer, now: number): ReviewLease | null {
    time(now);
    reference(reviewer.reviewerRef);
    reviewer.qualifications.forEach(reference);

    if (
      typeof reviewer.available !== "boolean" ||
      !Number.isSafeInteger(reviewer.maximumActiveLeases) ||
      reviewer.maximumActiveLeases <= 0
    ) {
      throw new TypeError("Invalid reviewer capacity");
    }

    this.#expire(now);
    if (!reviewer.available) return null;

    const active = [...this.#tasks.values()].filter(
      (record) =>
        record.state === "LEASED" &&
        record.lease?.reviewerRef === reviewer.reviewerRef,
    ).length;

    if (active >= reviewer.maximumActiveLeases) return null;

    const qualifications = new Set(reviewer.qualifications);
    const candidates = [...this.#tasks.values()]
      .filter((record) =>
        record.state === "WAITING" &&
        record.task.createdAt <= now &&
        qualifications.has(record.task.qualification))
      .sort((a, b) => {
        const first = a.task.deadlineAt ?? Number.MAX_SAFE_INTEGER;
        const second = b.task.deadlineAt ?? Number.MAX_SAFE_INTEGER;
        if (first !== second) return first < second ? -1 : 1;
        if (a.task.createdAt !== b.task.createdAt) {
          return a.task.createdAt - b.task.createdAt;
        }
        return a.task.taskRef < b.task.taskRef ? -1 :
          a.task.taskRef > b.task.taskRef ? 1 : 0;
      });

    const selected = candidates[0];
    if (!selected) return null;

    const token = this.opaqueToken();
    reference(token);
    if (this.#tokens.has(token)) {
      throw new Error("Lease-token collision");
    }

    const expiresAt = now + this.leaseDurationMs;
    if (!Number.isSafeInteger(expiresAt)) {
      throw new RangeError("Lease expiry overflow");
    }

    this.#tokens.add(token);
    selected.state = "LEASED";
    selected.lease = {
      token,
      reviewerRef: reviewer.reviewerRef,
      expiresAt,
    };

    return Object.freeze({
      taskRef: selected.task.taskRef,
      evidenceRef: selected.task.evidenceRef,
      leaseToken: token,
      expiresAt,
    });
  }

  complete(
    taskRef: string,
    reviewerRef: string,
    leaseToken: string,
    now: number,
  ): boolean {
    time(now);
    reference(taskRef);
    reference(reviewerRef);
    reference(leaseToken);
    this.#expire(now);

    const record = this.#tasks.get(taskRef);
    if (
      !record ||
      record.state !== "LEASED" ||
      record.lease?.token !== leaseToken ||
      record.lease.reviewerRef !== reviewerRef
    ) {
      return false;
    }

    record.state = "COMPLETE";
    record.lease = null;
    return true;
  }
}

export type WorkloadScenario = Readonly<{
  newTransactions: number;
  reuseTransactions: number;
  renewalTransactions: number;
  appealTransactions: number;
  newReviewProbability: number;
  reusableSuccessProbability: number;
  failedReuseReviewProbability: number;
  successfulReuseReviewProbability: number;
  renewalReviewProbability: number;
  appealReviewProbability: number;
}>;

export function expectedReviews(s: WorkloadScenario): number {
  for (const count of [
    s.newTransactions,
    s.reuseTransactions,
    s.renewalTransactions,
    s.appealTransactions,
  ]) {
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new TypeError("Invalid transaction count");
    }
  }

  for (const probability of [
    s.newReviewProbability,
    s.reusableSuccessProbability,
    s.failedReuseReviewProbability,
    s.successfulReuseReviewProbability,
    s.renewalReviewProbability,
    s.appealReviewProbability,
  ]) {
    if (
      !Number.isFinite(probability) ||
      probability < 0 ||
      probability > 1
    ) {
      throw new TypeError("Invalid review probability");
    }
  }

  return s.newTransactions * s.newReviewProbability +
    s.reuseTransactions * (
      (1 - s.reusableSuccessProbability) *
        s.failedReuseReviewProbability +
      s.reusableSuccessProbability *
        s.successfulReuseReviewProbability
    ) +
    s.renewalTransactions * s.renewalReviewProbability +
    s.appealTransactions * s.appealReviewProbability;
}

export type AuthorityTicket = Readonly<{
  scopeRef: string;
  revision: number;
  expiresAt: number;
}>;

export class LocalRevisionFence {
  #records = new Map<string, {
    revision: number;
    active: boolean;
    expiresAt: number;
  }>();

  update(
    scopeRef: string,
    active: boolean,
    expiresAt: number,
  ): AuthorityTicket {
    reference(scopeRef);
    time(expiresAt);
    if (typeof active !== "boolean") {
      throw new TypeError("Explicit authority state required");
    }

    const previous = this.#records.get(scopeRef);
    const revision = (previous?.revision ?? 0) + 1;
    if (!Number.isSafeInteger(revision)) {
      throw new Error("Revision capacity exhausted");
    }

    this.#records.set(scopeRef, { revision, active, expiresAt });
    return Object.freeze({ scopeRef, revision, expiresAt });
  }

  permits(ticket: AuthorityTicket, now: number): boolean {
    reference(ticket.scopeRef);
    time(ticket.expiresAt);
    time(now);
    if (!Number.isSafeInteger(ticket.revision) || ticket.revision < 1) {
      throw new TypeError("Invalid authority ticket");
    }

    const current = this.#records.get(ticket.scopeRef);
    return current !== undefined &&
      current.active &&
      current.revision === ticket.revision &&
      current.expiresAt === ticket.expiresAt &&
      now < current.expiresAt;
  }
}
