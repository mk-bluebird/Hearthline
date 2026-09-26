import type { IncomingMessage, ServerResponse } from "node:http";
import { requireGovernanceAuthorization } from "./policyGuards.js";
import {
  RightsAccessReviewService,
  type CreateRightsAccessReviewInput
} from "./rightsAccessReviews.js";

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

export async function handleRightsAccessReviewRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  pathname: string,
  headers: Readonly<Record<string, string | undefined>>,
  service: RightsAccessReviewService
): Promise<boolean> {
  if (pathname === "/governance/rights-access-reviews") {
    requireGovernanceAuthorization(headers);

    if (request.method === "POST") {
      const body = await parseJson(request);

      const review = service.create(
        body as unknown as CreateRightsAccessReviewInput
      );

      sendJson(response, 201, review);
      return true;
    }

    if (request.method === "GET") {
      const requestUrl = new URL(
        request.url ?? "/",
        "http://localhost"
      );

      sendJson(
        response,
        200,
        service.list(
          requestUrl.searchParams.get("featureRef") ?? undefined
        )
      );

      return true;
    }
  }

  const match = pathname.match(
    /^\/governance\/rights-access-reviews\/([^/]+)$/
  );

  if (match && request.method === "GET") {
    requireGovernanceAuthorization(headers);

    sendJson(response, 200, service.get(match[1]));
    return true;
  }

  return false;
}
