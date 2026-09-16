import { findForbiddenDataKeys, assertNoForbiddenData } from './forbiddenData.js';

const STORAGE_PREFIX = 'hearthline-starter:';
const STORAGE_KEY = `${STORAGE_PREFIX}state`;

function isStorageAvailable() {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

export function loadState(fallback = null) {
  if (!isStorageAvailable()) {
    return fallback;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw);
    // Validate against forbidden data
    const found = findForbiddenDataKeys(parsed);
    if (found.length > 0) {
      // Remove malformed stored value
      localStorage.removeItem(STORAGE_KEY);
      return fallback;
    }
    return parsed;
  } catch (e) {
    // Malformed JSON or other error - remove and return fallback
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (removeErr) {
      // Ignore removal errors
    }
    return fallback;
  }
}

export function saveState(state) {
  if (!isStorageAvailable()) {
    return false;
  }
  try {
    // Validate before saving
    assertNoForbiddenData(state, 'localStorage state');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    // Storage full, unavailable, or contains forbidden data
    return false;
  }
}

export function clearState() {
  if (!isStorageAvailable()) {
    return false;
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (e) {
    return false;
  }
}

export function createSafeLocalExport(state) {
  if (!state || typeof state !== 'object') {
    return {};
  }

  const safeKeys = [
    'pace',
    'lowEnergyMode',
    'manualCandidateReview',
    'neutralReminderLanguage',
    'adultConfirmed'
  ];

  const exported = {};

  for (const key of safeKeys) {
    if (state[key] !== undefined) {
      exported[key] = state[key];
    }
  }

  // Include generic activity-history event types and timestamps only
  if (state.activityHistory && Array.isArray(state.activityHistory)) {
    exported.activityHistory = state.activityHistory.map(item => {
      if (item && typeof item === 'object') {
        return {
          eventType: item.eventType,
          occurredAt: item.occurredAt
        };
      }
      return null;
    }).filter(item => item !== null && item.eventType !== undefined);
  }

  // Exclude drafts, messages, recipients, candidates, consent data, persona data,
  // audit internal references, and credential capability details
  return exported;
}

export { STORAGE_KEY, STORAGE_PREFIX };
