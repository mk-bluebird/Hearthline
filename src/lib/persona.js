const REJECTED_FIELDS = [
  'legalName',
  'recoveryStatus',
  'recoveryDuration',
  'treatmentHistory',
  'diagnosis',
  'traumaHistory',
  'healthStatus',
  'externalIdentity',
  'personaLinkage',
  'lanternState',
  'trustScore',
  'reputationScore',
  'matchHistory',
  'accountAge',
  'credentialData',
  'otherPersonaRef'
];

export function resolveRecipientPersona({ accountRef, recipientRef, persona, displayNameScope, profileScopes, now }) {
  // Validate references
  if (!accountRef || typeof accountRef !== 'string') {
    return { resolved: false, reason: 'Invalid account reference.' };
  }

  if (!recipientRef || typeof recipientRef !== 'string') {
    return { resolved: false, reason: 'Invalid recipient reference.' };
  }

  if (!persona) {
    return { resolved: false, reason: 'No persona available.' };
  }

  // Check for rejected fields in persona
  for (const field of REJECTED_FIELDS) {
    if (persona[field] !== undefined) {
      return { resolved: false, reason: `Persona contains a prohibited field: ${field}.` };
    }
  }

  // Check display name scope
  if (displayNameScope && displayNameScope.state !== 'GRANTED') {
    return { resolved: false, reason: 'Display name scope is not granted.' };
  }

  // Build resolved persona with only allowed fields
  const resolved = {
    accountRef,
    recipientRef,
    displayName: persona.displayName || null,
    broadAreaVisible: false,
    interestsVisible: false,
    alcoholFreePreferenceVisible: false,
    resolvedAt: now || new Date().toISOString()
  };

  // Check profile scopes for additional fields
  if (profileScopes && profileScopes[recipientRef]) {
    const scopes = profileScopes[recipientRef];

    if (scopes.broadArea && scopes.broadArea.state === 'GRANTED') {
      resolved.broadAreaVisible = true;
    }

    if (scopes.interests && scopes.interests.state === 'GRANTED') {
      resolved.interestsVisible = true;
    }

    if (scopes.alcoholFreePreference && scopes.alcoholFreePreference.state === 'GRANTED') {
      resolved.alcoholFreePreferenceVisible = true;
    }
  }

  return {
    resolved: true,
    persona: resolved
  };
}
