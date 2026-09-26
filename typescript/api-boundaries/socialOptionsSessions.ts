import type { SocialOptionsSession } from "./domain.js";
import { MemoryStore, newId, nowIso } from "./memoryStore.js";
import { requireMemberInitiated } from "./policyGuards.js";

export interface CreateSocialOptionsSessionInput {
  readonly memberSelectedInputs:
    SocialOptionsSession["memberSelectedInputs"];
  readonly notificationPreference:
    SocialOptionsSession["notificationPreference"];
  readonly memberInitiated: true;
}

export interface SocialOptionSuggestion {
  readonly suggestionId: string;
  readonly sessionRef: string;
  readonly kind:
    | "private_reflection"
    | "remote_activity_idea"
    | "public_activity_idea"
    | "text_first_conversation_idea"
    | "consent_checkpoint_reminder"
    | "pause_or_rest_option";
  readonly plainLanguageText: string;
  readonly memberActionRequired: true;
  readonly externalActionAuthorized: false;
  readonly dismissible: true;
}

export class SocialOptionsSessionService {
  readonly #store =
    new MemoryStore<SocialOptionsSession>("sessionId");

  create(
    ownerRef: string,
    input: CreateSocialOptionsSessionInput
  ): SocialOptionsSession {
    requireMemberInitiated(input);

    const session: SocialOptionsSession = {
      sessionId: newId("low_pressure_options"),
      ownerRef,
      state: "active",
      memberSelectedInputs: input.memberSelectedInputs,
      notificationPreference: input.notificationPreference,
      createdAt: nowIso(),
      memberInitiated: true
    };

    return this.#store.put(session);
  }

  get(
    ownerRef: string,
    sessionId: string
  ): SocialOptionsSession {
    const session = this.#store.get(sessionId);

    if (!session || session.ownerRef !== ownerRef) {
      throw new Error("not_found");
    }

    return session;
  }

  suggestions(
    ownerRef: string,
    sessionId: string
  ): readonly SocialOptionSuggestion[] {
    const session = this.get(ownerRef, sessionId);

    if (session.state !== "active") {
      throw new Error("social_options_session_not_active");
    }

    return [
      {
        suggestionId: newId("social_suggestion"),
        sessionRef: session.sessionId,
        kind: "private_reflection",
        plainLanguageText:
          "You can choose one small optional social possibility, revise your settings, or pause planning. No action is required.",
        memberActionRequired: true,
        externalActionAuthorized: false,
        dismissible: true
      },
      {
        suggestionId: newId("social_suggestion"),
        sessionRef: session.sessionId,
        kind: "pause_or_rest_option",
        plainLanguageText:
          "You can pause this planning session or choose no reminder. Hearthline does not track whether you act on a suggestion.",
        memberActionRequired: true,
        externalActionAuthorized: false,
        dismissible: true
      }
    ];
  }

  pause(
    ownerRef: string,
    sessionId: string
  ): SocialOptionsSession {
    return this.transition(ownerRef, sessionId, "paused_by_owner");
  }

  delete(
    ownerRef: string,
    sessionId: string
  ): SocialOptionsSession {
    return this.transition(ownerRef, sessionId, "deleted");
  }

  private transition(
    ownerRef: string,
    sessionId: string,
    state: SocialOptionsSession["state"]
  ): SocialOptionsSession {
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
