export type SortFunctionId =
  | "rotation_first"
  | "story_first"
  | "interest_first"
  | "local_activity_first"
  | "aperture_context_first"
  | "room_participation_first";

export interface DiscoveryProfile {
  readonly profileRef: string;
  readonly eligible: boolean;
  readonly rotationOrdinal: number;
  readonly publicStoryRevisedAt: string | null;
  readonly visibleInterestIds: readonly string[];
  readonly activePublicActivityCount: number;
  readonly apertureContextAvailable: boolean;
  readonly sharedRoomThemeCount: number;
}

export interface SortExplanation {
  readonly id: SortFunctionId;
  readonly title: string;
  readonly description: string;
  readonly uses: readonly string[];
  readonly neverUses: readonly string[];
  readonly persistentHistory: false;
  readonly userSelectable: true;
}

export interface SortContext {
  readonly selectedInterestIds: readonly string[];
  readonly currentTime: string;
}

const FORBIDDEN_SORT_INPUTS = Object.freeze([
  "response_speed",
  "profile_popularity",
  "profile_clicks",
  "photo_quality",
  "message_sentiment",
  "private_intimacy_data",
  "financial_status",
  "health_status",
  "recovery_history",
  "identity_inference",
  "device_data",
  "precise_location",
  "rhythm_sync_data"
]);

const SORT_EXPLANATIONS: Readonly<Record<SortFunctionId, SortExplanation>> = Object.freeze({
  rotation_first: Object.freeze({
    id: "rotation_first",
    title: "Rotated discovery",
    description:
      "Shows eligible profiles through a stable rotation so the same people do not appear first every time.",
    uses: Object.freeze(["eligible status", "rotation ordinal"]),
    neverUses: FORBIDDEN_SORT_INPUTS,
    persistentHistory: false,
    userSelectable: true
  }),
  story_first: Object.freeze({
    id: "story_first",
    title: "Story-first",
    description:
      "Shows eligible profiles with recently revised public story chapters first, with rotated ordering for ties.",
    uses: Object.freeze(["eligible status", "public story revision time", "rotation ordinal"]),
    neverUses: FORBIDDEN_SORT_INPUTS,
    persistentHistory: false,
    userSelectable: true
  }),
  interest_first: Object.freeze({
    id: "interest_first",
    title: "Interest-first",
    description:
      "Shows eligible profiles with overlap in the interests you selected for this browsing session.",
    uses: Object.freeze(["eligible status", "explicitly visible interest overlap", "rotation ordinal"]),
    neverUses: FORBIDDEN_SORT_INPUTS,
    persistentHistory: false,
    userSelectable: true
  }),
  local_activity_first: Object.freeze({
    id: "local_activity_first",
    title: "Activity-first",
    description:
      "Shows eligible profiles connected to active public or virtual activity invitations.",
    uses: Object.freeze(["eligible status", "active public activity count", "rotation ordinal"]),
    neverUses: FORBIDDEN_SORT_INPUTS,
    persistentHistory: false,
    userSelectable: true
  }),
  aperture_context_first: Object.freeze({
    id: "aperture_context_first",
    title: "Broad availability context",
    description:
      "Groups eligible profiles with mutually declared broad availability context. It never shows real-time availability.",
    uses: Object.freeze(["eligible status", "mutual broad availability context", "rotation ordinal"]),
    neverUses: FORBIDDEN_SORT_INPUTS,
    persistentHistory: false,
    userSelectable: true
  }),
  room_participation_first: Object.freeze({
    id: "room_participation_first",
    title: "Shared rooms",
    description:
      "Shows eligible profiles with shared room themes, without using message content or participation volume.",
    uses: Object.freeze(["eligible status", "shared room theme count", "rotation ordinal"]),
    neverUses: FORBIDDEN_SORT_INPUTS,
    persistentHistory: false,
    userSelectable: true
  })
});

function assertSortId(value: string): SortFunctionId {
  if (!(value in SORT_EXPLANATIONS)) {
    throw new RangeError(`Unsupported sort function "${value}".`);
  }

  return value as SortFunctionId;
}

function interestOverlap(
  profileInterestIds: readonly string[],
  selectedInterestIds: readonly string[]
): number {
  const selected = new Set(selectedInterestIds);
  return profileInterestIds.reduce(
    (count, interestId) => count + (selected.has(interestId) ? 1 : 0),
    0
  );
}

function parseTimeOrZero(value: string | null): number {
  if (value === null) {
    return 0;
  }

  const parsed = new Date(value).valueOf();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function tieBreak(left: DiscoveryProfile, right: DiscoveryProfile): number {
  return left.rotationOrdinal - right.rotationOrdinal
    || left.profileRef.localeCompare(right.profileRef);
}

function compareProfiles(
  sortId: SortFunctionId,
  context: SortContext,
  left: DiscoveryProfile,
  right: DiscoveryProfile
): number {
  if (left.eligible !== right.eligible) {
    return left.eligible ? -1 : 1;
  }

  switch (sortId) {
    case "rotation_first":
      return tieBreak(left, right);

    case "story_first":
      return parseTimeOrZero(right.publicStoryRevisedAt)
        - parseTimeOrZero(left.publicStoryRevisedAt)
        || tieBreak(left, right);

    case "interest_first":
      return interestOverlap(right.visibleInterestIds, context.selectedInterestIds)
        - interestOverlap(left.visibleInterestIds, context.selectedInterestIds)
        || tieBreak(left, right);

    case "local_activity_first":
      return right.activePublicActivityCount - left.activePublicActivityCount
        || tieBreak(left, right);

    case "aperture_context_first":
      return Number(right.apertureContextAvailable)
        - Number(left.apertureContextAvailable)
        || tieBreak(left, right);

    case "room_participation_first":
      return right.sharedRoomThemeCount - left.sharedRoomThemeCount
        || tieBreak(left, right);
  }
}

export function listSortFunctions(): readonly SortExplanation[] {
  return Object.freeze(Object.values(SORT_EXPLANATIONS));
}

export function explainSortFunction(sortId: string): SortExplanation {
  return SORT_EXPLANATIONS[assertSortId(sortId)];
}

export function sortDiscoveryProfiles(
  profiles: readonly DiscoveryProfile[],
  sortId: string,
  context: SortContext
): readonly DiscoveryProfile[] {
  const normalizedSortId = assertSortId(sortId);

  return Object.freeze(
    profiles
      .filter((profile) => profile.eligible)
      .slice()
      .sort((left, right) => compareProfiles(normalizedSortId, context, left, right))
  );
}
