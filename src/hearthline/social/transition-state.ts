export interface TransitionDeclaration {
  readonly transitionRef: string;
  readonly participantId: string;
  readonly declaredAt: string;
  readonly silent: true;
  readonly reasonNotRequired: true;
  readonly promptsSuppressed: true;
  readonly rotationPreserved: true;
  readonly visibilityReduced: false;
  readonly inferredByPlatform: false;
  readonly exposedToOtherUsers: false;
  readonly externalActionAuthorized: false;
}

export function createTransitionDeclaration(input: {
  transitionRef: string;
  participantId: string;
  declaredAt?: string;
}): TransitionDeclaration {
  const declaredAt = input.declaredAt ?? new Date().toISOString();

  if (Number.isNaN(Date.parse(declaredAt))) {
    throw new TypeError("declaredAt must be a valid ISO 8601 date-time.");
  }

  return Object.freeze({
    transitionRef: input.transitionRef,
    participantId: input.participantId,
    declaredAt,
    silent: true,
    reasonNotRequired: true,
    promptsSuppressed: true,
    rotationPreserved: true,
    visibilityReduced: false,
    inferredByPlatform: false,
    exposedToOtherUsers: false,
    externalActionAuthorized: false
  });
}

export function assertTransitionInvariants(decl: TransitionDeclaration): void {
  if (!decl.silent) throw new Error("Transition declaration must be silent.");
  if (!decl.reasonNotRequired) throw new Error("Transition declaration must not require a reason.");
  if (!decl.rotationPreserved) throw new Error("Transition must preserve fair rotation.");
  if (decl.visibilityReduced) throw new Error("Transition must not reduce visibility.");
  if (decl.inferredByPlatform) throw new Error("Transition must not be inferred.");
  if (decl.exposedToOtherUsers) throw new Error("Transition must not be exposed.");
  if (decl.externalActionAuthorized) throw new Error("Transition cannot authorize external action.");
}
