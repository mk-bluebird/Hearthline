import type { IncomingMessage, ServerResponse } from "node:http";
import {
  rejectForbiddenFields,
  requireMemberReference
} from "./policyGuards.js";
import {
  MediaShareService,
  type BlockRestrictionLookup,
  type ConsentGrantLookup,
  type CreateMediaShareInput
} from "./mediaShares.js";

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

export async function handleMediaShareRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  pathname: string,
  headers: Readonly<Record<string, string | undefined>>,
  service: MediaShareService,
  consentLookup: ConsentGrantLookup,
  blockLookup: BlockRestrictionLookup
): Promise<boolean> {
  const memberRef = requireMemberReference(headers);

  if (pathname === "/media-shares" && request.method === "POST") {
    const body = await parseJson(request);

    sendJson(
      response,
      201,
      service.create(
        memberRef,
        body as unknown as CreateMediaShareInput
      )
    );

    return true;
  }

  const match = pathname.match(
    /^\/media-shares\/([^/]+)(?:\/(request-view-permission|grant-view-permission|access|withdraw))?$/
  );

  if (!match) {
    return false;
  }

  const [, shareId, action] = match;

  if (
    action === "request-view-permission" &&
    request.method === "POST"
  ) {
    sendJson(
      response,
      200,
      service.requestViewPermission(memberRef, shareId)
    );

    return true;
  }

  if (
    action === "grant-view-permission" &&
    request.method === "POST"
  ) {
    sendJson(
      response,
      200,
      service.grantViewPermission(memberRef, shareId)
    );

    return true;
  }

  if (action === "access" && request.method === "GET") {
    const share = await service.requireAccess(
      memberRef,
      shareId,
      consentLookup,
      blockLookup
    );

    sendJson(response, 200, {
      shareId: share.shareId,
      mediaRef: share.mediaRef,
      mediaClass: share.mediaClass,
      expiresAt: share.expiresAt,
      copyRiskNotice:
        "Platform access is time-limited and revocable. Hearthline cannot guarantee that a recipient will not copy, screenshot, record, photograph, export, or remember media they receive."
    });

    return true;
  }

  if (action === "withdraw" && request.method === "POST") {
    sendJson(response, 200, service.withdraw(memberRef, shareId));
    return true;
  }

  if (!action && request.method === "DELETE") {
    sendJson(response, 200, service.delete(memberRef, shareId));
    return true;
  }

  return false;
}
