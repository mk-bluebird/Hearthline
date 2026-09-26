export type EssentialOutcome =
  | "control_privacy"
  | "revoke_scope"
  | "pause_interaction"
  | "exit_without_explanation"
  | "submit_safety_report"
  | "request_appeal"
  | "save_private_note"
  | "resume_at_own_pace"
  | "inspect_access_path";

export type InputAlternative =
  | "keyboard"
  | "pointer"
  | "voice_optional"
  | "text_entry"
  | "switch_access";

export type OutputAlternative =
  | "visual_text"
  | "screen_reader_semantics"
  | "caption_or_transcript"
  | "plain_text"
  | "non_color_state";

export interface InteractionPrimitive {
  readonly primitiveId: string;
  readonly objectFamily: string;
  readonly essentialOutcome: EssentialOutcome;
  readonly actionKind: string;
  readonly requiredInputAlternatives: readonly InputAlternative[];
  readonly requiredOutputAlternatives: readonly OutputAlternative[];
  readonly lowBandwidthEquivalent: true;
  readonly asynchronousEquivalent: true;
  readonly privacyProperties: readonly string[];
  readonly safetyProperties: readonly string[];
}

export interface PrimitiveAdapter {
  readonly primitiveId: string;
  readonly modality: InputAlternative | OutputAlternative | "low_bandwidth";
  readonly rendererId: string;
  readonly userSelectable: boolean;
  readonly trackingAllowed: false;
  readonly inferenceAllowed: false;
}

export interface ParityResult {
  readonly primitiveId: string;
  readonly outcome: EssentialOutcome;
  readonly parityVerified: boolean;
  readonly missingAlternatives: readonly string[];
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)]);
}

export function verifyPrimitiveParity(
  primitive: InteractionPrimitive,
  adapters: readonly PrimitiveAdapter[]
): ParityResult {
  const available = new Set(adapters.map((adapter) => adapter.modality));

  const required = uniqueStrings([
    ...primitive.requiredInputAlternatives,
    ...primitive.requiredOutputAlternatives,
    "low_bandwidth"
  ]);

  const missingAlternatives = required.filter(
    (modality) => !available.has(modality)
  );

  return Object.freeze({
    primitiveId: primitive.primitiveId,
    outcome: primitive.essentialOutcome,
    parityVerified: missingAlternatives.length === 0,
    missingAlternatives
  });
}

export function assertPrimitiveParity(
  primitive: InteractionPrimitive,
  adapters: readonly PrimitiveAdapter[]
): void {
  const result = verifyPrimitiveParity(primitive, adapters);

  if (!result.parityVerified) {
    throw new Error(
      `Accessibility parity failed for "${result.primitiveId}": ${result.missingAlternatives.join(", ")}`
    );
  }
}
