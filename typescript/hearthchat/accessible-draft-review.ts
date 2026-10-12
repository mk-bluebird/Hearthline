// SPDX-License-Identifier: MIT OR Apache-2.0

export type DraftContext = Readonly<{
  recipientRef: string;
  scopeManifestRef: string;
  authorizationRevision: number;
}>;

export type DraftView = Readonly<{
  text: string;
  language: string;
  contentRevision: number;
  reviewed: boolean;
}>;

function validateContext(context: DraftContext): void {
  for (const ref of [
    context.recipientRef,
    context.scopeManifestRef,
  ]) {
    if (typeof ref !== "string" || !ref.trim()) {
      throw new TypeError("Nonempty context references required");
    }
  }
  if (
    !Number.isSafeInteger(context.authorizationRevision) ||
    context.authorizationRevision < 0
  ) {
    throw new TypeError("Invalid authorization revision");
  }
}

function sameContext(a: DraftContext, b: DraftContext): boolean {
  return a.recipientRef === b.recipientRef &&
    a.scopeManifestRef === b.scopeManifestRef &&
    a.authorizationRevision === b.authorizationRevision;
}

export class AccessibleDraftReview {
  #text = "";
  #language = "und";
  #revision = 0;
  #reviewedRevision: number | null = null;
  #context: DraftContext | null = null;

  propose(
    text: string,
    language: string,
    context: DraftContext,
  ): void {
    validateContext(context);
    if (
      typeof text !== "string" ||
      text.length > 8000 ||
      typeof language !== "string" ||
      !language.trim()
    ) {
      throw new TypeError("Invalid draft");
    }
    if (this.#revision >= Number.MAX_SAFE_INTEGER) {
      throw new Error("Draft revision capacity exhausted");
    }

    this.#revision += 1;
    this.#text = text;
    this.#language = language;
    this.#context = Object.freeze({ ...context });
    this.#reviewedRevision = null;
  }

  markReviewed(current: DraftContext): void {
    validateContext(current);
    if (
      this.#context === null ||
      !sameContext(this.#context, current)
    ) {
      this.clear();
      throw new Error("Draft context changed");
    }
    this.#reviewedRevision = this.#revision;
  }

  view(
    current: DraftContext,
    currentRenderingPermitted: boolean,
  ): DraftView | null {
    validateContext(current);
    if (typeof currentRenderingPermitted !== "boolean") {
      throw new TypeError("Explicit permission decision required");
    }

    if (
      !currentRenderingPermitted ||
      this.#context === null ||
      !sameContext(this.#context, current)
    ) {
      this.clear();
      return null;
    }

    return Object.freeze({
      text: this.#text,
      language: this.#language,
      contentRevision: this.#revision,
      reviewed: this.#reviewedRevision === this.#revision,
    });
  }

  clear(): void {
    this.#text = "";
    this.#language = "und";
    this.#context = null;
    this.#reviewedRevision = null;
  }
}
