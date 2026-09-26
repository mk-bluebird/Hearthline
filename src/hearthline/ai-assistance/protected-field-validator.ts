const PROTECTED_FIELD_PATTERNS: readonly RegExp[] = Object.freeze([
  /\b(?:home address|street address|apartment number|work address|employer name|workplace)\b/i,
  /\b(?:social security|ssn|passport number|driver'?s license number)\b/i,
  /\b(?:credit card|bank account|routing number|cvv|iban|swift)\b/i,
  /\b(?:diagnosis|prescription|medical record|treatment plan|dosage)\b/i,
  /\b(?:password|passphrase|api key|secret key|private key|recovery code)\b/i,
  /\b(?:\+1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/
]);

export interface ProtectedFieldFinding {
  readonly patternIndex: number;
  readonly matchOffset: number;
  readonly matchLength: number;
}

export function scanForProtectedFields(text: string): readonly ProtectedFieldFinding[] {
  const findings: ProtectedFieldFinding[] = [];

  PROTECTED_FIELD_PATTERNS.forEach((pattern, patternIndex) => {
    const match = pattern.exec(text);
    if (match && match.index >= 0) {
      findings.push({
        patternIndex,
        matchOffset: match.index,
        matchLength: match[0].length
      });
    }
  });

  return Object.freeze(findings);
}

export function assertNoProtectedFields(text: string): void {
  const findings = scanForProtectedFields(text);
  if (findings.length > 0) {
    throw new Error(
      "Participant text contains fields that must not be sent to AI assistance. Remove or redact them before requesting assistance."
    );
  }
}
