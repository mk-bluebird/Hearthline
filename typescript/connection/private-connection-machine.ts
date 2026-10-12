// SPDX-License-Identifier: MIT OR Apache-2.0

export type Participant = "a" | "b";
export type Stage =
  | "INTEREST_REVIEW"
  | "LIMITED_CONVERSATION"
  | "EXPANSION_REVIEWED"
  | "OPTIONAL_PLANNING"
  | "CLOSED";

export type NextStage =
  | "LIMITED_CONVERSATION"
  | "EXPANSION_REVIEWED"
  | "OPTIONAL_PLANNING";

export type ProposalView = Readonly<{
  proposalRef: string;
  next: NextStage;
  revision: number;
  expiresAt: number;
}>;

export type ActionAuthorization = Readonly<{
  proposalRef: string;
  revision: number;
  next: NextStage;
  evaluatedAt: number;
  eligibilityAndPolicyPermit: boolean;
  disclosurePermits: boolean;
  pacingPermits: boolean;
  integrityPermits: boolean;
}>;

const NEXT: Partial<Record<Stage, NextStage>> = {
  INTEREST_REVIEW: "LIMITED_CONVERSATION",
  LIMITED_CONVERSATION: "EXPANSION_REVIEWED",
  EXPANSION_REVIEWED: "OPTIONAL_PLANNING",
};

type Pending = {
  view: ProposalView;
  confirmations: Set<Participant>;
};

function participant(value: Participant): void {
  if (value !== "a" && value !== "b") {
    throw new TypeError("Unknown participant slot");
  }
}

export class PrivateConnectionMachine {
  #stage: Stage = "INTEREST_REVIEW";
  #revision = 0;
  #paused = new Set<Participant>();
  #pending: Pending | null = null;
  #lastTime = -Infinity;

  constructor(private readonly now: () => number) {}

  #time(): number {
    const time = this.now();
    if (
      !Number.isSafeInteger(time) ||
      time < 0 ||
      time < this.#lastTime
    ) {
      this.#pending = null;
      throw new Error("Invalid or regressing evaluation clock");
    }
    this.#lastTime = time;
    return time;
  }

  #invalidate(): void {
    if (this.#revision >= Number.MAX_SAFE_INTEGER) {
      this.#stage = "CLOSED";
      this.#pending = null;
      throw new Error("Revision capacity exhausted");
    }
    this.#revision += 1;
    this.#pending = null;
  }

  #active(): void {
    if (this.#stage === "CLOSED" || this.#paused.size > 0) {
      throw new Error("Connection cannot advance");
    }
  }

  #proposal(reference: string, time: number): Pending {
    const pending = this.#pending;
    if (
      pending === null ||
      pending.view.proposalRef !== reference ||
      pending.view.revision !== this.#revision ||
      time >= pending.view.expiresAt
    ) {
      throw new Error("Proposal unavailable, changed, or expired");
    }
    return pending;
  }

  propose(
    next: NextStage,
    proposalRef: string,
    expiresAt: number,
  ): ProposalView {
    this.#active();
    const time = this.#time();

    if (NEXT[this.#stage] !== next) {
      throw new Error("Unsupported transition");
    }
    if (
      proposalRef.trim() === "" ||
      !Number.isSafeInteger(expiresAt) ||
      expiresAt <= time
    ) {
      throw new TypeError("Invalid proposal");
    }

    this.#invalidate();
    const view: ProposalView = Object.freeze({
      proposalRef,
      next,
      revision: this.#revision,
      expiresAt,
    });

    this.#pending = { view, confirmations: new Set() };
    return view;
  }

  confirm(who: Participant, proposalRef: string): void {
    participant(who);
    this.#active();
    const pending = this.#proposal(proposalRef, this.#time());
    pending.confirmations.add(who);
  }

  advance(authorization: ActionAuthorization): Stage {
    this.#active();
    const time = this.#time();
    const pending = this.#proposal(
      authorization.proposalRef,
      time,
    );

    if (
      authorization.revision !== this.#revision ||
      authorization.next !== pending.view.next ||
      authorization.evaluatedAt !== time ||
      pending.confirmations.size !== 2 ||
      authorization.eligibilityAndPolicyPermit !== true ||
      authorization.disclosurePermits !== true ||
      authorization.pacingPermits !== true ||
      authorization.integrityPermits !== true
    ) {
      throw new Error("Current action authorization is insufficient");
    }

    this.#stage = pending.view.next;
    this.#invalidate();
    return this.#stage;
  }

  pause(who: Participant): void {
    participant(who);
    if (this.#stage === "CLOSED") return;
    this.#paused.add(who);
    this.#invalidate();
  }

  resume(who: Participant): void {
    participant(who);
    if (this.#stage === "CLOSED") {
      throw new Error("Closed connection cannot resume");
    }
    this.#paused.delete(who);
    this.#invalidate();
  }

  preferencesChanged(): void {
    if (this.#stage === "CLOSED") return;
    this.#stage = "INTEREST_REVIEW";
    this.#invalidate();
  }

  close(): void {
    this.#stage = "CLOSED";
    this.#pending = null;
    this.#paused.clear();
  }

  ownerView(): Readonly<{
    stage: Stage;
    revision: number;
    progressionAvailable: boolean;
  }> {
    return Object.freeze({
      stage: this.#stage,
      revision: this.#revision,
      progressionAvailable:
        this.#stage !== "CLOSED" && this.#paused.size === 0,
    });
  }
}
