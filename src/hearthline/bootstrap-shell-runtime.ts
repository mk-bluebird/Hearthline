import { createActionRegistry } from "./ai-assistance/action-registry.js";
import { createConsentScopeRegistry } from "./ai-assistance/consent-scope-registry.js";
import { createRetentionRegistry } from "./ai-assistance/retention-registry.js";
import { assertNoProtectedFields } from "./ai-assistance/protected-field-validator.js";
import { createInvariantSet } from "./boundary/deployment-invariants.js";
import { createRelayBoundary } from "./boundary/narrow-relay-contract.js";

export function createBootstrapShellRuntime(input: {
  approverNamed?: boolean;
} = {}) {
  const actions = createActionRegistry();
  const scopes = createConsentScopeRegistry();
  const retention = createRetentionRegistry();
  const invariants = createInvariantSet();
  const relay = createRelayBoundary({ approverNamed: input.approverNamed === true });

  return Object.freeze({
    actions,
    scopes,
    retention,
    invariants,
    relay,
    guardParticipantText(text: string): void {
      assertNoProtectedFields(text);
    },
    invariantsHealthy(): boolean {
      return invariants.unenforced().length === 0;
    },
    relayReady(): boolean {
      return relay.approverNamed === true;
    },
    describe(): {
      readonly actionCount: number;
      readonly scopeCount: number;
      readonly invariantCount: number;
      readonly unenforcedInvariantCount: number;
      readonly relayApproverNamed: boolean;
      readonly externalActionAuthorized: false;
    } {
      return {
        actionCount: actions.list().length,
        scopeCount: scopes.list ? 0 : 0,
        invariantCount: invariants.list().length,
        unenforcedInvariantCount: invariants.unenforced().length,
        relayApproverNamed: relay.approverNamed,
        externalActionAuthorized: false
      };
    }
  });
}
