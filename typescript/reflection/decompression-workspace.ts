// SPDX-License-Identifier: MIT OR Apache-2.0

export const DECOMPRESSION_PROMPTS = Object.freeze([
  "Would you like some space, a private note, or to close this?",
  "Is there anything you want to remember for yourself?",
  "You can revise your boundaries.",
  "Continuing the connection is optional.",
]);

export type WorkspaceView =
  | Readonly<{ status: "closed" }>
  | Readonly<{
      status: "open";
      note: string;
      continuityDraft: string;
    }>;

export class DecompressionWorkspace {
  #open = false;
  #note = "";
  #continuityDraft = "";

  constructor(private readonly maximumCharacters: number = 8000) {
    if (
      !Number.isSafeInteger(maximumCharacters) ||
      maximumCharacters <= 0
    ) {
      throw new RangeError("maximumCharacters must be positive");
    }
  }

  #requireOpen(): void {
    if (!this.#open) {
      throw new Error("Workspace is closed");
    }
  }

  #text(value: string): string {
    if (typeof value !== "string") {
      throw new TypeError("Expected text");
    }
    if (value.length > this.maximumCharacters) {
      throw new RangeError("Text exceeds workspace capacity");
    }
    return value;
  }

  open(): WorkspaceView {
    this.close();
    this.#open = true;
    return this.view();
  }

  setNote(value: string): void {
    this.#requireOpen();
    this.#note = this.#text(value);
  }

  setContinuityDraft(value: string): void {
    this.#requireOpen();
    this.#continuityDraft = this.#text(value);
  }

  clearNote(): void {
    this.#note = "";
  }

  invalidateContinuityDraft(): void {
    this.#continuityDraft = "";
  }

  view(): WorkspaceView {
    if (!this.#open) {
      return Object.freeze({ status: "closed" });
    }
    return Object.freeze({
      status: "open",
      note: this.#note,
      continuityDraft: this.#continuityDraft,
    });
  }

  close(): void {
    this.#note = "";
    this.#continuityDraft = "";
    this.#open = false;
  }
}
