// SPDX-License-Identifier: MIT OR Apache-2.0

export type DeliveryPreference = Readonly<{
  revision: number;
  enabled: boolean;
  paused: boolean;
}>;

export type ReminderTicket = Readonly<{
  preferenceRevision: number;
  dueAt: number;
  expiresAt: number;
}>;

export type DeliveryOutcome =
  | "displayed"
  | "not_due"
  | "suppressed"
  | "unavailable";

export function createReminderTicket(
  preference: DeliveryPreference,
  dueAt: number,
  expiresAt: number,
): ReminderTicket {
  validatePreference(preference);
  if (
    !Number.isSafeInteger(dueAt) ||
    !Number.isSafeInteger(expiresAt) ||
    dueAt < 0 ||
    expiresAt <= dueAt
  ) {
    throw new RangeError("Invalid reminder period");
  }
  if (!preference.enabled || preference.paused) {
    throw new Error("Device reminders are not currently enabled");
  }

  return Object.freeze({
    preferenceRevision: preference.revision,
    dueAt,
    expiresAt,
  });
}

function validatePreference(value: DeliveryPreference): void {
  if (
    !Number.isSafeInteger(value.revision) ||
    value.revision < 0 ||
    typeof value.enabled !== "boolean" ||
    typeof value.paused !== "boolean"
  ) {
    throw new TypeError("Invalid delivery preference");
  }
}

export class NeutralReminder {
  #consumed = false;
  #notification: Notification | null = null;

  constructor(private readonly ticket: ReminderTicket) {
    if (
      !Number.isSafeInteger(ticket.preferenceRevision) ||
      ticket.preferenceRevision < 0 ||
      !Number.isSafeInteger(ticket.dueAt) ||
      ticket.dueAt < 0 ||
      !Number.isSafeInteger(ticket.expiresAt) ||
      ticket.expiresAt <= ticket.dueAt
    ) {
      throw new TypeError("Invalid reminder ticket");
    }
  }

  deliver(
    current: DeliveryPreference,
    now: number,
  ): DeliveryOutcome {
    validatePreference(current);
    if (!Number.isSafeInteger(now) || now < 0) {
      throw new RangeError("Invalid delivery time");
    }
    if (this.#consumed) return "suppressed";

    if (
      !current.enabled ||
      current.paused ||
      current.revision !== this.ticket.preferenceRevision ||
      now >= this.ticket.expiresAt
    ) {
      this.cancel();
      return "suppressed";
    }
    if (now < this.ticket.dueAt) return "not_due";

    // Prevent retries from producing repeated notifications.
    this.#consumed = true;

    if (
      typeof Notification === "undefined" ||
      Notification.permission !== "granted"
    ) {
      return "unavailable";
    }

    try {
      this.#notification = new Notification("Hearthline", {
        body: "Hearthline is ready when you are.",
        tag: "hearthline-neutral-reminder",
        silent: true,
        requireInteraction: false,
      });
      return "displayed";
    } catch {
      return "unavailable";
    }
  }

  cancel(): void {
    this.#consumed = true;
    this.#notification?.close();
    this.#notification = null;
  }
}

export async function requestDeviceNotificationPermission():
  Promise<NotificationPermission | "unsupported"> {
  if (typeof Notification === "undefined") {
    return "unsupported";
  }
  return Notification.requestPermission();
}
