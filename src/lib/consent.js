const VALID_STATES = ['GRANTED', 'NO_GRANT', 'REVOKED', 'EXPIRED'];
const VALID_FIELDS = [
  'displayName',
  'broadArea',
  'interests',
  'alcoholFreePreference',
  'phoneNumber'
];

export function evaluateDisclosure({ recipientRef, field, scopes, now }) {
  if (!recipientRef || typeof recipientRef !== 'string') {
    return { allowed: false, state: 'DENIED', reason: 'Missing recipient reference.', evaluatedAt: now || new Date().toISOString() };
  }

  if (!VALID_FIELDS.includes(field)) {
    return { allowed: false, state: 'DENIED', reason: 'Unknown field.', evaluatedAt: now || new Date().toISOString() };
  }

  if (!scopes || !scopes[recipientRef]) {
    return { allowed: false, state: 'DENIED', reason: 'No scopes found for this recipient.', evaluatedAt: now || new Date().toISOString() };
  }

  const recipientScopes = scopes[recipientRef];
  const fieldScope = recipientScopes[field];

  if (!fieldScope) {
    return { allowed: false, state: 'DENIED', reason: 'No scope entry for this field.', evaluatedAt: now || new Date().toISOString() };
  }

  const state = fieldScope.state;

  if (!VALID_STATES.includes(state)) {
    return { allowed: false, state: 'DENIED', reason: 'Invalid scope state.', evaluatedAt: now || new Date().toISOString() };
  }

  if (state === 'EXPIRED') {
    const expiresAt = fieldScope.expiresAt;
    if (expiresAt && new Date(expiresAt) <= new Date(now || new Date().toISOString())) {
      return { allowed: false, state: 'EXPIRED', reason: 'This scope has expired.', evaluatedAt: now || new Date().toISOString() };
    }
  }

  if (state === 'REVOKED') {
    return { allowed: false, state: 'REVOKED', reason: 'This scope has been revoked.', evaluatedAt: now || new Date().toISOString() };
  }

  if (state === 'NO_GRANT') {
    return { allowed: false, state: 'NO_GRANT', reason: 'This field has not been granted.', evaluatedAt: now || new Date().toISOString() };
  }

  if (state === 'GRANTED') {
    return { allowed: true, state: 'GRANTED', reason: 'Field is shared with this connection.', evaluatedAt: now || new Date().toISOString() };
  }

  return { allowed: false, state: 'DENIED', reason: 'Unable to evaluate.', evaluatedAt: now || new Date().toISOString() };
}

export function invalidateDraftIfScopeChanged({ draft, recipientRef, scopes, now }) {
  if (!draft || !draft.text) {
    return { text: '', invalidated: false };
  }

  if (!draft.protectedFields || draft.protectedFields.length === 0) {
    return { text: draft.text, invalidated: false };
  }

  const currentTime = now || new Date().toISOString();

  for (const field of draft.protectedFields) {
    const result = evaluateDisclosure({ recipientRef, field, scopes, now: currentTime });
    if (!result.allowed) {
      return {
        text: 'A privacy choice changed, so this draft is no longer available. Create a new version using your current sharing choices.',
        invalidated: true
      };
    }
  }

  return { text: draft.text, invalidated: false };
}
