import { describe, it, expect } from 'vitest';
import {
  FORBIDDEN_DATA_KEYS,
  findForbiddenDataKeys,
  assertNoForbiddenData
} from '../lib/forbiddenData.js';

describe('forbiddenData', () => {
  it('safe nested data passes', () => {
    const safe = {
      displayName: 'Alex',
      age: 30,
      interests: ['hiking', 'reading'],
      nested: { pace: 'SLOWER' }
    };
    const found = findForbiddenDataKeys(safe);
    expect(found).toEqual([]);
    expect(() => assertNoForbiddenData(safe, 'test')).not.toThrow();
  });

  it('a direct forbidden key is found', () => {
    const data = { trustScore: 85, displayName: 'Alex' };
    const found = findForbiddenDataKeys(data);
    expect(found).toContain('trustScore');
    expect(found.length).toBe(1);
  });

  it('a nested forbidden key is found', () => {
    const data = {
      profile: {
        displayName: 'Alex',
        healthStatus: 'good'
      }
    };
    const found = findForbiddenDataKeys(data);
    expect(found).toContain('healthStatus');
  });

  it('a forbidden key inside an array is found', () => {
    const data = {
      users: [
        { displayName: 'Alex' },
        { recoveryStatus: 'active' }
      ]
    };
    const found = findForbiddenDataKeys(data);
    expect(found).toContain('recoveryStatus');
  });

  it('duplicate forbidden keys are returned once', () => {
    const data = {
      a: { trustScore: 10 },
      b: { trustScore: 20 },
      c: { reputationScore: 5 }
    };
    const found = findForbiddenDataKeys(data);
    expect(found).toContain('trustScore');
    expect(found).toContain('reputationScore');
    expect(found.length).toBe(2);
  });

  it('assertNoForbiddenData throws with the supplied label', () => {
    const data = { diagnosis: 'anxiety' };
    expect(() => assertNoForbiddenData(data, 'userProfile'))
      .toThrow('Forbidden data keys found in userProfile: diagnosis');
  });

  it('circular data throws a clear error', () => {
    const circular = { name: 'root' };
    circular.self = circular;
    expect(() => findForbiddenDataKeys(circular)).toThrow(TypeError);
    expect(() => findForbiddenDataKeys(circular)).toThrow('Circular reference');
  });

  it('handles null and primitives safely', () => {
    expect(findForbiddenDataKeys(null)).toEqual([]);
    expect(findForbiddenDataKeys(undefined)).toEqual([]);
    expect(findForbiddenDataKeys('string')).toEqual([]);
    expect(findForbiddenDataKeys(123)).toEqual([]);
    expect(findForbiddenDataKeys(true)).toEqual([]);
  });

  it('handles empty objects and arrays', () => {
    expect(findForbiddenDataKeys({})).toEqual([]);
    expect(findForbiddenDataKeys([])).toEqual([]);
  });
});
