import type {
  BroadRegionScope,
  BroadRegionSelection
} from "./domain.js";
import { MemoryStore, newId, nowIso } from "./memoryStore.js";

export interface CreateBroadRegionSelectionInput {
  readonly ownerRef: string;
  readonly settingScope: BroadRegionScope;
  readonly broadRegionId?: string;
}

export interface UpdateBroadRegionSelectionInput {
  readonly settingScope?: BroadRegionScope;
  readonly broadRegionId?: string;
}

function requireBroadRegion(
  settingScope: BroadRegionScope,
  broadRegionId?: string
): void {
  if (
    settingScope === "selected_broad_region" &&
    !/^region_[A-Za-z0-9_-]{3,96}$/.test(
      broadRegionId ?? ""
    )
  ) {
    throw new Error("broad_region_required");
  }
}

export class BroadRegionSelectionService {
  readonly #store =
    new MemoryStore<BroadRegionSelection>("selectionId");

  create(
    input: CreateBroadRegionSelectionInput
  ): BroadRegionSelection {
    requireBroadRegion(
      input.settingScope,
      input.broadRegionId
    );

    const now = nowIso();

    const selection: BroadRegionSelection = {
      selectionId: newId("broad_region"),
      ownerRef: input.ownerRef,
      state: "active",
      settingScope: input.settingScope,
      broadRegionId:
        input.settingScope === "selected_broad_region"
          ? input.broadRegionId
          : undefined,
      createdAt: now,
      updatedAt: now
    };

    return this.#store.put(selection);
  }

  getOwn(
    ownerRef: string
  ): readonly BroadRegionSelection[] {
    return this.#store.list(
      (selection) =>
        selection.ownerRef === ownerRef &&
        selection.state !== "deleted"
    );
  }

  update(
    ownerRef: string,
    selectionId: string,
    input: UpdateBroadRegionSelectionInput
  ): BroadRegionSelection {
    return this.#store.update(selectionId, (current) => {
      if (current.ownerRef !== ownerRef) {
        throw new Error("not_found");
      }

      const settingScope =
        input.settingScope ?? current.settingScope;

      const broadRegionId =
        input.broadRegionId ?? current.broadRegionId;

      requireBroadRegion(settingScope, broadRegionId);

      return {
        ...current,
        settingScope,
        broadRegionId:
          settingScope === "selected_broad_region"
            ? broadRegionId
            : undefined,
        updatedAt: nowIso()
      };
    });
  }

  pause(
    ownerRef: string,
    selectionId: string
  ): BroadRegionSelection {
    return this.transition(
      ownerRef,
      selectionId,
      "paused_by_owner"
    );
  }

  withdraw(
    ownerRef: string,
    selectionId: string
  ): BroadRegionSelection {
    return this.transition(
      ownerRef,
      selectionId,
      "withdrawn"
    );
  }

  delete(
    ownerRef: string,
    selectionId: string
  ): BroadRegionSelection {
    return this.transition(ownerRef, selectionId, "deleted");
  }

  private transition(
    ownerRef: string,
    selectionId: string,
    state: BroadRegionSelection["state"]
  ): BroadRegionSelection {
    return this.#store.update(selectionId, (current) => {
      if (current.ownerRef !== ownerRef) {
        throw new Error("not_found");
      }

      return {
        ...current,
        state,
        updatedAt: nowIso()
      };
    });
  }
}
