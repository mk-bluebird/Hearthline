import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { RightsAccessReviewService } from "./rightsAccessReviews.js";
import { BroadRegionSelectionService } from "./broadRegionSelection.js";
import { MediaShareService } from "./mediaShares.js";
import { AftercareSessionService } from "./aftercareSessions.js";
import { SocialOptionsSessionService } from "./socialOptionsSessions.js";
import { AppealService } from "./appeals.js";
import { InteroperabilityService } from "./interoperability.js";
import { ResearchStudyService } from "./researchStudies.js";
import { ComponentContractService } from "./componentContracts.js";

import { handleRightsAccessReviewRoutes } from "./rightsAccessReviewRoutes.js";
import { handleStructuralUncertaintyRoutes } from "./structuralUncertaintyRoutes.js";
import { handleBroadRegionSelectionRoutes } from "./broadRegionSelectionRoutes.js";
import { handleMediaShareRoutes } from "./mediaShareRoutes.js";
import { handleAftercareRoutes } from "./aftercareRoutes.js";
import { handleSocialOptionsRoutes } from "./socialOptionsRoutes.js";
import { handleAppealRoutes } from "./appealRoutes.js";
import { handleInteroperabilityRoutes } from "./interoperabilityRoutes.js";
import { handleResearchStudyRoutes } from "./researchStudyRoutes.js";
import { handleComponentContractRoutes } from "./componentContractRoutes.js";

function normalizedHeaders(
  request: IncomingMessage
): Record<string, string | undefined> {
  const headers: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(request.headers)) {
    headers[key.toLowerCase()] =
      typeof value === "string" ? value : value?.join(",");
  }

  return headers;
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

const rightsAccessReviews = new RightsAccessReviewService();
const broadRegionSelections = new BroadRegionSelectionService();
const mediaShares = new MediaShareService();
const aftercareSessions = new AftercareSessionService();
const socialOptionsSessions = new SocialOptionsSessionService();
const appeals = new AppealService();
const interoperability = new InteroperabilityService();
const researchStudies = new ResearchStudyService();
const componentContracts = new ComponentContractService();

const consentLookup = {
  async getCurrentGrant(grantRef: string) {
    if (!/^consent_[A-Za-z0-9_-]+$/.test(grantRef)) {
      return undefined;
    }

    return {
      state: "granted" as const,
      capability: "view_shared_media" as const,
      recipientRef: "member_recipient_example",
      expiresAt: "2030-01-01T00:00:00.000Z"
    };
  }
};

const blockLookup = {
  async isBlockedOrRestricted(
    _senderRef: string,
    _recipientRef: string
  ): Promise<boolean> {
    return false;
  }
};

export const server = createServer(
  async (request, response) => {
    const url = new URL(
      request.url ?? "/",
      "http://localhost"
    );

    const pathname = url.pathname;
    const headers = normalizedHeaders(request);

    try {
      const handled =
        await handleRightsAccessReviewRoutes(
          request,
          response,
          pathname,
          headers,
          rightsAccessReviews
        ) ||
        await handleStructuralUncertaintyRoutes(
          request,
          response,
          pathname,
          headers
        ) ||
        await handleBroadRegionSelectionRoutes(
          request,
          response,
          pathname,
          headers,
          broadRegionSelections
        ) ||
        await handleMediaShareRoutes(
          request,
          response,
          pathname,
          headers,
          mediaShares,
          consentLookup,
          blockLookup
        ) ||
        await handleAftercareRoutes(
          request,
          response,
          pathname,
          headers,
          aftercareSessions
        ) ||
        await handleSocialOptionsRoutes(
          request,
          response,
          pathname,
          headers,
          socialOptionsSessions
        ) ||
        await handleAppealRoutes(
          request,
          response,
          pathname,
          headers,
          appeals
        ) ||
        await handleInteroperabilityRoutes(
          request,
          response,
          pathname,
          headers,
          interoperability
        ) ||
        await handleResearchStudyRoutes(
          request,
          response,
          pathname,
          headers,
          researchStudies
        ) ||
        await handleComponentContractRoutes(
          request,
          response,
          pathname,
          headers,
          componentContracts
        );

      if (!handled) {
        sendJson(response, 404, {
          error: "not_found"
        });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "invalid_request";

      sendJson(
        response,
        message === "not_found" ? 404 : 400,
        { error: message }
      );
    }
  }
);

const port = Number(process.env.PORT ?? 3000);

server.listen(port, () => {
  console.log(
    `Hearthline API boundary examples listening on http://localhost:${port}`
  );
});
