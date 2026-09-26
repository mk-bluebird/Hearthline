import type { IncomingMessage, ServerResponse } from "node:http";
import {
  rejectForbiddenFields,
  requireMemberReference
} from "./policyGuards.js";
import {
  AppealService,
  type CreateAppealInput,
  type UpdateAppealInput
} from "./appeals.js";

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

export async function handleAppealRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  pathname: string,
  headers: Readonly<Record<string, string | undefined>>,
  service: AppealService
): Promise<boolean> {
  const memberRef = requireMemberReference(headers);

  if (pathname === "/appeals" && request.method === "POST") {
    const body = await parseJson(request);

    sendJson(
      response,
      201,
      service.create(
        memberRef,
        body as unknown as CreateAppealInput
      )
    );

    return true;
  }

  const appealMatch = pathname.match(
    /^\/appeals\/([^/]+)(?:\/withdraw)?$/
  );

  if (appealMatch) {
    const appealId = appealMatch[1];
    const isWithdrawRoute = pathname.endsWith("/withdraw");

    if (request.method === "GET" && !isWithdrawRoute) {
      sendJson(response, 200, service.get(memberRef, appealId));
      return true;
    }

    if (request.method === "PATCH" && !isWithdrawRoute) {
      const body = await parseJson(request);

      sendJson(
        response,
        200,
        service.update(
          memberRef,
          appealId,
          body as unknown as UpdateAppealInput
        )
      );

      return true;
    }

    if (request.method === "POST" && isWithdrawRoute) {
      sendJson(response, 200, service.withdraw(memberRef, appealId));
      return true;
    }
  }

  const decisionMatch = pathname.match(
    /^\/decision-history\/([^/]+)$/
  );

  if (decisionMatch && request.method === "GET") {
    sendJson(
      response,
      200,
      service.decisionHistory(memberRef, decisionMatch[1])
    );

    return true;
  }

  return false;
}
