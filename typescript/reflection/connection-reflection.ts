// SPDX-License-Identifier: MIT OR Apache-2.0

export const PROMPTS = [
  {
    key: "choice_clarity",
    text: "Were your choices clear?",
  },
  {
    key: "pace_control",
    text: "Could you use a pace that worked for you?",
  },
  {
    key: "exit_control",
    text: "Could you stop or leave when you wanted?",
  },
] as const;

export type PromptKey = (typeof PROMPTS)[number]["key"];
export type ReflectionAnswer =
  | "worked_for_me"
  | "would_like_a_change"
  | "not_sure"
  | "skip";

export type ReflectionState =
  | { readonly status: "closed" }
  | {
      readonly status: "open";
      readonly answers: Readonly<
        Partial<Record<PromptKey, ReflectionAnswer>>
      >;
    };

const KEYS = new Set<string>(PROMPTS.map((prompt) => prompt.key));
const ANSWERS = new Set<string>([
  "worked_for_me",
  "would_like_a_change",
  "not_sure",
  "skip",
]);

export class ConnectionReflection {
  #openedAt: number | null = null;
  #answers: Partial<Record<PromptKey, ReflectionAnswer>> = {};
  #lastTime = -Infinity;

  constructor(
    private readonly ttlMs: number,
    private readonly monotonicNow: () => number,
  ) {
    if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0) {
      throw new RangeError("ttlMs must be a positive safe integer");
    }
  }

  #time(): number {
    const now = this.monotonicNow();
    if (!Number.isFinite(now) || now < this.#lastTime) {
      this.close();
      throw new Error("Clock must be finite and monotonic");
    }
    this.#lastTime = now;
    return now;
  }

  #expire(now: number): void {
    if (
      this.#openedAt !== null &&
      now - this.#openedAt >= this.ttlMs
    ) {
      this.close();
    }
  }

  open(): ReflectionState {
    const now = this.#time();
    this.#answers = {};
    this.#openedAt = now;
    return this.state();
  }

  answer(key: PromptKey, answer: ReflectionAnswer): void {
    const now = this.#time();
    this.#expire(now);

    if (this.#openedAt === null) {
      throw new Error("Reflection is closed or expired");
    }
    if (!KEYS.has(key) || !ANSWERS.has(answer)) {
      throw new TypeError("Unsupported prompt or answer");
    }

    // Skipping does not create a stored response.
    if (answer === "skip") {
      delete this.#answers[key];
    } else {
      this.#answers[key] = answer;
    }
  }

  state(): ReflectionState {
    this.#expire(this.#time());

    if (this.#openedAt === null) {
      return Object.freeze({ status: "closed" });
    }

    return Object.freeze({
      status: "open",
      answers: Object.freeze({ ...this.#answers }),
    });
  }

  close(): void {
    this.#answers = {};
    this.#openedAt = null;
  }
}
