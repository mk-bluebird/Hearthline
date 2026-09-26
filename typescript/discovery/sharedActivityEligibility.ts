export type ConnectionIntent =
  | "friendship"
  | "conversation"
  | "shared_activity"
  | "dating"
  | "romance"
  | "intimacy";

export type ActivityCategory =
  | "board_games"
  | "books_and_reading"
  | "coffee_or_tea"
  | "creative_making"
  | "film_or_media"
  | "food_noncommercial"
  | "learning"
  | "museum_or_art"
  | "music_listening"
  | "nature_public"
  | "online_game"
  | "public_market"
  | "remote_conversation"
  | "walking_public"
  | "workshop";

export type AtmospherePreference =
  | "daytime"
  | "indoor"
  | "low_cost"
  | "low_sensory"
  | "outdoor"
  | "public_first"
  | "quiet"
  | "remote_first"
  | "seated"
  | "short_duration"
  | "step_free_preferred"
  | "substance_free_preferred"
  | "weekday"
  | "weekend";

export type TimeBlock =
  | "weekday_daytime"
  | "weekday_evening"
  | "weekend_daytime"
  | "weekend_evening";

export type PacePreference =
  | "ask_before_sexual_topics"
  | "asynchronous_messages"
  | "no_photo_required"
  | "one_conversation_at_a_time"
  | "public_first"
  | "slower_replies_welcome"
  | "text_first"
  | "video_not_required";

export interface BroadArea {
  readonly regionCode: string;
  readonly displayLabel: string;
  readonly precision: "broad_member_selected_region";
}

export interface AvailabilityWindow {
  readonly startDate: string;
  readonly endDate: string;
  readonly timeBlocks: readonly TimeBlock[];
}

export interface DiscoveryConsent {
  readonly allowEligibilityMatching: boolean;
  readonly allowExplanationGeneration: boolean;
  readonly allowMutualInterestNotice: boolean;
  readonly allowVenueDisclosureAfterMutualAcceptance: boolean;
  readonly consentedAt: string;
  readonly policyVersion: string;
}

export interface SharedActivityCard {
  readonly schemaVersion: "1.0";
  readonly cardId: string;
  readonly ownerId: string;
  readonly status:
    | "draft"
    | "active"
    | "paused_by_owner"
    | "withdrawn"
    | "expired";
  readonly connectionIntent: readonly ConnectionIntent[];
  readonly activityCategories: readonly ActivityCategory[];
  readonly atmospherePreferences: readonly AtmospherePreference[];
  readonly broadArea: BroadArea;
  readonly availabilityWindow: AvailabilityWindow;
  readonly pacePreferences: readonly PacePreference[];
  readonly discoveryConsent: DiscoveryConsent;
  readonly createdAt: string;
  readonly expiresAt: string;
}

export type IneligibilityReason =
  | "same_owner"
  | "inactive_or_expired"
  | "matching_not_consented"
  | "explanation_not_consented"
  | "different_broad_area"
  | "no_shared_intent"
  | "no_shared_activity"
  | "no_overlapping_time_block"
  | "window_does_not_overlap";

export interface EligibleDiscovery {
  readonly eligible: true;
  readonly sharedConnectionIntents: readonly ConnectionIntent[];
  readonly sharedActivities: readonly ActivityCategory[];
  readonly sharedAtmospheres: readonly AtmospherePreference[];
  readonly sharedTimeBlocks: readonly TimeBlock[];
  readonly explanation: string;
  readonly excludedInputs: readonly string[];
}

export interface IneligibleDiscovery {
  readonly eligible: false;
  readonly reasons: readonly IneligibilityReason[];
}

export type DiscoveryDecision = EligibleDiscovery | IneligibleDiscovery;

const EXCLUDED_INPUTS = [
  "contact_books",
  "mutual_contacts",
  "social_graph",
  "school",
  "employer",
  "profile_views",
  "private_messages",
  "message_sentiment",
  "photo_quality",
  "popularity",
  "response_speed",
  "online_status",
  "exact_location",
  "location_history",
  "venue_attendance",
  "gps",
  "bluetooth_or_wifi_proximity",
  "routes",
  "health_inference",
  "identity_inference",
  "sexuality_inference",
  "financial_inference",
  "housing_inference",
  "vulnerability_inference",
  "biometric_data"
] as const;

function uniqueIntersection<T>(
  left: readonly T[],
  right: readonly T[]
): readonly T[] {
  const rightValues = new Set(right);
  return [...new Set(left.filter((value) => rightValues.has(value)))];
}

function isDateRangeOverlapping(
  left: AvailabilityWindow,
  right: AvailabilityWindow
): boolean {
  const leftStart = Date.parse(left.startDate);
  const leftEnd = Date.parse(left.endDate);
  const rightStart = Date.parse(right.startDate);
  const rightEnd = Date.parse(right.endDate);

  if (
    Number.isNaN(leftStart) ||
    Number.isNaN(leftEnd) ||
    Number.isNaN(rightStart) ||
    Number.isNaN(rightEnd)
  ) {
    return false;
  }

  return leftStart <= rightEnd && rightStart <= leftEnd;
}

function isCardActiveAndUnexpired(
  card: SharedActivityCard,
  now: Date
): boolean {
  return (
    card.status === "active" &&
    Date.parse(card.expiresAt) > now.getTime()
  );
}

function humanizeActivity(activity: ActivityCategory): string {
  const labels: Record<ActivityCategory, string> = {
    board_games: "board games",
    books_and_reading: "books and reading",
    coffee_or_tea: "coffee or tea",
    creative_making: "creative making",
    film_or_media: "film or media",
    food_noncommercial: "a non-commercial food activity",
    learning: "learning",
    museum_or_art: "a museum or art activity",
    music_listening: "music listening",
    nature_public: "a public nature activity",
    online_game: "an online game",
    public_market: "a public market",
    remote_conversation: "remote conversation",
    walking_public: "a public walk",
    workshop: "a workshop"
  };

  return labels[activity];
}

function humanizeTimeBlock(timeBlock: TimeBlock): string {
  const labels: Record<TimeBlock, string> = {
    weekday_daytime: "weekday daytime",
    weekday_evening: "weekday evenings",
    weekend_daytime: "weekend daytime",
    weekend_evening: "weekend evenings"
  };

  return labels[timeBlock];
}

function sentenceList(values: readonly string[]): string {
  if (values.length === 0) {
    return "";
  }

  if (values.length === 1) {
    return values[0];
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

export function decideSharedActivityEligibility(
  viewer: SharedActivityCard,
  candidate: SharedActivityCard,
  now: Date = new Date()
): DiscoveryDecision {
  const reasons: IneligibilityReason[] = [];

  if (viewer.ownerId === candidate.ownerId) {
    reasons.push("same_owner");
  }

  if (
    !isCardActiveAndUnexpired(viewer, now) ||
    !isCardActiveAndUnexpired(candidate, now)
  ) {
    reasons.push("inactive_or_expired");
  }

  if (
    !viewer.discoveryConsent.allowEligibilityMatching ||
    !candidate.discoveryConsent.allowEligibilityMatching
  ) {
    reasons.push("matching_not_consented");
  }

  if (
    !viewer.discoveryConsent.allowExplanationGeneration ||
    !candidate.discoveryConsent.allowExplanationGeneration
  ) {
    reasons.push("explanation_not_consented");
  }

  if (viewer.broadArea.regionCode !== candidate.broadArea.regionCode) {
    reasons.push("different_broad_area");
  }

  const sharedConnectionIntents = uniqueIntersection(
    viewer.connectionIntent,
    candidate.connectionIntent
  );

  if (sharedConnectionIntents.length === 0) {
    reasons.push("no_shared_intent");
  }

  const sharedActivities = uniqueIntersection(
    viewer.activityCategories,
    candidate.activityCategories
  );

  if (sharedActivities.length === 0) {
    reasons.push("no_shared_activity");
  }

  const sharedTimeBlocks = uniqueIntersection(
    viewer.availabilityWindow.timeBlocks,
    candidate.availabilityWindow.timeBlocks
  );

  if (sharedTimeBlocks.length === 0) {
    reasons.push("no_overlapping_time_block");
  }

  if (!isDateRangeOverlapping(viewer.availabilityWindow, candidate.availabilityWindow)) {
    reasons.push("window_does_not_overlap");
  }

  if (reasons.length > 0) {
    return {
      eligible: false,
      reasons
    };
  }

  const sharedAtmospheres = uniqueIntersection(
    viewer.atmospherePreferences,
    candidate.atmospherePreferences
  );

  const activityText = sentenceList(
    sharedActivities.slice(0, 3).map(humanizeActivity)
  );

  const timeText = sentenceList(
    sharedTimeBlocks.slice(0, 2).map(humanizeTimeBlock)
  );

  const explanation =
    `You both independently selected ${activityText} ` +
    `in ${viewer.broadArea.displayLabel} during ${timeText}. ` +
    "This option uses only your current shared-activity settings. " +
    "It does not use contacts, mutual friends, profile views, messages, " +
    "venue visits, location history, real-time presence, or popularity.";

  return {
    eligible: true,
    sharedConnectionIntents,
    sharedActivities,
    sharedAtmospheres,
    sharedTimeBlocks,
    explanation,
    excludedInputs: EXCLUDED_INPUTS
  };
}
