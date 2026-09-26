export interface SiblingDeclaration {
  readonly siblingRef: string;
  readonly declaringParticipant: string;
  readonly siblingParticipant: string;
  readonly declaredAt: string;
  readonly bilateral: true;
  readonly exclusive: false;
  readonly ranked: false;
  readonly romanticImplied: false;
  readonly visibleToOthers: boolean;
  readonly externalActionAuthorized: false;
}

export function createSiblingDeclaration(input: {
  siblingRef: string;
  declaringParticipant: string;
  siblingParticipant: string;
  declaredAt?: string;
  visibleToOthers?: boolean;
}): SiblingDeclaration {
  if (input.declaringParticipant === input.siblingParticipant) {
    throw new Error("A participant cannot declare themselves as a sibling.");
  }

  const declaredAt = input.declaredAt ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(declaredAt))) {
    throw new TypeError("declaredAt must be a valid ISO 8601 date-time.");
  }

  return Object.freeze({
    siblingRef: input.siblingRef,
    declaringParticipant: input.declaringParticipant,
    siblingParticipant: input.siblingParticipant,
    declaredAt,
    bilateral: true,
    exclusive: false,
    ranked: false,
    romanticImplied: false,
    visibleToOthers: input.visibleToOthers === true,
    externalActionAuthorized: false
  });
}
