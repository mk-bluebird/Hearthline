import { useState, useEffect } from 'react';
import { findForbiddenDataKeys } from '../lib/forbiddenData.js';

const STORAGE_PREFIX = 'hearthline-starter:';

export function useLocalStorage(key, initialValue) {
  const prefixedKey = key.startsWith(STORAGE_PREFIX) ? key : `${STORAGE_PREFIX}${key}`;

  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = typeof localStorage !== 'undefined' ? localStorage.getItem(prefixedKey) : null;
      if (!item) {
        return initialValue;
      }
      const parsed = JSON.parse(item);
      // Validate against forbidden data
      const found = findForbiddenDataKeys(parsed);
      if (found.length > 0) {
        // Remove invalid data
        try {
          localStorage.removeItem(prefixedKey);
        } catch (removeErr) {
          // Ignore removal errors
        }
        return initialValue;
      }
      return parsed;
    } catch (e) {
      // Malformed JSON or localStorage unavailable
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(prefixedKey);
        }
      } catch (removeErr) {
        // Ignore removal errors
      }
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(prefixedKey, JSON.stringify(storedValue));
      }
    } catch (e) {
      // Storage unavailable or full
    }
  }, [prefixedKey, storedValue]);

  return [storedValue, setStoredValue];
}

export { STORAGE_PREFIX };
