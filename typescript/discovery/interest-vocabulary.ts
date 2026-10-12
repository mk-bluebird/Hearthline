// SPDX-License-Identifier: MIT OR Apache-2.0

export const INTEREST_CATALOG = [
  { id: "books", category: "culture", label: "Books" },
  { id: "films", category: "culture", label: "Films" },
  { id: "museums", category: "culture", label: "Museums" },
  { id: "drawing", category: "creative", label: "Drawing" },
  { id: "writing", category: "creative", label: "Writing" },
  { id: "crafts", category: "creative", label: "Crafts" },
  { id: "board_games", category: "games", label: "Board games" },
  { id: "puzzles", category: "games", label: "Puzzles" },
  { id: "language_learning", category: "learning",
    label: "Language learning" },
  { id: "science_discussion", category: "learning",
    label: "Science discussion" },
  { id: "gardening", category: "outdoors", label: "Gardening" },
  { id: "nature_observation", category: "outdoors",
    label: "Nature observation" },
  { id: "cooking", category: "food", label: "Cooking" },
  { id: "travel_discussion", category: "places",
    label: "Discussing places and travel" },
] as const;

export type InterestId =
  (typeof INTEREST_CATALOG)[number]["id"];

export type InterestSelection = Readonly<{
  revision: number;
  interests: readonly InterestId[];
}>;

export type InterestVisibility = Readonly<{
  selectionRevision: number;
  permittedInterestIds: readonly InterestId[];
}>;

const VALID_IDS = new Set<string>(
  INTEREST_CATALOG.map((entry) => entry.id),
);

function validateIds(ids: readonly InterestId[]): void {
  if (
    !Array.isArray(ids) ||
    ids.some((id) => !VALID_IDS.has(id)) ||
    new Set(ids).size !== ids.length
  ) {
    throw new TypeError("Invalid or duplicate interest");
  }
}

export function createSelection(
  revision: number,
  interests: readonly InterestId[],
): InterestSelection {
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new TypeError("Invalid selection revision");
  }
  validateIds(interests);

  return Object.freeze({
    revision,
    interests: Object.freeze([...interests]),
  });
}

export function visibleInterests(
  selection: InterestSelection,
  visibility: InterestVisibility,
): readonly InterestId[] {
  validateIds(selection.interests);
  validateIds(visibility.permittedInterestIds);

  if (
    !Number.isSafeInteger(selection.revision) ||
    selection.revision < 0 ||
    !Number.isSafeInteger(visibility.selectionRevision) ||
    visibility.selectionRevision < 0
  ) {
    throw new TypeError("Invalid visibility revision");
  }

  if (selection.revision !== visibility.selectionRevision) {
    return Object.freeze([]);
  }

  const permitted = new Set(visibility.permittedInterestIds);
  return Object.freeze(
    selection.interests.filter((id) => permitted.has(id)),
  );
}

export function sharedInterestLabels(
  firstVisible: readonly InterestId[],
  secondVisible: readonly InterestId[],
): readonly string[] {
  validateIds(firstVisible);
  validateIds(secondVisible);

  const first = new Set(firstVisible);
  const second = new Set(secondVisible);

  return Object.freeze(
    INTEREST_CATALOG
      .filter((entry) =>
        first.has(entry.id) && second.has(entry.id))
      .map((entry) => entry.label),
  );
}
