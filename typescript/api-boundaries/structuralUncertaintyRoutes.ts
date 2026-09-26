import type { IncomingMessage, ServerResponse } from "node:http";
import { requireGovernanceAuthorization } from "./policyGuards.js";
import {
  confirmOrExclude,
  policyReviewRequest,
  type StructuralUncertaintyInput
} from "./structuralUncertainty.js";

async function parseJson(
  request: IncomingMessage
): Promise<Record<string, unknown>> {
  let raw = "";

  for await (const chunk of request) {
    raw += String(chunk);
  }

  return raw.length === 0
    ? {}
    : JSON.parse(raw) as Record<string, unknown>;
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

export async function handleStructuralUncertaintyRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  pathname: string,
  headers: Readonly<Record<string, string | undefined>>
): Promise<boolean> {
  requireGovernanceAuthorization(headers);

  if (
    pathname === "/internal/uncertainty/confirm-or-exclude" &&
    request.method === "POST"
  ) {
    const body = await parseJson(request);

    sendJson(
      response,
      200,
      confirmOrExclude(
        body as unknown as StructuralUncertaintyInput
      )
    );

    return true;
  }

  if (
    pathname === "/internal/uncertainty/policy-review" &&
    request.method === "POST"
  ) {
    const body = await parseJson(request);

    sendJson(
      response,
      202,
      policyReviewRequest(String(body.policyVersion))
    );

    return true;
  }

  return false;
}
