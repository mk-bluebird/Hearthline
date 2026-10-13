// SPDX-License-Identifier: MIT OR Apache-2.0

export type ViewLease = Readonly<{
  generation: number;
  signal: AbortSignal;
}>;

export class PrivateViewController {
  #generation = 0;
  #visible = false;
  #abort = new AbortController();

  constructor(private readonly root: HTMLElement) {}

  open(): ViewLease {
    this.#invalidate();
    this.#visible = true;
    this.root.replaceChildren();

    return Object.freeze({
      generation: this.#generation,
      signal: this.#abort.signal,
    });
  }

  render(lease: ViewLease, content: Node): boolean {
    if (
      !this.#visible ||
      lease.generation !== this.#generation ||
      lease.signal !== this.#abort.signal ||
      lease.signal.aborted
    ) {
      return false;
    }

    this.root.replaceChildren(content);
    return true;
  }

  conceal(): void {
    this.#invalidate();
    this.#visible = false;
    document.title = "Private view closed";

    const message = document.createElement("p");
    message.textContent =
      "This view is closed. Hiding a view does not sign you out.";
    this.root.replaceChildren(message);
  }

  #invalidate(): void {
    this.#abort.abort();

    if (this.#generation >= Number.MAX_SAFE_INTEGER) {
      this.#visible = false;
      this.root.replaceChildren();
      throw new Error("View generation capacity exhausted");
    }

    this.#generation += 1;
    this.#abort = new AbortController();
  }
}
