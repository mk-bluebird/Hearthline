import test from "node:test";
import assert from "node:assert/strict";

import { BroadRegionSelectionService } from "../typescript/api-boundaries/broadRegionSelection.js";
import { MediaShareService } from "../typescript/api-boundaries/mediaShares.js";
import { AftercareSessionService } from "../typescript/api-boundaries/aftercareSessions.js";
import { SocialOptionsSessionService } from "../typescript/api-boundaries/socialOptionsSessions.js";
import { InteroperabilityService } from "../typescript/api-boundaries/interoperability.js";
import { rejectForbiddenFields } from "../typescript/api-boundaries/policyGuards.js";

test("rejects latitude before broad-region persistence", () => {
  assert.throws(
    () =>
      rejectForbiddenFields({
        settingScope: "selected_broad_region",
        broadRegionId: "region_example",
        latitude: 33.4484
      }),
    /forbidden_field:latitude/
  );
});

test("creates a manually selected broad region", () => {
  const service = new BroadRegionSelectionService();

  const selection = service.create({
    ownerRef: "member_example",
    settingScope: "selected_broad_region",
    broadRegionId: "region_phoenix_central"
  });

  assert.equal(
    selection.settingScope,
    "selected_broad_region"
  );

  assert.equal(
    selection.broadRegionId,
    "region_phoenix_central"
  );
});

test("requires media copy-risk acknowledgment", () => {
  const service = new MediaShareService();

  assert.throws(
    () =>
      service.create("member_sender", {
        senderRef: "member_sender",
        recipientRef: "member_recipient",
        mediaRef: "media_example",
        mediaClass: "sensitive_personal_media",
        purpose: "personal_sharing",
        consentGrantRef: "consent_example",
        expiresAt: "2030-01-01T00:00:00.000Z",
        senderConfirmed: true,
        copyRiskNoticeAcknowledged: false as never
      }),
    /sender_confirmation_required/
  );
});

test("creates only member-initiated aftercare sessions", () => {
  const service = new AftercareSessionService();

  assert.throws(
    () =>
      service.create("member_example", {
        entryMode: "member_opened",
        selectedTools: ["boundary_review"],
        memberInitiated: false as never
      }),
    /member_initiated_required/
  );
});

test("social-options suggestions never authorize external action", () => {
  const service = new SocialOptionsSessionService();

  const session = service.create("member_example", {
    memberSelectedInputs: {
      connectionGoals: ["friendship"],
      formats: ["text"],
      pace: "one_time_option"
    },
    notificationPreference: "none",
    memberInitiated: true
  });

  const suggestions = service.suggestions(
    "member_example",
    session.sessionId
  );

  assert.equal(
    suggestions.every(
      (suggestion) =>
        suggestion.externalActionAuthorized === false
    ),
    true
  );
});

test("rejects portable reputation interoperability scopes", () => {
  const service = new InteroperabilityService();

  assert.throws(
    () =>
      service.createConnection("member_example", {
        kind: "member_data_export",
        purpose: "data_portability",
        requestedScopes: ["reputation"] as never,
        memberInitiated: true
      }),
    /forbidden_scope:reputation/
  );
});
