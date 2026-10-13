// SPDX-License-Identifier: MIT OR Apache-2.0

export type AreaContextWindow = Readonly<{
  areaRef: string;
  revision: number;
  startsAt: number;
  expiresAt: number;
  state: "GRANTED" | "REVOKED";
}>;

export function areaContextPermitted(
  window: AreaContextWindow,
  requestedAreaRef: string,
  currentRevision: number,
  now: number,
  approvedAreaRefs: ReadonlySet<string>,
): boolean {
  if (
    !window.areaRef.trim() ||
    !requestedAreaRef.trim() ||
    !Number.isSafeInteger(window.revision) ||
    window.revision < 0 ||
    !Number.isSafeInteger(currentRevision) ||
    currentRevision < 0 ||
    !Number.isSafeInteger(window.startsAt) ||
    window.startsAt < 0 ||
    !Number.isSafeInteger(window.expiresAt) ||
    window.expiresAt <= window.startsAt ||
    !Number.isSafeInteger(now) ||
    now < 0 ||
    (window.state !== "GRANTED" && window.state !== "REVOKED")
  ) {
    throw new TypeError("Invalid area-context permission");
  }

  return window.state === "GRANTED" &&
    approvedAreaRefs.has(window.areaRef) &&
    requestedAreaRef === window.areaRef &&
    currentRevision === window.revision &&
    now >= window.startsAt &&
    now < window.expiresAt;
}
