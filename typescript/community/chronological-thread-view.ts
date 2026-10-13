// SPDX-License-Identifier: MIT OR Apache-2.0

export type VisibleThread = Readonly<{
  threadRef: string;
  title: string;
  createdAt: number;
  state: "open" | "closed";
}>;

export type AudienceSnapshot = Readonly<{
  contextRef: string;
  revision: number;
  validUntil: number;
  threads: readonly VisibleThread[];
}>;

export function chronologicalThreadPage(
  snapshot: AudienceSnapshot,
  currentContextRef: string,
  currentRevision: number,
  now: number,
  offset: number,
  pageSize: number,
): readonly VisibleThread[] {
  if (
    !currentContextRef.trim() ||
    !Number.isSafeInteger(currentRevision) ||
    currentRevision < 0 ||
    !Number.isSafeInteger(now) ||
    now < 0 ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 50
  ) {
    throw new TypeError("Invalid discussion view request");
  }

  if (
    snapshot.contextRef !== currentContextRef ||
    snapshot.revision !== currentRevision ||
    !Number.isSafeInteger(snapshot.validUntil) ||
    now >= snapshot.validUntil
  ) {
    return Object.freeze([]);
  }

  const seen = new Set<string>();

  const ordered = snapshot.threads.map((thread) => {
    if (
      !thread.threadRef.trim() ||
      seen.has(thread.threadRef) ||
      !thread.title.trim() ||
      !Number.isSafeInteger(thread.createdAt) ||
      thread.createdAt < 0 ||
      thread.createdAt > now ||
      (thread.state !== "open" && thread.state !== "closed")
    ) {
      throw new TypeError("Invalid thread projection");
    }
    seen.add(thread.threadRef);
    return Object.freeze({ ...thread });
  }).sort((first, second) => {
    if (first.createdAt !== second.createdAt) {
      return first.createdAt - second.createdAt;
    }
    return first.threadRef < second.threadRef ? -1 :
      first.threadRef > second.threadRef ? 1 : 0;
  });

  return Object.freeze(ordered.slice(offset, offset + pageSize));
}
