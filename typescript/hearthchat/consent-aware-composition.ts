// SPDX-License-Identifier: MIT OR Apache-2.0

export type SuggestionState =
  | "RENDER_REQUIRES_CURRENT_CONSENT"
  | "RENDER_ALLOWED"
  | "INVALIDATED_BY_SCOPE_CHANGE"
  | "EXPIRED";

export type CompositionBinding = Readonly<{
  recipientRef: string;
  manifestRef: string;
  authorizationRevision: number;
}>;

export class ConsentAwareComposition {
  #text = "";
  #contentRevision = 0;
  #previewRevision: number | null = null;
  #state: SuggestionState = "RENDER_REQUIRES_CURRENT_CONSENT";
  #binding: CompositionBinding;
  #expiresAt: number;

  constructor(binding: CompositionBinding, expiresAt: number) {
    this.#validateBinding(binding);
    if (!Number.isSafeInteger(expiresAt) || expiresAt < 0) {
      throw new TypeError("Invalid expiry");
    }
    this.#binding = Object.freeze({ ...binding });
    this.#expiresAt = expiresAt;
  }

  #validateBinding(binding: CompositionBinding): void {
    if (
      !binding.recipientRef.trim() ||
      !binding.manifestRef.trim() ||
      !Number.isSafeInteger(binding.authorizationRevision) ||
      binding.authorizationRevision < 0
    ) {
      throw new TypeError("Invalid composition binding");
    }
  }

  #current(binding: CompositionBinding, now: number): boolean {
    this.#validateBinding(binding);
    if (!Number.isSafeInteger(now) || now < 0) {
      throw new TypeError("Invalid evaluation time");
    }

    if (now >= this.#expiresAt) {
      this.#state = "EXPIRED";
      this.#text = "";
      this.#previewRevision = null;
      return false;
    }

    const matches =
      binding.recipientRef === this.#binding.recipientRef &&
      binding.manifestRef === this.#binding.manifestRef &&
      binding.authorizationRevision ===
        this.#binding.authorizationRevision;

    if (!matches) this.invalidate();
    return matches &&
      this.#state !== "INVALIDATED_BY_SCOPE_CHANGE" &&
      this.#state !== "EXPIRED";
  }

  edit(text: string): void {
    if (
      this.#state === "INVALIDATED_BY_SCOPE_CHANGE" ||
      this.#state === "EXPIRED"
    ) {
      throw new Error("Create a new composition");
    }
    if (typeof text !== "string" || text.length > 8000) {
      throw new TypeError("Invalid text");
    }
    if (this.#contentRevision >= Number.MAX_SAFE_INTEGER) {
      throw new Error("Content revision capacity exhausted");
    }

    this.#text = text;
    this.#contentRevision += 1;
    this.#previewRevision = null;
    this.#state = "RENDER_REQUIRES_CURRENT_CONSENT";
  }

  preview(
    binding: CompositionBinding,
    now: number,
    permitted: boolean,
  ): string | null {
    if (typeof permitted !== "boolean") {
      throw new TypeError("Explicit permission required");
    }
    if (!this.#current(binding, now)) return null;
    if (!permitted) {
      this.invalidate();
      return null;
    }

    this.#state = "RENDER_ALLOWED";
    this.#previewRevision = this.#contentRevision;
    return this.#text;
  }

  submission(
    binding: CompositionBinding,
    now: number,
    finalUsePermitted: boolean,
  ): Readonly<{ text: string; contentRevision: number }> | null {
    if (typeof finalUsePermitted !== "boolean") {
      throw new TypeError("Explicit final-use decision required");
    }
    if (!this.#current(binding, now)) return null;
    if (!finalUsePermitted) {
      this.invalidate();
      return null;
    }
    if (
      this.#state !== "RENDER_ALLOWED" ||
      this.#previewRevision !== this.#contentRevision ||
      !this.#text.trim()
    ) {
      return null;
    }

    return Object.freeze({
      text: this.#text,
      contentRevision: this.#contentRevision,
    });
  }

  invalidate(): void {
    this.#state = "INVALIDATED_BY_SCOPE_CHANGE";
    this.#text = "";
    this.#previewRevision = null;
  }
}
