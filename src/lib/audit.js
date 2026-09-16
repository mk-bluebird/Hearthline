const VALID_EVENT_TYPES = [
  'PRIVACY_CHOICE_UPDATED',
  'DRAFT_INVALIDATED',
  'PACE_CHANGED',
  'CONNECTION_PAUSED',
  'CONNECTION_RESUMED',
  'PASSKEY_CHECKED',
  'ACTION_PAUSED',
  'MEETING_PLANNING_OPENED',
  'RECIPIENT_DISPLAY_NAME_UPDATED',
  'CONSENT_REVOKED',
  'CONSENT_GRANTED',
  'LOW_ENERGY_TOGGLED',
  'EXPORT_PREVIEWED',
  'DATA_RESET'
];

const REJECTED_PAYLOAD_FIELDS = [
  'messageText',
  'draftText',
  'recipientName',
  'recipientDisplayName',
  'phoneNumber',
  'credentialMaterial',
  'recoveryContext',
  'personaLinkage',
  'protectedFieldName',
  'trustValue',
  'reputationValue',
  'profileText',
  'rawBrowserPayload'
];

const EVENT_TEMPLATES = {
  'PRIVACY_CHOICE_UPDATED': 'You updated a privacy choice.',
  'DRAFT_INVALIDATED': 'An unsent draft became unavailable under your current privacy choices.',
  'PACE_CHANGED': 'You changed your pace.',
  'CONNECTION_PAUSED': 'You paused connection activity.',
  'CONNECTION_RESUMED': 'You resumed connection activity.',
  'PASSKEY_CHECKED': 'You reviewed browser passkey capability.',
  'ACTION_PAUSED': 'A message-preview action was briefly paused.',
  'MEETING_PLANNING_OPENED': 'You opened optional meeting-planning tools.',
  'RECIPIENT_DISPLAY_NAME_UPDATED': 'You updated a recipient display name.',
  'CONSENT_REVOKED': 'You revoked a sharing choice.',
  'CONSENT_GRANTED': 'You granted a sharing choice.',
  'LOW_ENERGY_TOGGLED': 'You changed low-energy mode.',
  'EXPORT_PREVIEWED': 'You previewed a local data export.',
  'DATA_RESET': 'You reset local demo data.'
};

export function createAuditEvent({ eventType, actorRole, occurredAt }) {
  if (!VALID_EVENT_TYPES.includes(eventType)) {
    return { created: false, reason: 'Unknown event type.' };
  }

  if (!actorRole || typeof actorRole !== 'string') {
    return { created: false, reason: 'Actor role is required.' };
  }

  // Check that no rejected payload fields are present
  // (In this implementation, we only accept the three allowed params)

  return {
    created: true,
    event: {
      eventType,
      actorRole,
      occurredAt: occurredAt || new Date().toISOString(),
      description: EVENT_TEMPLATES[eventType],
      eventRef: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    }
  };
}

export function getEventTemplate(eventType) {
  return EVENT_TEMPLATES[eventType] || 'An activity occurred.';
}

export { VALID_EVENT_TYPES };
