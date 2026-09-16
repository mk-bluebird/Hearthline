import { describe, it, expect } from 'vitest';
import { resolveRecipientPersona } from '../lib/persona.js';

describe('persona', () => {
  const now = '2025-01-15T12:00:00.000Z';

  it('rejects legal name field', () => {
    const result = resolveRecipientPersona({
      accountRef: 'local-account',
      recipientRef: 'conn-1',
      persona: { displayName: 'River', legalName: 'John Smith' },
      displayNameScope: { state: 'GRANTED' },
      profileScopes: {},
      now
    });

    expect(result.resolved).toBe(false);
    expect(result.reason).toContain('prohibited');
  });

  it('rejects recovery field', () => {
    const result = resolveRecipientPersona({
      accountRef: 'local-account',
      recipientRef: 'conn-1',
      persona: { displayName: 'River', recoveryStatus: 'active' },
      displayNameScope: { state: 'GRANTED' },
      profileScopes: {},
      now
    });

    expect(result.resolved).toBe(false);
  });

  it('rejects health field', () => {
    const result = resolveRecipientPersona({
      accountRef: 'local-account',
      recipientRef: 'conn-1',
      persona: { displayName: 'River', healthStatus: 'good' },
      displayNameScope: { state: 'GRANTED' },
      profileScopes: {},
      now
    });

    expect(result.resolved).toBe(false);
  });

  it('rejects persona linkage', () => {
    const result = resolveRecipientPersona({
      accountRef: 'local-account',
      recipientRef: 'conn-1',
      persona: { displayName: 'River', personaLinkage: 'conn-2' },
      displayNameScope: { state: 'GRANTED' },
      profileScopes: {},
      now
    });

    expect(result.resolved).toBe(false);
  });

  it('rejects lantern state', () => {
    const result = resolveRecipientPersona({
      accountRef: 'local-account',
      recipientRef: 'conn-1',
      persona: { displayName: 'River', lanternState: 'active' },
      displayNameScope: { state: 'GRANTED' },
      profileScopes: {},
      now
    });

    expect(result.resolved).toBe(false);
  });

  it('rejects trust fields', () => {
    const result = resolveRecipientPersona({
      accountRef: 'local-account',
      recipientRef: 'conn-1',
      persona: { displayName: 'River', trustScore: 5 },
      displayNameScope: { state: 'GRANTED' },
      profileScopes: {},
      now
    });

    expect(result.resolved).toBe(false);
  });

  it('requires active state and current granted scope', () => {
    const result = resolveRecipientPersona({
      accountRef: 'local-account',
      recipientRef: 'conn-1',
      persona: { displayName: 'River' },
      displayNameScope: { state: 'REVOKED' },
      profileScopes: {},
      now
    });

    expect(result.resolved).toBe(false);
    expect(result.reason).toContain('not granted');
  });

  it('resolves valid persona with granted scope', () => {
    const result = resolveRecipientPersona({
      accountRef: 'local-account',
      recipientRef: 'conn-1',
      persona: { displayName: 'River' },
      displayNameScope: { state: 'GRANTED' },
      profileScopes: {
        'conn-1': {
          broadArea: { state: 'GRANTED' },
          interests: { state: 'GRANTED' },
          alcoholFreePreference: { state: 'NO_GRANT' }
        }
      },
      now
    });

    expect(result.resolved).toBe(true);
    expect(result.persona.displayName).toBe('River');
    expect(result.persona.broadAreaVisible).toBe(true);
    expect(result.persona.interestsVisible).toBe(true);
    expect(result.persona.alcoholFreePreferenceVisible).toBe(false);
  });

  it('rejects invalid account reference', () => {
    const result = resolveRecipientPersona({
      accountRef: '',
      recipientRef: 'conn-1',
      persona: { displayName: 'River' },
      displayNameScope: { state: 'GRANTED' },
      profileScopes: {},
      now
    });

    expect(result.resolved).toBe(false);
  });

  it('rejects missing persona', () => {
    const result = resolveRecipientPersona({
      accountRef: 'local-account',
      recipientRef: 'conn-1',
      persona: null,
      displayNameScope: { state: 'GRANTED' },
      profileScopes: {},
      now
    });

    expect(result.resolved).toBe(false);
  });
});
