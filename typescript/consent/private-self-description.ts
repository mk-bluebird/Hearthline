// SPDX-License-Identifier: MIT OR Apache-2.0

export type DisclosureGrant = Readonly<{
  recipientRef: string;
  statementRevision: number;
  expiresAt: number;
  permitted: boolean;
}>;

export class PrivateSelfDescription {
  #text = "";
  #revision = 0;

  set(text: string): number {
    if (typeof text !== "string" || text.length > 2000) {
      throw new TypeError("Invalid self-description");
    }
    if (this.#revision >= Number.MAX_SAFE_INTEGER) {
      throw new Error("Statement revision capacity exhausted");
    }

    this.#revision += 1;
    this.#text = text;
    return this.#revision;
  }

  renderForRecipient(
    intendedRecipientRef: string,
    grant: DisclosureGrant,
    now: number,
  ): string | null {
    if (
      typeof intendedRecipientRef !== "string" ||
      !intendedRecipientRef.trim() ||
      typeof grant.recipientRef !== "string" ||
      !grant.recipientRef.trim() ||
      !Number.isSafeInteger(grant.statementRevision) ||
      grant.statementRevision < 0 ||
      !Number.isSafeInteger(grant.expiresAt) ||
      grant.expiresAt < 0 ||
      !Number.isSafeInteger(now) ||
      now < 0 ||
      typeof grant.permitted !== "boolean"
    ) {
      throw new TypeError("Invalid disclosure context");
    }

    if (
      !grant.permitted ||
      grant.recipientRef !== intendedRecipientRef ||
      grant.statementRevision !== this.#revision ||
      now >= grant.expiresAt ||
      this.#text === ""
    ) {
      return null;
    }

    return this.#text;
  }

  clear(): void {
    if (this.#revision >= Number.MAX_SAFE_INTEGER) {
      this.#text = "";
      throw new Error("Statement revision capacity exhausted");
    }
    this.#revision += 1;
    this.#text = "";
  }
}
