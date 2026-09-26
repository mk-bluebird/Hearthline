import type { IncomingMessage, ServerResponse } from "node:http";
import {
  rejectForbiddenFields,
  requireMemberReference
} from "./policyGuards.js";
import {
  InteroperabilityService,
  type CreateInteropConnectionInput
} from "./interoperability.js";

async function parseJson(
  request: IncomingMessage
): Promise<Record<string, unknown>> {
  let raw = "";

  for await (const chunk of request) {
    raw += String(chunk);
  }

  const value = raw.length === 0
    ? {}
    : JSON.parse(raw) as Record<string, unknown>;

  rejectForbiddenFields(value);

  return value;
}

function sendJson(
  response: ServerResponse,
  status: number,
  value: unknown
): void {
  response.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store"
  });

  response.end(JSON.stringify(value));
}

export async function handleInteroperabilityRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  pathname: string,
  headers: Readonly<Record<string, string | undefined>>,
  service: InteroperabilityService
): Promise<boolean> {
  const ownerRef = requireMemberReference(headers);

  if (
    pathname === "/interoperability/connections" &&
    request.method === "POST"
  ) {
    const body = await parseJson(request);

    sendJson(
      response,
      201,
      service.createConnection(
        ownerRef,
        body as unknown as CreateInteropConnectionInput
      )
    );

    return true;
  }

  const connectionMatch = pathname.match(
    /^\/interoperability\/connections\/([^/]+)(?:\/(confirm|revoke))?$/
  );

  if (connectionMatch) {
    const [, connectionId, action] = connectionMatch;

    if (!action && request.method === "GET") {
      sendJson(
        response,
        200,
        service.getConnection(ownerRef, connectionId)
      );

      return true;
    }

    if (action === "confirm" && request.method === "POST") {
      sendJson(
        response,
        200,
        service.confirmConnection(ownerRef, connectionId)
      );

      return true;
    }

    if (action === "revoke" && request.method === "POST") {
      sendJson(
        response,
        200,
        service.revokeConnection(ownerRef, connectionId)
      );

      return true;
    }
  }

  if (pathname === "/exports" && request.method === "POST") {
    const body = await parseJson(request);

    sendJson(
      response,
      202,
      service.createExport(
        ownerRef,
        body.requestedScopes as never
      )
    );

    return true;
  }

  const exportMatch = pathname.match(/^\/exports\/([^/]+)$/);

  if (exportMatch && request.method === "GET") {
    sendJson(
      response,
      200,
      service.getExport(ownerRef, exportMatch[1])
    );

    return true;
  }

  if (pathname === "/imports/preview" && request.method === "POST") {
    const body = await parseJson(request);

    sendJson(
      response,
      200,
      service.previewImport(
        ownerRef,
        body.requestedScopes as never
      )
    );

    return true;
  }

  if (pathname === "/imports/confirm" && request.method === "POST") {
    const body = await parseJson(request);

    sendJson(
      response,
      202,
      service.confirmImport(
        ownerRef,
        body.memberConfirmed === true
      )
    );

    return true;
  }

  return false;
}
