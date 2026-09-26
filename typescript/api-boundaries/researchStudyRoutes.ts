import type { IncomingMessage, ServerResponse } from "node:http";
import { requireMemberReference } from "./policyGuards.js";
import { ResearchStudyService } from "./researchStudies.js";

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

export async function handleResearchStudyRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  pathname: string,
  headers: Readonly<Record<string, string | undefined>>,
  service: ResearchStudyService
): Promise<boolean> {
  if (
    pathname === "/research/studies" &&
    request.method === "GET"
  ) {
    sendJson(response, 200, service.listOpenStudies());
    return true;
  }

  const studyMatch = pathname.match(
    /^\/research\/studies\/([^/]+)(?:\/(opt-in|withdraw))?$/
  );

  if (studyMatch) {
    const [, studyId, action] = studyMatch;

    if (!action && request.method === "GET") {
      sendJson(response, 200, service.getStudy(studyId));
      return true;
    }

    const memberRef = requireMemberReference(headers);

    if (action === "opt-in" && request.method === "POST") {
      sendJson(response, 200, service.optIn(memberRef, studyId));
      return true;
    }

    if (action === "withdraw" && request.method === "POST") {
      sendJson(response, 200, service.withdraw(memberRef, studyId));
      return true;
    }
  }

  if (
    pathname === "/research/participation/me" &&
    request.method === "GET"
  ) {
    const memberRef = requireMemberReference(headers);

    sendJson(
      response,
      200,
      service.listOwnParticipation(memberRef)
    );

    return true;
  }

  return false;
}
