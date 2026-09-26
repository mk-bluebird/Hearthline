export const EndingType = Object.freeze({
  DRIFTED: "drifted",
  GREW_APART: "grew_apart",
  NOT_A_FIT: "not_a_fit",
  MET_WHAT_WE_NEEDED: "met_what_we_needed",
  SEASONAL: "only_wanted_a_season",
  FRIEND_FORWARD: "would_like_to_be_friends",
  NEED_TO_REST: "need_to_rest",
  UNDISCLOSED: "something_happened"
});

export const PostEndingMemory = Object.freeze({
  ARCHIVED_PRIVATELY: "archived_privately",
  KEPT_AS_FRIEND: "kept_as_friend",
  KEPT_AS_CONTACT: "kept_as_contact",
  CLOSED_WITH_GRACE: "closed_with_grace",
  NO_RECORD: "no_record"
});

export const RevivalDoor = Object.freeze({
  CLOSED: "closed",
  BOTH_MAY_REOPEN: "both_may_reopen",
  OTHER_MAY_REOPEN: "other_may_reopen"
});

export interface EndingDeclaration {
  readonly endingRef: string;
  readonly declaringParticipant: string;
  readonly otherParticipant: string;
  readonly endingType: string;
  readonly postEndingMemory: string;
  readonly revivalDoor: string;
  readonly declaredAt: string;
  readonly optionalLetter: string | null;
  readonly visibleToOther: boolean;
  readonly scoringProhibited: true;
  readonly rankEffectProhibited: true;
  readonly externalActionAuthorized: false;
}

export function createEndingDeclaration(input: {
  endingRef: string;
  declaringParticipant: string;
  otherParticipant: string;
  endingType: string;
  postEndingMemory: string;
  revivalDoor: string;
  declaredAt?: string;
  optionalLetter?: string | null;
  visibleToOther?: boolean;
}): EndingDeclaration {
  if (input.declaringParticipant === input.otherParticipant) {
    throw new Error("Ending declaration requires two distinct participants.");
  }
  if (!Object.values(EndingType).includes(input.endingType as never)) {
    throw new RangeError("Unsupported ending type.");
  }
  if (!Object.values(PostEndingMemory).includes(input.postEndingMemory as never)) {
    throw new RangeError("Unsupported post-ending memory.");
  }
  if (!Object.values(RevivalDoor).includes(input.revivalDoor as never)) {
    throw new RangeError("Unsupported revival door.");
  }

  const declaredAt = input.declaredAt ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(declaredAt))) {
    throw new TypeError("declaredAt must be a valid ISO 8601 date-time.");
  }

  const letter = input.optionalLetter?.trim() ?? null;

  return Object.freeze({
    endingRef: input.endingRef,
    declaringParticipant: input.declaringParticipant,
    otherParticipant: input.otherParticipant,
    endingType: input.endingType,
    postEndingMemory: input.postEndingMemory,
    revivalDoor: input.revivalDoor,
    declaredAt,
    optionalLetter: letter && letter.length > 0 ? letter.slice(0, 4000) : null,
    visibleToOther: input.visibleToOther === true,
    scoringProhibited: true,
    rankEffectProhibited: true,
    externalActionAuthorized: false
  });
}
