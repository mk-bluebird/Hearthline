// SPDX-License-Identifier: MIT OR Apache-2.0

export type ParticipationOptions = Readonly<{
  revision: number;
  presentation: "one_at_a_time" | "list";
  stimulation: "reduced" | "standard";
  reminders: "off" | "member_selected_digest";
  privacyReviewBeforePublication: boolean;
}>;

export type ParticipationPatch = Readonly<{
  presentation?: ParticipationOptions["presentation"];
  stimulation?: ParticipationOptions["stimulation"];
  reminders?: ParticipationOptions["reminders"];
  privacyReviewBeforePublication?: boolean;
}>;

const PATCH_FIELDS = new Set([
  "presentation",
  "stimulation",
  "reminders",
  "privacyReviewBeforePublication",
]);

export class ParticipationOptionsController {
  #options: ParticipationOptions = Object.freeze({
    revision: 0,
    presentation: "one_at_a_time",
    stimulation: "reduced",
    reminders: "off",
    privacyReviewBeforePublication: true,
  });

  view(): ParticipationOptions {
    return this.#options;
  }

  update(patch: ParticipationPatch): ParticipationOptions {
    if (
      patch === null ||
      typeof patch !== "object" ||
      Array.isArray(patch)
    ) {
      throw new TypeError("Expected a settings patch");
    }

    const prototype = Object.getPrototypeOf(patch);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError("Expected a plain data object");
    }

    const keys = Reflect.ownKeys(patch);
    for (const key of keys) {
      if (typeof key !== "string" || !PATCH_FIELDS.has(key)) {
        throw new TypeError("Undeclared participation setting");
      }
      const descriptor = Object.getOwnPropertyDescriptor(patch, key);
      if (!descriptor || !("value" in descriptor)) {
        throw new TypeError("Accessors are not accepted");
      }
    }

    if (
      patch.presentation !== undefined &&
      patch.presentation !== "one_at_a_time" &&
      patch.presentation !== "list"
    ) {
      throw new TypeError("Invalid presentation");
    }
    if (
      patch.stimulation !== undefined &&
      patch.stimulation !== "reduced" &&
      patch.stimulation !== "standard"
    ) {
      throw new TypeError("Invalid stimulation preference");
    }
    if (
      patch.reminders !== undefined &&
      patch.reminders !== "off" &&
      patch.reminders !== "member_selected_digest"
    ) {
      throw new TypeError("Invalid reminder preference");
    }
    if (
      patch.privacyReviewBeforePublication !== undefined &&
      typeof patch.privacyReviewBeforePublication !== "boolean"
    ) {
      throw new TypeError("Invalid privacy-review preference");
    }

    const next = {
      presentation:
        patch.presentation ?? this.#options.presentation,
      stimulation:
        patch.stimulation ?? this.#options.stimulation,
      reminders:
        patch.reminders ?? this.#options.reminders,
      privacyReviewBeforePublication:
        patch.privacyReviewBeforePublication ??
        this.#options.privacyReviewBeforePublication,
    };

    const changed =
      next.presentation !== this.#options.presentation ||
      next.stimulation !== this.#options.stimulation ||
      next.reminders !== this.#options.reminders ||
      next.privacyReviewBeforePublication !==
        this.#options.privacyReviewBeforePublication;

    if (!changed) return this.#options;

    if (this.#options.revision >= Number.MAX_SAFE_INTEGER) {
      throw new Error("Settings revision capacity exhausted");
    }

    this.#options = Object.freeze({
      revision: this.#options.revision + 1,
      ...next,
    });

    return this.#options;
  }
}
