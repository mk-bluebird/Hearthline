// SPDX-License-Identifier: MIT OR Apache-2.0

export type DraftBinding = Readonly<{
  requestRef: string;
  manifestRef: string;
  authorizationRevision: number;
}>;

export type DraftRequest = Readonly<{
  task: "conversation_starter" | "boundary_wording" | "rewrite";
  submittedText: string;
  language: string;
}>;

export type DraftAuthority = Readonly<{
  binding: DraftBinding;
  generationPermitted: boolean;
  renderingPermitted: boolean;
}>;

export type DraftingDependencies = Readonly<{
  currentAuthority: () => DraftAuthority;
  generate: (
    request: DraftRequest,
    options: Readonly<{
      signal: AbortSignal;
      maximumOutputTokens: number;
    }>,
  ) => Promise<string>;
}>;

export class ConsentGatedDrafting {
  #generation = 0;
  #abort: AbortController | null = null;
  #text: string | null = null;
  #binding: DraftBinding | null = null;
  #state:
    | "EMPTY"
    | "GENERATING"
    | "RENDER_ALLOWED"
    | "INVALIDATED" = "EMPTY";

  constructor(
    private readonly dependencies: DraftingDependencies,
    private readonly maximumInputBytes = 12_000,
    private readonly maximumOutputTokens = 600,
  ) {
    for (const value of [maximumInputBytes, maximumOutputTokens]) {
      if (!Number.isSafeInteger(value) || value <= 0) {
        throw new TypeError("Invalid drafting budget");
      }
    }
  }

  #authority(): DraftAuthority {
    const authority = this.dependencies.currentAuthority();
    const binding = authority.binding;

    if (
      typeof binding.requestRef !== "string" ||
      !binding.requestRef.trim() ||
      typeof binding.manifestRef !== "string" ||
      !binding.manifestRef.trim() ||
      !Number.isSafeInteger(binding.authorizationRevision) ||
      binding.authorizationRevision < 0 ||
      typeof authority.generationPermitted !== "boolean" ||
      typeof authority.renderingPermitted !== "boolean"
    ) {
      throw new TypeError("Invalid authoritative drafting context");
    }

    return {
      binding: Object.freeze({ ...binding }),
      generationPermitted: authority.generationPermitted,
      renderingPermitted: authority.renderingPermitted,
    };
  }

  #same(first: DraftBinding, second: DraftBinding): boolean {
    return first.requestRef === second.requestRef &&
      first.manifestRef === second.manifestRef &&
      first.authorizationRevision === second.authorizationRevision;
  }

  async request(input: DraftRequest): Promise<boolean> {
    this.invalidate();

    if (
      !["conversation_starter", "boundary_wording", "rewrite"]
        .includes(input.task) ||
      typeof input.submittedText !== "string" ||
      typeof input.language !== "string" ||
      !input.language.trim()
    ) {
      throw new TypeError("Invalid drafting request");
    }

    const request: DraftRequest = Object.freeze({
      task: input.task,
      submittedText: input.submittedText,
      language: input.language,
    });

    const bytes = new TextEncoder().encode(JSON.stringify(request)).length;
    if (bytes > this.maximumInputBytes) {
      throw new RangeError("Drafting input exceeds the approved budget");
    }

    const initial = this.#authority();
    if (!initial.generationPermitted || !initial.renderingPermitted) {
      return false;
    }

    const generation = this.#generation;
    const controller = new AbortController();
    this.#abort = controller;
    this.#state = "GENERATING";

    try {
      const output = await this.dependencies.generate(request, {
        signal: controller.signal,
        maximumOutputTokens: this.maximumOutputTokens,
      });

      // An older request must not modify a newer request's state.
      if (
        generation !== this.#generation ||
        controller.signal.aborted
      ) {
        return false;
      }

      const current = this.#authority();
      if (
        !current.generationPermitted ||
        !current.renderingPermitted ||
        !this.#same(initial.binding, current.binding) ||
        typeof output !== "string" ||
        output.length > 8000
      ) {
        this.invalidate();
        return false;
      }

      this.#text = output;
      this.#binding = initial.binding;
      this.#state = "RENDER_ALLOWED";
      return true;
    } catch {
      if (generation === this.#generation) this.invalidate();
      return false;
    } finally {
      if (generation === this.#generation) this.#abort = null;
    }
  }

  render(): string | null {
    if (this.#state !== "RENDER_ALLOWED" || this.#binding === null) {
      return null;
    }

    const current = this.#authority();
    if (
      !current.renderingPermitted ||
      !this.#same(this.#binding, current.binding)
    ) {
      this.invalidate();
      return null;
    }

    return this.#text;
  }

  invalidate(): void {
    this.#abort?.abort();
    this.#abort = null;
    this.#text = null;
    this.#binding = null;
    this.#state = "INVALIDATED";

    if (this.#generation >= Number.MAX_SAFE_INTEGER) {
      throw new Error("Draft generation capacity exhausted");
    }
    this.#generation += 1;
  }
}
