import type { AftercareSession } from "./domain.js";
import { MemoryStore, newId, nowIso } from "./memoryStore.js";
import { requireMemberInitiated } from "./policyGuards.js";

export interface CreateAftercareSessionInput {
  readonly entryMode: AftercareSession["entryMode"];
  readonly selectedTools: AftercareSession["selectedTools"];
  readonly localOnly?: boolean;
  readonly memberInitiated: true;
}

export class AftercareSessionService {
  readonly #store = new MemoryStore<AftercareSession>("sessionId");

  create(
    ownerRef: string,
    input: CreateAftercareSessionInput
  ): AftercareSession {
    requireMemberInitiated(input);

    if (input.selectedTools.length === 0) {
      throw new Error("aftercare_tool_required");
    }

    const session: AftercareSession = {
      sessionId: newId("aftercare"),
      ownerRef,
      state: "active",
      entryMode: input.entryMode,
      selectedTools: input.selectedTools,
      localOnly: input.localOnly ?? true,
      createdAt: nowIso(),
      memberInitiated: true
    };

    return this.#store.put(session);
  }

  get(
    ownerRef: string,
    sessionId: string
  ): AftercareSession {
    const session = this.#store.get(sessionId);

    if (!session || session.ownerRef !== ownerRef) {
      throw new Error("not_found");
    }

    return session;
  }

  pause(
    ownerRef: string,
    sessionId: string
  ): AftercareSession {
    return this.transition(
      ownerRef,
      sessionId,
      "paused_by_owner"
    );
  }

  complete(
    ownerRef: string,
    sessionId: string
  ): AftercareSession {
    return this.transition(ownerRef, sessionId, "completed");
  }

  delete(
    ownerRef: string,
    sessionId: string
  ): AftercareSession {
    return this.transition(ownerRef, sessionId, "deleted");
  }

  private transition(
    ownerRef: string,
    sessionId: string,
    state: AftercareSession["state"]
  ): AftercareSession {
    return this.#store.update(sessionId, (session) => {
      if (session.ownerRef !== ownerRef) {
        throw new Error("not_found");
      }

      return {
        ...session,
        state
      };
    });
  }
}
