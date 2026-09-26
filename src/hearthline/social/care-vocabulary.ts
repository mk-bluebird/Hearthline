export const CarePhrase = Object.freeze({
  I_WANT_ATTENTION_NOW: "i_want_attention_now",
  I_WANT_QUIET_COMPANY: "i_want_quiet_company",
  I_WANT_A_CHECK_IN: "i_want_a_check_in",
  I_WANT_TO_MAKE_SOMETHING: "i_want_to_make_something",
  I_WANT_TO_BE_MISSED: "i_want_to_be_missed",
  I_WANT_A_WITNESS: "i_want_a_witness",
  I_WANT_TO_BE_CELEBRATED: "i_want_to_be_celebrated",
  I_WANT_TO_BE_MET: "i_want_to_be_met"
});

export interface CareExpression {
  readonly expressionRef: string;
  readonly participantId: string;
  readonly phrase: string;
  readonly expressedAt: string;
  readonly optionalNote: string | null;
  readonly diagnosticClaimsProhibited: true;
  readonly referralTriggered: false;
  readonly rankingEffectProhibited: true;
  readonly externalActionAuthorized: false;
}

export function createCareExpression(input: {
  expressionRef: string;
  participantId: string;
  phrase: string;
  expressedAt?: string;
  optionalNote?: string | null;
}): CareExpression {
  if (!Object.values(CarePhrase).includes(input.phrase as never)) {
    throw new RangeError("Unsupported care phrase.");
  }

  const expressedAt = input.expressedAt ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(expressedAt))) {
    throw new TypeError("expressedAt must be a valid ISO 8601 date-time.");
  }

  return Object.freeze({
    expressionRef: input.expressionRef,
    participantId: input.participantId,
    phrase: input.phrase,
    expressedAt,
    optionalNote: input.optionalNote?.trim() || null,
    diagnosticClaimsProhibited: true,
    referralTriggered: false,
    rankingEffectProhibited: true,
    externalActionAuthorized: false
  });
}
