import { describe, it, expect } from 'vitest';
import { createMessageSuggestion } from '../lib/messageAssistant.js';

describe('messageAssistant', () => {
  it('generates a low-pressure opening', () => {
    const result = createMessageSuggestion({
      intent: 'low-pressure-opening',
      recipientDisplayName: 'Avery',
      visiblePreferences: {},
      currentScopes: {}
    });

    expect(result.text).toContain('Avery');
    expect(result.text).toContain('relaxed');
    expect(result.protectedFields).toEqual([]);
  });

  it('generates a warm rephrase', () => {
    const result = createMessageSuggestion({
      intent: 'warm-rephrase',
      recipientDisplayName: 'Jordan',
      visiblePreferences: {},
      currentScopes: {}
    });

    expect(result.text).toContain('Jordan');
    expect(result.text).toContain('nice to connect');
  });

  it('generates a boundary statement', () => {
    const result = createMessageSuggestion({
      intent: 'boundary-statement',
      recipientDisplayName: 'Morgan',
      visiblePreferences: {},
      currentScopes: {}
    });

    expect(result.text).toContain('comfortable pace');
  });

  it('generates a pause statement', () => {
    const result = createMessageSuggestion({
      intent: 'pause-statement',
      recipientDisplayName: 'Sam',
      visiblePreferences: {},
      currentScopes: {}
    });

    expect(result.text).toContain('step back');
  });

  it('alcohol-free wording is unavailable without recipient scope', () => {
    const result = createMessageSuggestion({
      intent: 'alcohol-free-wording',
      recipientDisplayName: 'Avery',
      visiblePreferences: {
        recipientRef: 'conn-1',
        alcoholFreePreference: false
      },
      currentScopes: {
        'conn-1': {
          alcoholFreePreference: { state: 'NO_GRANT' }
        }
      }
    });

    expect(result.error).toBeTruthy();
    expect(result.text).toBe('');
  });

  it('alcohol-free wording is available with recipient scope', () => {
    const result = createMessageSuggestion({
      intent: 'alcohol-free-wording',
      recipientDisplayName: 'Avery',
      visiblePreferences: {
        recipientRef: 'conn-1',
        alcoholFreePreference: true
      },
      currentScopes: {
        'conn-1': {
          alcoholFreePreference: { state: 'GRANTED' }
        }
      }
    });

    expect(result.text).toContain('alcohol-free');
    expect(result.protectedFields).toContain('alcoholFreePreference');
  });

  it('does not infer or mention recovery status', () => {
    const result = createMessageSuggestion({
      intent: 'low-pressure-opening',
      recipientDisplayName: 'Avery',
      visiblePreferences: {},
      currentScopes: {}
    });

    expect(result.text.toLowerCase()).not.toContain('recovery');
    expect(result.text.toLowerCase()).not.toContain('sobriety');
    expect(result.text.toLowerCase()).not.toContain('treatment');
  });

  it('returns error for unknown intent', () => {
    const result = createMessageSuggestion({
      intent: 'unknown-type',
      recipientDisplayName: 'Avery',
      visiblePreferences: {},
      currentScopes: {}
    });

    expect(result.error).toBeTruthy();
  });
});
