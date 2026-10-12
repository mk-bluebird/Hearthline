// age/zkAgeAssertion.ts
interface AgeProofRequest {
  policy: 'age >= 18';
  nonce: string; // server-issued, single-use
}

interface AgeProofResponse {
  proof: string;   // ZKP proof blob
  cohort: string;  // "18+" — the only revealed attribute
}

async function verifyZKAgeProof(
  response: AgeProofResponse,
  expectedNonce: string
): Promise<boolean> {
  // Verify proof against issuer's public key
  // Confirm proof binds to expectedNonce (prevents replay)
  // Confirm cohort satisfies policy
  // Return boolean — never log the proof, never store it
}
