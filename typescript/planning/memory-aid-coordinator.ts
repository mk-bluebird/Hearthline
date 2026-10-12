// SPDX-License-Identifier: MIT OR Apache-2.0

export type ResourceTopic =
  | "housing"
  | "employment"
  | "healthcare"
  | "community";

export type ReminderView = Readonly<{
  id: string;
  dueAt: number;
  message: "You have an optional personal reminder.";
}>;

type Reminder = {
  id: string;
  dueAt: number;
};

const TOPICS = new Set<string>([
  "housing",
  "employment",
  "healthcare",
  "community",
]);

export function resourceEntry(topic: ResourceTopic): Readonly<{
  topic: ResourceTopic;
  title: string;
  url: string;
}> {
  if (!TOPICS.has(topic)) {
    throw new TypeError("Unsupported resource topic");
  }

  return Object.freeze({
    topic,
    title: "Browse Arizona community resources",
    url: "https://211arizona.org/",
  });
}

export class MemoryAidCoordinator {
  #permissionExpiresAt: number | null = null;
  #reminders = new Map<string, Reminder>();
  #sequence = 0;

  constructor(
    private readonly now: () => number = Date.now,
    private readonly maximumReminders: number = 20,
  ) {
    if (
      !Number.isSafeInteger(maximumReminders) ||
      maximumReminders <= 0
    ) {
      throw new RangeError("maximumReminders must be positive");
    }
  }

  #time(): number {
    const value = this.now();
    if (!Number.isSafeInteger(value) || value < 0) {
      this.revoke();
      throw new Error("Invalid clock value");
    }
    return value;
  }

  #checkPermission(time: number): void {
    if (
      this.#permissionExpiresAt === null ||
      time >= this.#permissionExpiresAt
    ) {
      this.revoke();
      throw new Error("Reminder permission is absent or expired");
    }
  }

  grant(expiresAt: number): void {
    const time = this.#time();
    if (!Number.isSafeInteger(expiresAt) || expiresAt <= time) {
      throw new RangeError("Permission expiry must be in the future");
    }

    // A new grant starts a new reminder scope.
    this.revoke();
    this.#permissionExpiresAt = expiresAt;
  }

  create(dueAt: number): ReminderView {
    const time = this.#time();
    this.#checkPermission(time);

    if (
      !Number.isSafeInteger(dueAt) ||
      dueAt <= time ||
      dueAt >= this.#permissionExpiresAt!
    ) {
      throw new RangeError(
        "Reminder must fall within the current permission period",
      );
    }

    if (this.#reminders.size >= this.maximumReminders) {
      throw new Error("Session reminder capacity reached");
    }

    this.#sequence += 1;
    const id = `local-reminder-${this.#sequence}`;
    const reminder = { id, dueAt };
    this.#reminders.set(id, reminder);

    return this.#view(reminder);
  }

  cancel(id: string): boolean {
    return this.#reminders.delete(id);
  }

  takeDue(): readonly ReminderView[] {
    const time = this.#time();

    if (
      this.#permissionExpiresAt === null ||
      time >= this.#permissionExpiresAt
    ) {
      this.revoke();
      return Object.freeze([]);
    }

    const due = [...this.#reminders.values()]
      .filter((reminder) => reminder.dueAt <= time)
      .sort((a, b) => a.dueAt - b.dueAt);

    for (const reminder of due) {
      this.#reminders.delete(reminder.id);
    }

    return Object.freeze(due.map((reminder) => this.#view(reminder)));
  }

  revoke(): void {
    this.#permissionExpiresAt = null;
    this.#reminders.clear();
  }

  #view(reminder: Reminder): ReminderView {
    return Object.freeze({
      id: reminder.id,
      dueAt: reminder.dueAt,
      message: "You have an optional personal reminder.",
    });
  }
}
