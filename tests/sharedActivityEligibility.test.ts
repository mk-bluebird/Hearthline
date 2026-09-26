import { describe, expect, it } from "vitest";
import {
  decideSharedActivityEligibility,
  type SharedActivityCard
} from "../typescript/discovery/sharedActivityEligibility";

const now = new Date("2026-09-26T20:30:00Z");

function makeCard(
  overrides: Partial<SharedActivityCard> = {}
): SharedActivityCard {
  return {
    schemaVersion: "1.0",
    cardId: "sac_defaultExampleCard",
    ownerId: "member_defaultExampleOwner",
    status: "active",
    connectionIntent: ["friendship", "shared_activity"],
    activityCategories: ["board_games", "coffee_or_tea"],
    atmospherePreferences: ["public_first", "quiet", "low_cost"],
    broadArea: {
      regionCode: "region_phoenix_central",
      displayLabel: "Central metro area",
      precision: "broad_member_selected_region"
    },
    availabilityWindow: {
      startDate: "2026-09-28",
      endDate: "2026-10-11",
      timeBlocks: ["weekday_evening", "weekend_daytime"]
    },
    pacePreferences: ["text_first", "public_first"],
    discoveryConsent: {
      allowEligibilityMatching: true,
      allowExplanationGeneration: true,
      allowMutualInterestNotice: true,
      allowVenueDisclosureAfterMutualAcceptance: false,
      consentedAt: "2026-09-26T20:00:00Z",
      policyVersion: "discovery-consent-v1"
    },
    createdAt: "2026-09-26T20:00:00Z",
    expiresAt: "2026-10-11T23:59:59Z",
    ...overrides
  };
}

describe("shared-activity eligibility", () => {
  it("returns an explainable eligible result for two consenting active cards", () => {
    const viewer = makeCard({
      cardId: "sac_viewer",
      ownerId: "member_viewer"
    });

    const candidate = makeCard({
      cardId: "sac_candidate",
      ownerId: "member_candidate",
      activityCategories: ["board_games", "learning"],
      atmospherePreferences: ["public_first", "quiet", "seated"],
      availabilityWindow: {
        startDate: "2026-10-01",
        endDate: "2026-10-08",
        timeBlocks: ["weekday_evening"]
      }
    });

    const decision = decideSharedActivityEligibility(viewer, candidate, now);

    expect(decision.eligible).toBe(true);

    if (decision.eligible) {
      expect(decision.sharedActivities).toEqual(["board_games"]);
      expect(decision.sharedTimeBlocks).toEqual(["weekday_evening"]);
      expect(decision.explanation).toContain("board games");
      expect(decision.explanation).toContain("Central metro area");
      expect(decision.explanation).toContain("does not use contacts");
      expect(decision.excludedInputs).toContain("location_history");
      expect(decision.excludedInputs).toContain("venue_attendance");
      expect(decision.excludedInputs).toContain("mutual_contacts");
    }
  });

  it("fails closed after either person withdraws eligibility-matching consent", () => {
    const viewer = makeCard({
      cardId: "sac_viewer",
      ownerId: "member_viewer"
    });

    const candidate = makeCard({
      cardId: "sac_candidate",
      ownerId: "member_candidate",
      discoveryConsent: {
        allowEligibilityMatching: false,
        allowExplanationGeneration: true,
        allowMutualInterestNotice: true,
        allowVenueDisclosureAfterMutualAcceptance: false,
        consentedAt: "2026-09-26T20:00:00Z",
        policyVersion: "discovery-consent-v1"
      }
    });

    const decision = decideSharedActivityEligibility(viewer, candidate, now);

    expect(decision).toEqual({
      eligible: false,
      reasons: ["matching_not_consented"]
    });
  });

  it("fails closed when a card has expired", () => {
    const viewer = makeCard({
      cardId: "sac_viewer",
      ownerId: "member_viewer"
    });

    const candidate = makeCard({
      cardId: "sac_candidate",
      ownerId: "member_candidate",
      expiresAt: "2026-09-25T23:59:59Z"
    });

    const decision = decideSharedActivityEligibility(viewer, candidate, now);

    expect(decision).toEqual({
      eligible: false,
      reasons: ["inactive_or_expired"]
    });
  });

  it("does not match cards in distinct member-selected broad regions", () => {
    const viewer = makeCard({
      cardId: "sac_viewer",
      ownerId: "member_viewer"
    });

    const candidate = makeCard({
      cardId: "sac_candidate",
      ownerId: "member_candidate",
      broadArea: {
        regionCode: "region_tucson_central",
        displayLabel: "Central metro area",
        precision: "broad_member_selected_region"
      }
    });

    const decision = decideSharedActivityEligibility(viewer, candidate, now);

    expect(decision).toEqual({
      eligible: false,
      reasons: ["different_broad_area"]
    });
  });

  it("does not turn a shared region into a match without a shared activity", () => {
    const viewer = makeCard({
      cardId: "sac_viewer",
      ownerId: "member_viewer",
      activityCategories: ["board_games"]
    });

    const candidate = makeCard({
      cardId: "sac_candidate",
      ownerId: "member_candidate",
      activityCategories: ["museum_or_art"]
    });

    const decision = decideSharedActivityEligibility(viewer, candidate, now);

    expect(decision).toEqual({
      eligible: false,
      reasons: ["no_shared_activity"]
    });
  });

  it("does not use exact coordinates because the discovery contract has no coordinate field", () => {
    const viewer = makeCard({
      cardId: "sac_viewer",
      ownerId: "member_viewer"
    });

    const candidate = makeCard({
      cardId: "sac_candidate",
      ownerId: "member_candidate"
    });

    const unsafeCandidatePayload = {
      ...candidate,
      exactLatitude: 33.448376,
      exactLongitude: -112.074036,
      venueHistory: ["example-venue"],
      bluetoothProximityEvents: ["device-observation"]
    };

    const decision = decideSharedActivityEligibility(
      viewer,
      unsafeCandidatePayload as SharedActivityCard,
      now
    );

    expect(decision.eligible).toBe(true);

    if (decision.eligible) {
      expect(decision.explanation).toContain(
        "It does not use contacts, mutual friends, profile views, messages, venue visits, location history, real-time presence, or popularity."
      );
      expect(decision.excludedInputs).toContain("exact_location");
      expect(decision.excludedInputs).toContain("gps");
      expect(decision.excludedInputs).toContain("bluetooth_or_wifi_proximity");
      expect(decision.excludedInputs).toContain("venue_attendance");
    }
  });

  it("does not permit self-matching", () => {
    const samePerson = makeCard({
      cardId: "sac_self",
      ownerId: "member_same_person"
    });

    const decision = decideSharedActivityEligibility(
      samePerson,
      samePerson,
      now
    );

    expect(decision).toEqual({
      eligible: false,
      reasons: ["same_owner"]
    });
  });
});
