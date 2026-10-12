// SPDX-License-Identifier: MIT OR Apache-2.0

export const CHECKLIST_ITEMS = [
  {
    key: "meeting_context",
    text: "Would a public, populated place suit your preferences?",
  },
  {
    key: "arrival_and_exit",
    text: "Would you like to plan a way to arrive and leave?",
  },
  {
    key: "information_sharing",
    text: "Would you like to review what information you are sharing?",
  },
  {
    key: "trusted_person",
    text: "Would you like to tell someone you trust yourself?",
  },
  {
    key: "boundaries",
    text: "Would you like to revisit boundaries or cancel the plan?",
  },
  {
    key: "resources",
    text: "Would you like to view support resources?",
  },
] as const;

export type ChecklistKey =
  (typeof CHECKLIST_ITEMS)[number]["key"];

export type ChecklistChoice = "considered" | "skip";

export const RESOURCE_LINKS = Object.freeze([
  Object.freeze({
    title: "RAINN: tips for safer dating",
    url:
      "https://rainn.org/strategies-to-reduce-risk-increase-safety/" +
      "tips-for-safer-dating-online-and-in-person/",
  }),
  Object.freeze({
    title: "Arizona community resources",
    url: "https://211arizona.org/",
  }),
]);

export type ChecklistView = Readonly<{
  status: "open" | "closed";
  considered: readonly ChecklistKey[];
}>;

const VALID_KEYS = new Set<string>(
  CHECKLIST_ITEMS.map((item) => item.key),
);

export class OfflinePlanningChecklist {
  #open = false;
  #considered = new Set<ChecklistKey>();

  open(): ChecklistView {
    this.#considered.clear();
    this.#open = true;
    return this.view();
  }

  choose(key: ChecklistKey, choice: ChecklistChoice): void {
    if (!this.#open) {
      throw new Error("Checklist is closed");
    }
    if (!VALID_KEYS.has(key)) {
      throw new TypeError("Unknown checklist item");
    }
    if (choice !== "considered" && choice !== "skip") {
      throw new TypeError("Unknown checklist choice");
    }

    if (choice === "considered") {
      this.#considered.add(key);
    } else {
      this.#considered.delete(key);
    }
  }

  view(): ChecklistView {
    return Object.freeze({
      status: this.#open ? "open" : "closed",
      considered: Object.freeze(
        this.#open ? [...this.#considered] : [],
      ),
    });
  }

  close(): void {
    this.#considered.clear();
    this.#open = false;
  }
}
