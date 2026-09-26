import type { Appeal } from "./domain.js";
import { MemoryStore, newId, nowIso } from "./memoryStore.js";

export interface CreateAppealInput {
  readonly decisionRef: string;
  readonly appealGrounds: Appeal["appealGrounds"];
  readonly memberStatement?: string;
  readonly requestedAccommodation?: Appeal["requestedAccommodation"];
  readonly policyVersion: string;
}

export interface UpdateAppealInput {
  readonly appealGrounds?: Appeal["appealGrounds"];
  readonly memberStatement?: string;
  readonly requestedAccommodation?: Appeal["requestedAccommodation"];
}

export class AppealService {
  readonly #store = new MemoryStore<Appeal>("appealId");

  create(
    appellantRef: string,
    input: CreateAppealInput
  ): Appeal {
    if (input.appealGrounds.length === 0) {
      throw new Error("appeal_grounds_required");
    }

    const now = nowIso();

    const appeal: Appeal = {
      appealId: newId("appeal"),
      appellantRef,
      decisionRef: input.decisionRef,
      state: "submitted",
      appealGrounds: input.appealGrounds,
      memberStatement: input.memberStatement,
      requestedAccommodation: input.requestedAccommodation,
      createdAt: now,
      updatedAt: now,
      policyVersion: input.policyVersion
    };

    return this.#store.put(appeal);
  }

  get(
    appellantRef: string,
    appealId: string
  ): Appeal {
    const appeal = this.#store.get(appealId);

    if (!appeal || appeal.appellantRef !== appellantRef) {
      throw new Error("not_found");
    }

    return appeal;
  }

  update(
    appellantRef: string,
    appealId: string,
    input: UpdateAppealInput
  ): Appeal {
    return this.#store.update(appealId, (appeal) => {
      if (
        appeal.appellantRef !== appellantRef ||
        appeal.state === "closed"
      ) {
        throw new Error("not_found");
      }

      return {
        ...appeal,
        appealGrounds:
          input.appealGrounds ?? appeal.appealGrounds,
        memberStatement:
          input.memberStatement ?? appeal.memberStatement,
        requestedAccommodation:
          input.requestedAccommodation ??
          appeal.requestedAccommodation,
        updatedAt: nowIso()
      };
    });
  }

  withdraw(
    appellantRef: string,
    appealId: string
  ): Appeal {
    return this.#store.update(appealId, (appeal) => {
      if (appeal.appellantRef !== appellantRef) {
        throw new Error("not_found");
      }

      return {
        ...appeal,
        state: "withdrawn_by_member",
        updatedAt: nowIso()
      };
    });
  }

  decisionHistory(
    memberRef: string,
    decisionRef: string
  ): Readonly<{
    decisionRef: string;
    memberRef: string;
    notice: string;
  }> {
    return {
      decisionRef,
      memberRef,
      notice:
        "Decision history is limited to your own account. It does not expose a reporter, counterpart, private evidence, safety-sensitive review methods, or another member's private data."
    };
  }
}
