export interface LegibilityFrame {
  readonly frameRef: string;
  readonly participantId: string;
  readonly availableRhythm: readonly string[] | null;
  readonly travelOptions: readonly string[] | null;
  readonly socialBandwidth: string | null;
  readonly conversationEnergy: readonly string[] | null;
  readonly preferredFirstContact: string | null;
  readonly eachFieldOptional: true;
  readonly eachFieldIndependent: true;
  readonly inferredByPlatform: false;
  readonly reducesEligibility: false;
  readonly externalActionAuthorized: false;
}

const ALLOWED_BANDWIDTHS = new Set([
  "one_connection_at_a_time",
  "small_group_preferred",
  "open_to_several",
  "undecided"
]);

export function createLegibilityFrame(input: {
  frameRef: string;
  participantId: string;
  availableRhythm?: readonly string[];
  travelOptions?: readonly string[];
  socialBandwidth?: string;
  conversationEnergy?: readonly string[];
  preferredFirstContact?: string;
}): LegibilityFrame {
  if (input.socialBandwidth && !ALLOWED_BANDWIDTHS.has(input.socialBandwidth)) {
    throw new RangeError("Unsupported social bandwidth value.");
  }

  return Object.freeze({
    frameRef: input.frameRef,
    participantId: input.participantId,
    availableRhythm: input.availableRhythm ? Object.freeze([...input.availableRhythm]) : null,
    travelOptions: input.travelOptions ? Object.freeze([...input.travelOptions]) : null,
    socialBandwidth: input.socialBandwidth ?? null,
    conversationEnergy: input.conversationEnergy ? Object.freeze([...input.conversationEnergy]) : null,
    preferredFirstContact: input.preferredFirstContact ?? null,
    eachFieldOptional: true,
    eachFieldIndependent: true,
    inferredByPlatform: false,
    reducesEligibility: false,
    externalActionAuthorized: false
  });
}
