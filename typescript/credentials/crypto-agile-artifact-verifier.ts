// SPDX-License-Identifier: MIT OR Apache-2.0

export type SignaturePart = Readonly<{
  suiteRef: string;
  keyRef: string;
  signature: Uint8Array;
}>;

export type SignedArtifact = Readonly<{
  profileRef: string;
  configurationRef: string;
  payload: Uint8Array;
  signatures: readonly SignaturePart[];
}>;

export type ReviewedCryptoProfile = Readonly<{
  profileRef: string;
  configurationRef: string;
  reviewExpiresAt: number;
  maximumPayloadBytes: number;
  maximumSignatureBytes: number;
  requiredSuiteRefs: readonly string[];
  acceptedKeyRefsBySuite: ReadonlyMap<string, ReadonlySet<string>>;
}>;

export type SignatureVerifier = (
  payload: Uint8Array,
  signature: Uint8Array,
  keyRef: string,
) => Promise<boolean>;

export type ArtifactVerification = Readonly<{
  authenticated: boolean;
  profileRef: string;
}>;

function reference(value: string): void {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("Nonempty cryptographic reference required");
  }
}

function positive(value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError("Positive safe integer required");
  }
}

export async function verifyReviewedArtifact(
  artifact: SignedArtifact,
  profile: ReviewedCryptoProfile,
  verifiers: ReadonlyMap<string, SignatureVerifier>,
  now: number,
): Promise<ArtifactVerification> {
  reference(artifact.profileRef);
  reference(artifact.configurationRef);
  reference(profile.profileRef);
  reference(profile.configurationRef);

  if (
    !Number.isSafeInteger(now) ||
    now < 0 ||
    !Number.isSafeInteger(profile.reviewExpiresAt) ||
    profile.reviewExpiresAt < 0
  ) {
    throw new TypeError("Invalid review time");
  }

  positive(profile.maximumPayloadBytes);
  positive(profile.maximumSignatureBytes);

  const requiredSuites = [...profile.requiredSuiteRefs];
  requiredSuites.forEach(reference);

  if (
    requiredSuites.length === 0 ||
    new Set(requiredSuites).size !== requiredSuites.length
  ) {
    throw new TypeError("Invalid required cryptosuite set");
  }

  const denied = (): ArtifactVerification => Object.freeze({
    authenticated: false,
    profileRef: profile.profileRef,
  });

  if (
    artifact.profileRef !== profile.profileRef ||
    artifact.configurationRef !== profile.configurationRef ||
    now >= profile.reviewExpiresAt ||
    !(artifact.payload instanceof Uint8Array) ||
    artifact.payload.byteLength === 0 ||
    artifact.payload.byteLength > profile.maximumPayloadBytes
  ) {
    return denied();
  }

  // Snapshot bytes and registry decisions before asynchronous verification.
  const payload = artifact.payload.slice();
  const signatures = new Map<string, {
    keyRef: string;
    signature: Uint8Array;
  }>();

  for (const part of artifact.signatures) {
    reference(part.suiteRef);
    reference(part.keyRef);

    if (
      !requiredSuites.includes(part.suiteRef) ||
      signatures.has(part.suiteRef) ||
      !(part.signature instanceof Uint8Array) ||
      part.signature.byteLength === 0 ||
      part.signature.byteLength > profile.maximumSignatureBytes
    ) {
      return denied();
    }

    signatures.set(part.suiteRef, {
      keyRef: part.keyRef,
      signature: part.signature.slice(),
    });
  }

  const work: {
    verifier: SignatureVerifier;
    keyRef: string;
    signature: Uint8Array;
  }[] = [];

  for (const suiteRef of requiredSuites) {
    const part = signatures.get(suiteRef);
    const verifier = verifiers.get(suiteRef);
    const acceptedKeys = profile.acceptedKeyRefsBySuite.get(suiteRef);

    if (
      !part ||
      !verifier ||
      !acceptedKeys?.has(part.keyRef)
    ) {
      return denied();
    }

    work.push({
      verifier,
      keyRef: part.keyRef,
      signature: part.signature,
    });
  }

  for (const item of work) {
    try {
      const valid = await item.verifier(
        payload.slice(),
        item.signature.slice(),
        item.keyRef,
      );
      if (valid !== true) return denied();
    } catch {
      return denied();
    }
  }

  return Object.freeze({
    authenticated: true,
    profileRef: profile.profileRef,
  });
}
