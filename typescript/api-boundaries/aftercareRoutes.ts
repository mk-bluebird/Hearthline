import type { IncomingMessage, ServerResponse } from "node:http";
import {
  rejectForbiddenFields,
  requireMemberReference
} from "./policyGuards.js";
import {
  AftercareSessionService,
  type CreateAftercareSessionInput
} from "./aftercareSessions.js";

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

export async function handleAftercareRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  pathname: string,
  headers: Readonly<Record<string, string | undefined>>,
  service: AftercareSessionService
): Promise<boolean> {
  const ownerRef = requireMemberReference(headers);

  if (
    pathname === "/aftercare/sessions" &&
    request.method === "POST"
  ) {
    const body = await parseJson(request);

    sendJson(
      response,
      201,
      service.create(
        ownerRef,
        body as unknown as CreateAftercareSessionInput
      )
    );

    return true;
  }

  const match = pathname.match(
    /^\/aftercare\/sessions\/([^/]+)(?:\/(pause|complete))?$/
  );

  if (!match) {
    return false;
  }

  const [, sessionId, action] = match;

  if (!action && request.method === "GET") {
    sendJson(response, 200, service.get(ownerRef, sessionId));
    return true;
  }

  if (action === "pause" && request.method === "POST") {
    sendJson(response, 200, service.pause(ownerRef, sessionId));
    return true;
  }

  if (action === "complete" && request.method === "POST") {
    sendJson(response, 200, service.complete(ownerRef, sessionId));
    return true;
  }

  if (!action && request.method === "DELETE") {
    sendJson(response, 200, service.delete(ownerRef, sessionId));
    return true;
  }

  return false;
}
