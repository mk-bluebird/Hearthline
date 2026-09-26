import type { ComponentCompositionContract } from "./domain.js";
import { MemoryStore, newId } from "./memoryStore.js";

export interface CreateComponentContractInput {
  readonly producer: string;
  readonly consumer: string;
  readonly purpose: string;
  readonly inputSchemaRef: string;
  readonly outputSchemaRef: string;
  readonly allowedFields: readonly string[];
  readonly forbiddenFields: readonly string[];
  readonly authorizationRequirement:
    ComponentCompositionContract["authorizationRequirement"];
  readonly consentRequirement:
    ComponentCompositionContract["consentRequirement"];
  readonly retentionClass:
    ComponentCompositionContract["retentionClass"];
  readonly revocationBehavior:
    ComponentCompositionContract["revocationBehavior"];
  readonly failureMode:
    ComponentCompositionContract["failureMode"];
  readonly policyVersion: string;
}

const ALWAYS_FORBIDDEN_CONTRACT_FIELDS = new Set([
  "raw_messages",
  "private_media",
  "exact_location",
  "route",
  "attendance",
  "presence",
  "contact_graph",
  "profile_views",
  "identity",
  "health",
  "recovery",
  "disability",
  "finances",
  "housing",
  "employment",
  "vulnerability",
  "advertising_identifier",
  "safety_score",
  "risk_score",
  "trust_score",
  "reputation_score",
  "compatibility_score",
  "desirability_score",
  "universal_profile"
]);

export class ComponentContractService {
  readonly #store =
    new MemoryStore<ComponentCompositionContract>("contractId");

  create(
    input: CreateComponentContractInput
  ): ComponentCompositionContract {
    if (
      input.allowedFields.length === 0 ||
      input.forbiddenFields.length === 0
    ) {
      throw new Error("field_manifests_required");
    }

    for (const field of input.allowedFields) {
      if (ALWAYS_FORBIDDEN_CONTRACT_FIELDS.has(field)) {
        throw new Error(`forbidden_allowed_field:${field}`);
      }
    }

    const contract: ComponentCompositionContract = {
      contractId: newId("component_contract"),
      producer: input.producer,
      consumer: input.consumer,
      purpose: input.purpose,
      inputSchemaRef: input.inputSchemaRef,
      outputSchemaRef: input.outputSchemaRef,
      allowedFields: input.allowedFields,
      forbiddenFields: input.forbiddenFields,
      authorizationRequirement: input.authorizationRequirement,
      consentRequirement: input.consentRequirement,
      retentionClass: input.retentionClass,
      revocationBehavior: input.revocationBehavior,
      failureMode: input.failureMode,
      policyVersion: input.policyVersion,
      state: "under_review"
    };

    return this.#store.put(contract);
  }

  get(
    contractId: string
  ): ComponentCompositionContract {
    const contract = this.#store.get(contractId);

    if (!contract) {
      throw new Error("not_found");
    }

    return contract;
  }

  list(
    producer?: string,
    consumer?: string
  ): readonly ComponentCompositionContract[] {
    return this.#store.list(
      (contract) =>
        (producer === undefined ||
          contract.producer === producer) &&
        (consumer === undefined ||
          contract.consumer === consumer)
    );
  }

  approve(
    contractId: string
  ): ComponentCompositionContract {
    return this.transition(contractId, "approved");
  }

  revoke(
    contractId: string
  ): ComponentCompositionContract {
    return this.transition(contractId, "revoked");
  }

  private transition(
    contractId: string,
    state: ComponentCompositionContract["state"]
  ): ComponentCompositionContract {
    return this.#store.update(contractId, (contract) => ({
      ...contract,
      state
    }));
  }
}
