// SPDX-License-Identifier: MIT OR Apache-2.0

export type PublicEvent = Readonly<{
  eventRef: string;
  sourceUrl: string;
  broadAreaRef: string | null;
  categoryRef: string;
  mode: "remote" | "in_person";
  audience: "adults" | "mixed_age" | "minors_only" | "unknown";
  startsAt: number;
  endsAt: number;
  reviewAfter: number;
  status: "scheduled" | "cancelled" | "unknown";
}>;

export type EventChoices = Readonly<{
  broadAreaRef: string | null;
  includeRemote: boolean;
  categoryRefs: readonly string[];
  from: number;
  until: number;
}>;

export function selectPublicEvents(
  events: readonly PublicEvent[],
  choices: EventChoices,
  now: number,
): readonly PublicEvent[] {
  if (
    !Number.isSafeInteger(now) ||
    now < 0 ||
    !Number.isSafeInteger(choices.from) ||
    !Number.isSafeInteger(choices.until) ||
    choices.from < now ||
    choices.until <= choices.from ||
    typeof choices.includeRemote !== "boolean" ||
    choices.categoryRefs.some(
      (ref) => typeof ref !== "string" || !ref.trim(),
    ) ||
    new Set(choices.categoryRefs).size !== choices.categoryRefs.length ||
    (
      choices.broadAreaRef !== null &&
      !choices.broadAreaRef.trim()
    )
  ) {
    throw new TypeError("Invalid event choices");
  }

  const categories = new Set(choices.categoryRefs);
  const seen = new Set<string>();
  const selected: PublicEvent[] = [];

  for (const event of events) {
    const source = new URL(event.sourceUrl);
    if (
      source.protocol !== "https:" ||
      source.username !== "" ||
      source.password !== "" ||
      !event.eventRef.trim() ||
      seen.has(event.eventRef) ||
      !event.categoryRef.trim() ||
      !Number.isSafeInteger(event.startsAt) ||
      !Number.isSafeInteger(event.endsAt) ||
      event.startsAt < 0 ||
      event.endsAt <= event.startsAt ||
      !Number.isSafeInteger(event.reviewAfter) ||
      event.reviewAfter < 0 ||
      !["remote", "in_person"].includes(event.mode) ||
      !["adults", "mixed_age", "minors_only", "unknown"]
        .includes(event.audience) ||
      !["scheduled", "cancelled", "unknown"].includes(event.status)
    ) {
      throw new TypeError("Invalid event record");
    }
    seen.add(event.eventRef);

    const selectedContext =
      event.mode === "remote"
        ? choices.includeRemote
        : choices.broadAreaRef !== null &&
          event.broadAreaRef === choices.broadAreaRef;

    if (
      selectedContext &&
      event.status === "scheduled" &&
      event.audience !== "minors_only" &&
      now < event.reviewAfter &&
      event.startsAt >= choices.from &&
      event.startsAt < choices.until &&
      (categories.size === 0 || categories.has(event.categoryRef))
    ) {
      selected.push(Object.freeze({ ...event }));
    }
  }

  selected.sort((a, b) => {
    if (a.startsAt !== b.startsAt) return a.startsAt - b.startsAt;
    return a.eventRef < b.eventRef ? -1 :
      a.eventRef > b.eventRef ? 1 : 0;
  });

  return Object.freeze(selected);
}
