// SPDX-License-Identifier: MIT OR Apache-2.0

export type Metaphor = "weather" | "space" | "artificial_object";
export type Amount = "sparse" | "moderate" | "dense";
export type ViewMode = "text" | "symbolic_2d";

const METAPHORS: readonly Metaphor[] = [
  "weather", "space", "artificial_object",
];
const AMOUNTS: readonly Amount[] = ["sparse", "moderate", "dense"];
const MODES: readonly ViewMode[] = ["text", "symbolic_2d"];

export class PrivateExpressionWorkspace {
  #active = false;
  #disposed = false;
  #expiresAt = 0;
  #timer: ReturnType<typeof setTimeout> | null = null;

  #caption = "";
  #metaphor: Metaphor = "weather";
  #amount: Amount = "sparse";
  #mode: ViewMode = "text";

  #sessionListeners = new AbortController();
  #lifecycleListeners = new AbortController();
  #captionInput: HTMLTextAreaElement | null = null;
  #output: HTMLElement | null = null;
  #status: HTMLElement | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly sessionLifetimeMs = 15 * 60 * 1000,
  ) {
    if (
      !Number.isSafeInteger(sessionLifetimeMs) ||
      sessionLifetimeMs <= 0 ||
      sessionLifetimeMs > 2_147_483_647
    ) {
      throw new RangeError("Invalid session lifetime");
    }

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") this.stop();
    }, { signal: this.#lifecycleListeners.signal });

    window.addEventListener("pagehide", () => {
      this.stop();
    }, { signal: this.#lifecycleListeners.signal });

    this.#showClosed();
  }

  open(): void {
    if (this.#disposed) throw new Error("Workspace disposed");
    if (document.visibilityState !== "visible") {
      throw new Error("A visible document is required");
    }

    this.#erase();
    this.#sessionListeners = new AbortController();
    this.#active = true;
    this.#expiresAt = performance.now() + this.sessionLifetimeMs;
    this.#mount();

    this.#timer = setTimeout(() => this.stop(), this.sessionLifetimeMs);
  }

  #current(): boolean {
    if (
      this.#active &&
      (
        performance.now() >= this.#expiresAt ||
        document.visibilityState !== "visible"
      )
    ) {
      this.stop();
    }
    return this.#active && !this.#disposed;
  }

  #button(label: string, action: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", action, {
      signal: this.#sessionListeners.signal,
    });
    return button;
  }

  #select<T extends string>(
    labelText: string,
    choices: readonly T[],
    current: T,
    change: (value: T) => void,
  ): HTMLLabelElement {
    const label = document.createElement("label");
    const text = document.createElement("span");
    text.textContent = labelText;

    const select = document.createElement("select");
    for (const value of choices) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value.replaceAll("_", " ");
      select.append(option);
    }
    select.value = current;

    select.addEventListener("change", () => {
      if (!this.#current()) return;
      const value = select.value as T;
      if (!choices.includes(value)) {
        this.stop();
        return;
      }
      change(value);
      this.#render();
    }, { signal: this.#sessionListeners.signal });

    label.append(text, select);
    return label;
  }

  #mount(): void {
    const heading = document.createElement("h2");
    heading.textContent = "Private expression";
    heading.tabIndex = -1;

    const notice = document.createElement("p");
    notice.textContent =
      "You choose the representation. Nothing is inferred, sent, or saved " +
      "by this module. Switching away or reaching session expiry clears it. " +
      "This is not an assessment or treatment.";

    const limits = document.createElement("p");
    limits.textContent =
      "Text and static 2D only—not AR. Other software or people with device " +
      "access may see the content. Do not include another person's private " +
      "messages, images, address, or identifying details.";

    const captionLabel = document.createElement("label");
    captionLabel.textContent = "Optional words in your own voice";

    const input = document.createElement("textarea");
    input.maxLength = 1200;
    input.rows = 5;
    input.autocomplete = "off";
    input.spellcheck = false;
    input.dir = "auto";

    input.addEventListener("input", () => {
      if (!this.#current()) return;
      if (input.value.length > 1200) {
        input.value = input.value.slice(0, 1200);
      }
      this.#caption = input.value;
      this.#render();
    }, { signal: this.#sessionListeners.signal });

    captionLabel.append(input);

    const metaphor = this.#select(
      "Selected metaphor",
      METAPHORS,
      this.#metaphor,
      (value) => { this.#metaphor = value; },
    );

    const amount = this.#select(
      "Visual amount—not an emotion measurement",
      AMOUNTS,
      this.#amount,
      (value) => { this.#amount = value; },
    );

    const mode = this.#select(
      "Presentation",
      MODES,
      this.#mode,
      (value) => { this.#mode = value; },
    );

    const output = document.createElement("section");
    output.setAttribute("aria-label", "Your selected representation");

    const status = document.createElement("p");
    status.setAttribute("role", "status");
    status.setAttribute("aria-atomic", "true");

    const clear = this.#button("Clear the whole expression", () => {
      if (!this.#current()) return;
      this.#caption = "";
      this.#metaphor = "weather";
      this.#amount = "sparse";
      this.#mode = "text";
      this.#mount();
      if (this.#status) {
        this.#status.textContent = "The expression was cleared.";
      }
    });

    const stop = this.#button("Stop and clear workspace", () => {
      this.stop();
    });

    // Abort listeners from the preceding mounted controls.
    this.#sessionListeners.abort();
    this.#sessionListeners = new AbortController();

    // Rebuild controls under the new listener scope when remounting.
    // The initial controls above must use that same scope.
    // Mount through the helper below instead of retaining stale controls.
    this.#mountControls(
      heading, notice, limits, captionLabel, input,
      output, status,
    );

    // These variables are intentionally not appended; mountControls creates
    // the final controls under the active listener scope.
    void metaphor;
    void amount;
    void mode;
    void clear;
    void stop;
  }

  #mountControls(
    heading: HTMLElement,
    notice: HTMLElement,
    limits: HTMLElement,
    captionLabel: HTMLElement,
    input: HTMLTextAreaElement,
    output: HTMLElement,
    status: HTMLElement,
  ): void {
    input.addEventListener("input", () => {
      if (!this.#current()) return;
      if (input.value.length > 1200) {
        input.value = input.value.slice(0, 1200);
      }
      this.#caption = input.value;
      this.#render();
    }, { signal: this.#sessionListeners.signal });

    const metaphor = this.#select(
      "Selected metaphor", METAPHORS, this.#metaphor,
      (value) => { this.#metaphor = value; },
    );
    const amount = this.#select(
      "Visual amount—not an emotion measurement",
      AMOUNTS, this.#amount,
      (value) => { this.#amount = value; },
    );
    const mode = this.#select(
      "Presentation", MODES, this.#mode,
      (value) => { this.#mode = value; },
    );

    const clear = this.#button("Clear the whole expression", () => {
      if (!this.#current()) return;
      this.#caption = "";
      this.#metaphor = "weather";
      this.#amount = "sparse";
      this.#mode = "text";
      if (this.#captionInput) this.#captionInput.value = "";
      this.#mount();
      if (this.#status) {
        this.#status.textContent = "The expression was cleared.";
      }
    });

    const stop = this.#button(
      "Stop and clear workspace",
      () => this.stop(),
    );

    this.#captionInput = input;
    this.#output = output;
    this.#status = status;

    this.root.replaceChildren(
      heading, notice, limits, metaphor, amount, mode,
      captionLabel, clear, stop, status, output,
    );
    this.#render();
    heading.focus();
  }

  #render(): void {
    if (!this.#current() || !this.#output) return;

    const description = document.createElement("p");
    description.textContent =
      `Metaphor: ${this.#metaphor.replaceAll("_", " ")}. ` +
      `Visual amount: ${this.#amount}. These are choices, not measurements.`;

    const caption = document.createElement("p");
    caption.dir = "auto";
    caption.textContent = this.#caption || "No caption selected.";

    const children: Node[] = [description, caption];

    if (this.#mode === "symbolic_2d") {
      const ns = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(ns, "svg");
      svg.setAttribute("viewBox", "0 0 320 160");
      svg.setAttribute("width", "320");
      svg.setAttribute("height", "160");
      svg.setAttribute("aria-hidden", "true");
      svg.style.maxWidth = "100%";
      svg.style.height = "auto";

      const count = { sparse: 3, moderate: 7, dense: 12 }[this.#amount];

      for (let index = 0; index < count; index += 1) {
        const shape = document.createElementNS(
          ns,
          this.#metaphor === "artificial_object" ? "rect" : "circle",
        );

        const x = 20 + (index * 47) % 280;
        const y = 20 + (index * 31) % 120;

        if (this.#metaphor === "artificial_object") {
          shape.setAttribute("x", String(x));
          shape.setAttribute("y", String(y));
          shape.setAttribute("width", "12");
          shape.setAttribute("height", "12");
        } else {
          shape.setAttribute("cx", String(x));
          shape.setAttribute("cy", String(y));
          shape.setAttribute("r", this.#metaphor === "weather" ? "5" : "9");
        }

        shape.setAttribute("fill", "none");
        shape.setAttribute("stroke", "currentColor");
        shape.setAttribute("stroke-width", "2");
        svg.append(shape);
      }

      const artificial = document.createElement("p");
      artificial.textContent =
        "An artificial visual representation: no perception, memory, " +
        "emotional assessment, or reciprocity.";
      children.push(svg, artificial);
    }

    this.#output.replaceChildren(...children);
  }

  #erase(): void {
    this.#sessionListeners.abort();

    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }

    if (this.#captionInput) this.#captionInput.value = "";
    this.#output?.replaceChildren();

    this.#caption = "";
    this.#metaphor = "weather";
    this.#amount = "sparse";
    this.#mode = "text";
    this.#expiresAt = 0;
    this.#captionInput = null;
    this.#output = null;
    this.#status = null;
  }

  #showClosed(): void {
    this.#sessionListeners.abort();
    this.#sessionListeners = new AbortController();

    const message = document.createElement("p");
    message.textContent =
      "Workspace closed. Application-held expression content was cleared.";

    const open = this.#button(
      "Open private workspace",
      () => this.open(),
    );
    this.root.replaceChildren(message, open);
  }

  stop(): void {
    this.#active = false;
    this.#erase();
    if (!this.#disposed) this.#showClosed();
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#active = false;
    this.#disposed = true;
    this.#erase();
    this.#lifecycleListeners.abort();
    this.root.replaceChildren();
  }
}
