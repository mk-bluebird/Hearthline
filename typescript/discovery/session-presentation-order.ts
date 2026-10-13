// SPDX-License-Identifier: MIT OR Apache-2.0

export type PresentationMode =
  | "preserve_approved_order"
  | "session_shuffle";

export type Uint32Source = () => number;

export function secureUint32(): number {
  const buffer = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buffer);
  return buffer[0];
}

function uniformBelow(
  upperExclusive: number,
  randomUint32: Uint32Source,
): number {
  if (
    !Number.isSafeInteger(upperExclusive) ||
    upperExclusive < 1 ||
    upperExclusive > 0x1_0000_0000
  ) {
    throw new RangeError("Invalid random bound");
  }

  const range = 0x1_0000_0000;
  const limit = range - (range % upperExclusive);

  // Bounded attempts prevent a broken source from hanging the interface.
  for (let attempt = 0; attempt < 128; attempt += 1) {
    const value = randomUint32();
    if (
      !Number.isInteger(value) ||
      value < 0 ||
      value > 0xffff_ffff
    ) {
      throw new TypeError("Random source must produce uint32 values");
    }
    if (value < limit) return value % upperExclusive;
  }

  throw new Error("Random source failed to produce an accepted value");
}

export function presentationOrder(
  authorizedCandidateRefs: readonly string[],
  mode: PresentationMode,
  randomUint32: Uint32Source = secureUint32,
): readonly string[] {
  if (
    mode !== "preserve_approved_order" &&
    mode !== "session_shuffle"
  ) {
    throw new TypeError("Unsupported presentation mode");
  }

  if (
    !Array.isArray(authorizedCandidateRefs) ||
    authorizedCandidateRefs.some(
      (ref) => typeof ref !== "string" || !ref.trim(),
    ) ||
    new Set(authorizedCandidateRefs).size !==
      authorizedCandidateRefs.length
  ) {
    throw new TypeError("Invalid authorized candidate sequence");
  }

  const ordered = [...authorizedCandidateRefs];

  if (mode === "session_shuffle") {
    for (let index = ordered.length - 1; index > 0; index -= 1) {
      const selected = uniformBelow(index + 1, randomUint32);
      [ordered[index], ordered[selected]] =
        [ordered[selected], ordered[index]];
    }
  }

  return Object.freeze(ordered);
}
