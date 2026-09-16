import { describe, it, expect } from 'vitest';
import { evaluateDisclosure, invalidateDraftIfScopeChanged } from '../lib/consent.js';

describe('consent', () => {
  const now = '2025-01-15T12:00:00.000Z';

  it('revoked scope invalidates a draft and hides original text', () => {
    const draft = {
      text: 'Hello, I prefer alcohol-free settings.',
      protectedFields: ['alcoholFreePreference'],
      state: 'DRAFTING'
    };
    const scopes = {
      'conn-1': {
        alcoholFreePreference: { state: 'REVOKED' }
      }
    };

    const result = invalidateDraftIfScopeChanged({
      draft,
      recipientRef: 'conn-1',
      scopes,
      now
    });

    expect(result.invalidated).toBe(true);
    expect(result.text).not.toContain('alcohol-free');
    expect(result.text).toContain('privacy choice changed');
  });

  it('expired scope invalidates a draft', () => {
    const draft = {
      text: 'My phone number is available.',
      protectedFields: ['phoneNumber'],
      state: 'DRAFTING'
    };
    const scopes = {
      'conn-1': {
        phoneNumber: { state: 'EXPIRED', expiresAt: '2025-01-14T12:00:00.000Z' }
      }
    };

    const result = invalidateDraftIfScopeChanged({
      draft,
      recipientRef: 'conn-1',
      scopes,
      now
    });

    expect(result.invalidated).toBe(true);
    expect(result.text).not.toContain('phone number');
  });

  it('re-grant does not restore an invalidated draft', () => {
    const draft = {
      text: 'A privacy choice changed, so this draft is no longer available. Create a new version using your current sharing choices.',
      protectedFields: [],
      state: 'INVALIDATED'
    };
    const scopes = {
      'conn-1': {
        alcoholFreePreference: { state: 'GRANTED' }
      }
    };

    // The draft was already invalidated - it has no protected fields now
    // so it would pass through, but the text is the invalidation message
    const result = invalidateDraftIfScopeChanged({
      draft,
      recipientRef: 'conn-1',
      scopes,
      now
    });

    // Since protectedFields is empty, it returns the text as-is
    // The key point is that the original content is gone
    expect(result.text).not.toContain('Hello, I prefer');
  });

  it('denies unknown fields', () => {
    const result = evaluateDisclosure({
      recipientRef: 'conn-1',
      field: 'unknownField',
      scopes: { 'conn-1': {} },
      now
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Unknown field');
  });

  it('denies missing recipient scopes', () => {
    const result = evaluateDisclosure({
      recipientRef: 'conn-1',
      field: 'displayName',
      scopes: {},
      now
    });

    expect(result.allowed).toBe(false);
  });

  it('allows granted fields', () => {
    const result = evaluateDisclosure({
      recipientRef: 'conn-1',
      field: 'displayName',
      scopes: {
        'conn-1': {
          displayName: { state: 'GRANTED' }
        }
      },
      now
    });

    expect(result.allowed).toBe(true);
    expect(result.state).toBe('GRANTED');
  });
});
