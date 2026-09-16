const FORBIDDEN_DATA_KEYS = Object.freeze([
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

const FORBIDDEN_KEY_SET = new Set(FORBIDDEN_DATA_KEYS);

function findForbiddenDataKeys(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') {
    return [];
  }

  if (seen.has(value)) {
    throw new TypeError('Circular reference detected in data structure');
  }
  seen.add(value);

  const found = new Set();

  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = findForbiddenDataKeys(item, seen);
      for (const key of nested) {
        found.add(key);
      }
    }
  } else {
    for (const key of Object.keys(value)) {
      if (FORBIDDEN_KEY_SET.has(key)) {
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

function assertNoForbiddenData(value, label) {
  const found = findForbiddenDataKeys(value);
  if (found.length > 0) {
    throw new Error(`Forbidden data keys found in ${label}: ${found.join(', ')}`);
  }
}

export {
  FORBIDDEN_DATA_KEYS,
  findForbiddenDataKeys,
  assertNoForbiddenData
};
