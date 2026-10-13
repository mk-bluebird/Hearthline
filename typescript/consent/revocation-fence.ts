// SPDX-License-Identifier: MIT OR Apache-2.0

export type ScopeTicket = Readonly<{
  scopeRef: string;
  revision: number;
  expiresAt: number;
}>;

type ScopeRecord = {
  revision: number;
  active: boolean;
  expiresAt: number;
};

export class RevocationFence {
  #scopes = new Map<string, ScopeRecord>();

  grant(scopeRef: string, expiresAt: number, now: number): ScopeTicket {
    this.#validateTime(now);
    if (
      typeof scopeRef !== "string" ||
      !scopeRef.trim() ||
      !Number.isSafeInteger(expiresAt) ||
      expiresAt <= now
    ) {
      throw new TypeError("Invalid grant");
    }

    const previous = this.#scopes.get(scopeRef);
    const revision = this.#next(previous?.revision ?? 0);

    this.#scopes.set(scopeRef, {
      revision,
      active: true,
      expiresAt,
    });

    return Object.freeze({ scopeRef, revision, expiresAt });
  }

  revoke(scopeRef: string): number {
    if (typeof scopeRef !== "string" || !scopeRef.trim()) {
      throw new TypeError("Invalid scope reference");
    }

    const previous = this.#scopes.get(scopeRef);
    const revision = this.#next(previous?.revision ?? 0);

    this.#scopes.set(scopeRef, {
      revision,
      active: false,
      expiresAt: 0,
    });

    return revision;
  }

  permits(ticket: ScopeTicket, now: number): boolean {
    this.#validateTime(now);
    if (
      typeof ticket.scopeRef !== "string" ||
      !ticket.scopeRef.trim() ||
      !Number.isSafeInteger(ticket.revision) ||
      ticket.revision < 1 ||
      !Number.isSafeInteger(ticket.expiresAt) ||
      ticket.expiresAt < 0
    ) {
      throw new TypeError("Invalid scope ticket");
    }

    const current = this.#scopes.get(ticket.scopeRef);

    return current !== undefined &&
      current.active &&
      current.revision === ticket.revision &&
      current.expiresAt === ticket.expiresAt &&
      now < current.expiresAt;
  }

  #validateTime(now: number): void {
    if (!Number.isSafeInteger(now) || now < 0) {
      throw new TypeError("Invalid authoritative time");
    }
  }

  #next(revision: number): number {
    if (revision >= Number.MAX_SAFE_INTEGER) {
      throw new Error("Scope revision capacity exhausted");
    }
    return revision + 1;
  }
}
