import type { MediaShare } from "./domain.js";
import { MemoryStore, newId, nowIso } from "./memoryStore.js";
import { requireFutureExpiry } from "./policyGuards.js";

export interface CreateMediaShareInput {
  readonly senderRef: string;
  readonly recipientRef: string;
  readonly mediaRef: string;
  readonly mediaClass: MediaShare["mediaClass"];
  readonly purpose: MediaShare["purpose"];
  readonly consentGrantRef: string;
  readonly expiresAt: string;
  readonly senderConfirmed: true;
  readonly copyRiskNoticeAcknowledged: true;
}

export interface ConsentGrantLookup {
  getCurrentGrant(
    grantRef: string
  ): Promise<
    | {
        readonly state: "granted" | "withdrawn" | "expired";
        readonly capability: "view_shared_media";
        readonly recipientRef: string;
        readonly expiresAt: string;
      }
    | undefined
  >;
}

export interface BlockRestrictionLookup {
  isBlockedOrRestricted(
    senderRef: string,
    recipientRef: string
  ): Promise<boolean>;
}

export class MediaShareService {
  readonly #store = new MemoryStore<MediaShare>("shareId");

  create(
    senderRef: string,
    input: CreateMediaShareInput
  ): MediaShare {
    if (input.senderRef !== senderRef) {
      throw new Error("sender_scope_mismatch");
    }

    if (
      input.senderConfirmed !== true ||
      input.copyRiskNoticeAcknowledged !== true
    ) {
      throw new Error("sender_confirmation_required");
    }

    requireFutureExpiry(input.expiresAt);

    const share: MediaShare = {
      shareId: newId("media_share"),
      senderRef: input.senderRef,
      recipientRef: input.recipientRef,
      mediaRef: input.mediaRef,
      mediaClass: input.mediaClass,
      purpose: input.purpose,
      state: "proposed",
      consentGrantRef: input.consentGrantRef,
      createdAt: nowIso(),
      expiresAt: input.expiresAt,
      senderConfirmed: true,
      copyRiskNoticeAcknowledged: true
    };

    return this.#store.put(share);
  }

  requestViewPermission(
    senderRef: string,
    shareId: string
  ): MediaShare {
    return this.#store.update(shareId, (share) => {
      if (share.senderRef !== senderRef) {
        throw new Error("not_found");
      }

      if (share.state !== "proposed") {
        throw new Error("invalid_media_share_state");
      }

      return {
        ...share,
        state: "recipient_view_permission_pending"
      };
    });
  }

  grantViewPermission(
    recipientRef: string,
    shareId: string
  ): MediaShare {
    return this.#store.update(shareId, (share) => {
      if (share.recipientRef !== recipientRef) {
        throw new Error("not_found");
      }

      if (
        share.state !== "recipient_view_permission_pending"
      ) {
        throw new Error("invalid_media_share_state");
      }

      return {
        ...share,
        state: "active"
      };
    });
  }

  async requireAccess(
    recipientRef: string,
    shareId: string,
    consentLookup: ConsentGrantLookup,
    blockLookup: BlockRestrictionLookup,
    now: Date = new Date()
  ): Promise<MediaShare> {
    const share = this.#store.get(shareId);

    if (!share || share.recipientRef !== recipientRef) {
      throw new Error("not_found");
    }

    if (share.state !== "active") {
      throw new Error("media_share_not_active");
    }

    requireFutureExpiry(share.expiresAt, now);

    if (
      await blockLookup.isBlockedOrRestricted(
        share.senderRef,
        recipientRef
      )
    ) {
      throw new Error("media_share_blocked_or_restricted");
    }

    const grant = await consentLookup.getCurrentGrant(
      share.consentGrantRef
    );

    if (!grant) {
      throw new Error("media_consent_grant_not_found");
    }

    if (grant.state !== "granted") {
      throw new Error("media_consent_grant_not_active");
    }

    if (grant.capability !== "view_shared_media") {
      throw new Error("media_consent_grant_capability_mismatch");
    }

    if (grant.recipientRef !== recipientRef) {
      throw new Error("media_consent_grant_recipient_mismatch");
    }

    requireFutureExpiry(grant.expiresAt, now);

    return share;
  }

  withdraw(
    senderRef: string,
    shareId: string
  ): MediaShare {
    return this.#store.update(shareId, (share) => {
      if (share.senderRef !== senderRef) {
        throw new Error("not_found");
      }

      return {
        ...share,
        state: "withdrawn"
      };
    });
  }

  delete(
    senderRef: string,
    shareId: string
  ): MediaShare {
    return this.#store.update(shareId, (share) => {
      if (share.senderRef !== senderRef) {
        throw new Error("not_found");
      }

      return {
        ...share,
        state: "cancelled"
      };
    });
  }
}
