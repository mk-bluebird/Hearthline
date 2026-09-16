const VALID_EVENT_TYPES = Object.freeze([
  'PRIVACY_CHOICES_REVIEWED',
  'PRIVACY_SCOPE_UPDATED',
  'UNSENT_DRAFT_INVALIDATED',
  'PACE_UPDATED',
  'CONNECTION_ACTIVITY_PAUSED',
  'CONNECTION_ACTIVITY_RESUMED',
  'PASSKEY_CAPABILITY_REVIEWED',
  'MESSAGE_PREVIEW_PAUSED',
  'OPTIONAL_MEETING_PLANNING_OPENED',
  'RECIPIENT_DISPLAY_NAME_UPDATED',
  'LOCAL_DATA_RESET',
  'LOCAL_EXPORT_PREVIEWED'
]);

const REJECTED_PAYLOAD_FIELDS = Object.freeze([
  'messageText',
  'draftText',
  'recipientName',
  'recipientDisplayName',
  'recipientRef',
  'phoneNumber',
  'credentialMaterial',
  'recoveryContext',
  'personaLinkage',
  'protectedFieldName',
  'trustValue',
  'reputationValue',
  'profileText',
  'rawBrowserPayload',
  'legalName',
  'legalNameRef',
  'recoveryStatus',
  'recoveryHistory',
  'recoveryStage',
  'treatmentHistory',
  'substanceUseHistory',
  'diagnosis',
  'healthStatus',
  'healthContext',
  'traumaHistory',
  'ptsdStatus',
  'trustScore',
  'reputationScore',
  'compatibilityScore',
  'popularity',
  'responseRate',
  'responseLatency',
  'socialGraph',
  'criminalHistory',
  'financialStatus',
  'employmentStatus',
  'housingStatus',
  'lanternState',
  'credentialId',
  'privateKey',
  'recoveryCode',
  'recoveryShare',
  'oauthAccessToken',
  'oauthRefreshToken',
  'attestationObject',
  'biometricTemplate'
]);

const EVENT_TEMPLATES = Object.freeze({
  'PRIVACY_CHOICES_REVIEWED': 'You reviewed privacy choices.',
  'PRIVACY_SCOPE_UPDATED': 'You updated a privacy scope.',
  'UNSENT_DRAFT_INVALIDATED': 'An unsent draft became unavailable under your current privacy choices.',
  'PACE_UPDATED': 'You changed your pace.',
  'CONNECTION_ACTIVITY_PAUSED': 'You paused connection activity.',
  'CONNECTION_ACTIVITY_RESUMED': 'You resumed connection activity.',
  'PASSKEY_CAPABILITY_REVIEWED': 'You reviewed browser passkey capability.',
  'MESSAGE_PREVIEW_PAUSED': 'A message-preview action was briefly paused.',
  'OPTIONAL_MEETING_PLANNING_OPENED': 'You opened optional meeting-planning tools.',
  'RECIPIENT_DISPLAY_NAME_UPDATED': 'You updated a recipient display name.',
  'LOCAL_DATA_RESET': 'You reset local demo data.',
  'LOCAL_EXPORT_PREVIEWED': 'You previewed a local data export.'
});

function findForbiddenDataKeys(value, seen) {
  if (value === null || typeof value !== 'object') {
    return [];
  }
  if (!seen) {
    seen = new WeakSet();
  }
  if (seen.has(value)) {
    throw new TypeError('Circular reference detected');
  }
  seen.add(value);

  const found = new Set();
  const forbiddenSet = new Set(REJECTED_PAYLOAD_FIELDS);

  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = findForbiddenDataKeys(item, seen);
      for (const key of nested) {
        found.add(key);
      }
    }
  } else {
    for (const key of Object.keys(value)) {
      if (forbiddenSet.has(key)) {
        found.add(key);
      }
      const prop = value[key];
      if (typeof prop === 'object' && prop !== null) {
        const nested = findForbiddenDataKeys(prop, seen);
        for (const k of nested) {
          found.add(k);
        }
      }
    }
  }
  return [...found];
}

export function createAuditEvent({ eventType, actorRole, occurredAt, userFacingMessage }) {
  if (!VALID_EVENT_TYPES.includes(eventType)) {
    throw new Error(`Unknown event type: ${eventType}`);
  }

  if (!actorRole || typeof actorRole !== 'string') {
    throw new Error('Actor role is required');
  }

  if (userFacingMessage !== undefined) {
    throw new Error('Caller-provided message text is rejected. Use allowlisted templates only.');
  }

  return {
    eventRef: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    eventType,
    actorRole,
    occurredAt: occurredAt || new Date().toISOString(),
    userFacingMessage: EVENT_TEMPLATES[eventType],
    externalActionAuthorized: false
  };
}

export function getEventTemplate(eventType) {
  return EVENT_TEMPLATES[eventType] || 'An activity occurred.';
}

export { VALID_EVENT_TYPES, EVENT_TEMPLATES };
