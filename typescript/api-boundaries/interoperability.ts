import type { InteroperabilityConnection } from "./domain.js";
import { MemoryStore, newId, nowIso } from "./memoryStore.js";
import {
  requireAllowedInteropScopes,
  requireMemberInitiated
} from "./policyGuards.js";

export interface CreateInteropConnectionInput {
  readonly kind: InteroperabilityConnection["kind"];
  readonly purpose: InteroperabilityConnection["purpose"];
  readonly requestedScopes:
    InteroperabilityConnection["requestedScopes"];
  readonly memberInitiated: true;
}

export interface ExportRequest {
  readonly exportId: string;
  readonly ownerRef: string;
  readonly requestedScopes:
    InteroperabilityConnection["requestedScopes"];
  readonly state: "queued" | "ready" | "expired" | "cancelled";
  readonly createdAt: string;
}

export interface ImportPreview {
  readonly previewId: string;
  readonly ownerRef: string;
  readonly acceptedScopes:
    InteroperabilityConnection["requestedScopes"];
  readonly requiresMemberConfirmation: true;
}

export class InteroperabilityService {
  readonly #connections =
    new MemoryStore<InteroperabilityConnection>("connectionId");

  readonly #exports = new MemoryStore<ExportRequest>("exportId");

  createConnection(
    ownerRef: string,
    input: CreateInteropConnectionInput
  ): InteroperabilityConnection {
    requireMemberInitiated(input);
    requireAllowedInteropScopes(input.requestedScopes);

    const connection: InteroperabilityConnection = {
      connectionId: newId("interop"),
      ownerRef,
      kind: input.kind,
      state: "awaiting_member_confirmation",
      purpose: input.purpose,
      requestedScopes: input.requestedScopes,
      createdAt: nowIso(),
      memberInitiated: true
    };

    return this.#connections.put(connection);
  }

  getConnection(
    ownerRef: string,
    connectionId: string
  ): InteroperabilityConnection {
    const connection = this.#connections.get(connectionId);

    if (!connection || connection.ownerRef !== ownerRef) {
      throw new Error("not_found");
    }

    return connection;
  }

  confirmConnection(
    ownerRef: string,
    connectionId: string
  ): InteroperabilityConnection {
    return this.#connections.update(connectionId, (connection) => {
      if (
        connection.ownerRef !== ownerRef ||
        connection.state !== "awaiting_member_confirmation"
      ) {
        throw new Error("not_found");
      }

      return {
        ...connection,
        state: "active"
      };
    });
  }

  revokeConnection(
    ownerRef: string,
    connectionId: string
  ): InteroperabilityConnection {
    return this.#connections.update(connectionId, (connection) => {
      if (connection.ownerRef !== ownerRef) {
        throw new Error("not_found");
      }

      return {
        ...connection,
        state: "revoked"
      };
    });
  }

  createExport(
    ownerRef: string,
    requestedScopes:
      InteroperabilityConnection["requestedScopes"]
  ): ExportRequest {
    requireAllowedInteropScopes(requestedScopes);

    const exportRequest: ExportRequest = {
      exportId: newId("export"),
      ownerRef,
      requestedScopes,
      state: "queued",
      createdAt: nowIso()
    };

    return this.#exports.put(exportRequest);
  }

  getExport(
    ownerRef: string,
    exportId: string
  ): ExportRequest {
    const exportRequest = this.#exports.get(exportId);

    if (
      !exportRequest ||
      exportRequest.ownerRef !== ownerRef
    ) {
      throw new Error("not_found");
    }

    return exportRequest;
  }

  previewImport(
    ownerRef: string,
    requestedScopes:
      InteroperabilityConnection["requestedScopes"]
  ): ImportPreview {
    requireAllowedInteropScopes(requestedScopes);

    return {
      previewId: newId("import_preview"),
      ownerRef,
      acceptedScopes: requestedScopes,
      requiresMemberConfirmation: true
    };
  }

  confirmImport(
    ownerRef: string,
    memberConfirmed: boolean
  ): Readonly<{
    importId: string;
    ownerRef: string;
    state: "queued";
  }> {
    if (memberConfirmed !== true) {
      throw new Error("member_confirmation_required");
    }

    return {
      importId: newId("import"),
      ownerRef,
      state: "queued"
    };
  }
}
