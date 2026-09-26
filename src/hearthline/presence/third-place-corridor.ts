export interface ThirdPlaceCorridor {
  readonly corridorRef: string;
  readonly participantId: string;
  readonly placeCategory: string;
  readonly publicPlaceOnly: true;
  readonly exactAddressStored: false;
  readonly routineStored: false;
  readonly tracked: false;
  readonly createdAt: string;
  readonly expiresAt: string | null;
  readonly externalActionAuthorized: false;
}

const ALLOWED_CATEGORIES = new Set([
  "public_library",
  "independent_cafe",
  "public_park",
  "community_center",
  "arcade",
  "museum",
  "public_plaza",
  "board_game_shop",
  "community_garden"
]);

export function createCorridor(input: {
  corridorRef: string;
  participantId: string;
  placeCategory: string;
  createdAt?: string;
  expiresInHours?: number | null;
}): ThirdPlaceCorridor {
  if (!ALLOWED_CATEGORIES.has(input.placeCategory)) {
    throw new RangeError("Unsupported place category.");
  }

  const createdAt = input.createdAt ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(createdAt))) {
    throw new TypeError("createdAt must be a valid ISO 8601 date-time.");
  }

  const expiresAt =
    input.expiresInHours && input.expiresInHours > 0 && input.expiresInHours <= 24 * 30
      ? new Date(Date.parse(createdAt) + input.expiresInHours * 3600_000).toISOString()
      : null;

  return Object.freeze({
    corridorRef: input.corridorRef,
    participantId: input.participantId,
    placeCategory: input.placeCategory,
    publicPlaceOnly: true,
    exactAddressStored: false,
    routineStored: false,
    tracked: false,
    createdAt,
    expiresAt,
    externalActionAuthorized: false
  });
}
