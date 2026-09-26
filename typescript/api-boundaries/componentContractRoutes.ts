import type { IncomingMessage, ServerResponse } from "node:http";
import {
  rejectForbiddenFields,
  requireGovernanceAuthorization
} from "./policyGuards.js";
import {
  ComponentContractService,
  type CreateComponentContractInput
} from "./componentContracts.js";

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

export async function handleComponentContractRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  pathname: string,
  headers: Readonly<Record<string, string | undefined>>,
  service: ComponentContractService
): Promise<boolean> {
  requireGovernanceAuthorization(headers);

  if (
    pathname === "/internal/component-contracts" &&
    request.method === "POST"
  ) {
    const body = await parseJson(request);

    sendJson(
      response,
      201,
      service.create(
        body as unknown as CreateComponentContractInput
      )
    );

    return true;
  }

  if (
    pathname === "/internal/component-contracts" &&
    request.method === "GET"
  ) {
    const url = new URL(
      request.url ?? "/",
      "http://localhost"
    );

    sendJson(
      response,
      200,
      service.list(
        url.searchParams.get("producer") ?? undefined,
        url.searchParams.get("consumer") ?? undefined
      )
    );

    return true;
  }

  const match = pathname.match(
    /^\/internal\/component-contracts\/([^/]+)(?:\/(approve|revoke))?$/
  );

  if (!match) {
    return false;
  }

  const [, contractId, action] = match;

  if (!action && request.method === "GET") {
    sendJson(response, 200, service.get(contractId));
    return true;
  }

  if (action === "approve" && request.method === "POST") {
    sendJson(response, 200, service.approve(contractId));
    return true;
  }

  if (action === "revoke" && request.method === "POST") {
    sendJson(response, 200, service.revoke(contractId));
    return true;
  }

  return false;
}
