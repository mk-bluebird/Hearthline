// SPDX-License-Identifier: MIT OR Apache-2.0

export type ObjectState =
  | "ACTIVE"
  | "EXPIRED"
  | "REVOKED"
  | "CONSUMED";

export class EphemeralObject {
  #state: ObjectState = "ACTIVE";
  #content: string | null;
  #lastTime: number;

  constructor(
    content: string,
    private readonly createdAt: number,
    private readonly expiresAt: number,
  ) {
    if (
      typeof content !== "string" ||
      !Number.isSafeInteger(createdAt) ||
      createdAt < 0 ||
      !Number.isSafeInteger(expiresAt) ||
      expiresAt <= createdAt
    ) {
      throw new TypeError("Invalid ephemeral object");
    }
    this.#content = content;
    this.#lastTime = createdAt;
  }

  #refresh(now: number): void {
    if (
      !Number.isSafeInteger(now) ||
      now < this.#lastTime
    ) {
      throw new TypeError("Invalid or regressing evaluation time");
    }
    this.#lastTime = now;

    if (this.#state === "ACTIVE" && now >= this.expiresAt) {
      this.#state = "EXPIRED";
      this.#content = null;
    }
  }

  read(now: number, currentPermission: boolean): string | null {
    if (typeof currentPermission !== "boolean") {
      throw new TypeError("Explicit permission decision required");
    }
    this.#refresh(now);

    return this.#state === "ACTIVE" && currentPermission
      ? this.#content
      : null;
  }

  consume(now: number, currentPermission: boolean): string | null {
    const content = this.read(now, currentPermission);
    if (content === null) return null;

    this.#state = "CONSUMED";
    this.#content = null;
    return content;
  }

  revoke(): void {
    if (this.#state === "ACTIVE") {
      this.#state = "REVOKED";
    }
    this.#content = null;
  }

  expireDue(now: number): ObjectState {
    this.#refresh(now);
    return this.#state;
  }
}
