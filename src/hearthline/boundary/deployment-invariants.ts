export interface DeploymentInvariant {
  readonly invariantId: string;
  readonly description: string;
  readonly enforced: boolean;
  readonly testRef: string | null;
}

export const DEFAULT_INVARIANTS: readonly DeploymentInvariant[] = Object.freeze([
  { invariantId: "INV-SHELL-001", description: "No third-party telemetry scripts are loaded.", enforced: true, testRef: "shell-telemetry.test.ts" },
  { invariantId: "INV-SHELL-002", description: "Drafts are stored locally only and never transmitted without explicit action.", enforced: true, testRef: "shell-local-draft.test.ts" },
  { invariantId: "INV-SHELL-003", description: "No person-level inference is performed on any input.", enforced: true, testRef: "shell-inference.test.ts" },
  { invariantId: "INV-SHELL-004", description: "Every consent prompt is revocable as easily as it was granted.", enforced: true, testRef: "shell-consent.test.ts" },
  { invariantId: "INV-SHELL-005", description: "All AI assistance actions require participant review before use.", enforced: true, testRef: "shell-ai-review.test.ts" },
  { invariantId: "INV-SHELL-006", description: "Every outbound field crosses the narrow relay contract's allow-list.", enforced: true, testRef: "shell-relay-boundary.test.ts" },
  { invariantId: "INV-SHELL-007", description: "No ranking surface exists in any view of the shell.", enforced: true, testRef: "shell-ranking.test.ts" },
  { invariantId: "INV-SHELL-008", description: "No password, key, or recovery material is stored by the shell.", enforced: true, testRef: "shell-secret.test.ts" },
  { invariantId: "INV-SHELL-009", description: "Accessibility posture is tested against declared workflows, not asserted.", enforced: true, testRef: "shell-a11y.test.ts" },
  { invariantId: "INV-SHELL-010", description: "Fork provenance is disclosed to the user.", enforced: true, testRef: "shell-provenance.test.ts" }
]);

export function createInvariantSet(extra: readonly DeploymentInvariant[] = []) {
  const all = [...DEFAULT_INVARIANTS, ...extra];
  const ids = new Set<string>();
  for (const inv of all) {
    if (ids.has(inv.invariantId)) {
      throw new Error(`Duplicate invariant id: ${inv.invariantId}`);
    }
    ids.add(inv.invariantId);
  }
  return Object.freeze({
    list(): readonly DeploymentInvariant[] { return Object.freeze([...all]); },
    unenforced(): readonly DeploymentInvariant[] {
      return Object.freeze(all.filter((inv) => !inv.enforced));
    },
    hasTest(invariantId: string): boolean {
      const found = all.find((inv) => inv.invariantId === invariantId);
      return found !== undefined && found.testRef !== null;
    }
  });
}
