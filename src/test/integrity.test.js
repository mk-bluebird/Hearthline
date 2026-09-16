import { describe, it, expect } from 'vitest';
import { evaluateMessagePreviewIntegrity } from '../lib/integrity.js';

describe('integrity', () => {
  const now = '2025-01-15T12:00:00.000Z';

  it('returns NORMAL for few attempts', () => {
    const attempts = [
      '2025-01-15T11:59:50.000Z',
      '2025-01-15T11:59:55.000Z'
    ];

    const result = evaluateMessagePreviewIntegrity({ attempts, now });
    expect(result.state).toBe('NORMAL');
  });

  it('returns ELEVATED_SCRUTINY for moderate burst', () => {
    const attempts = [
      '2025-01-15T11:59:50.000Z',
      '2025-01-15T11:59:51.000Z',
      '2025-01-15T11:59:52.000Z',
      '2025-01-15T11:59:53.000Z'
    ];

    const result = evaluateMessagePreviewIntegrity({ attempts, now });
    expect(result.state).toBe('ELEVATED_SCRUTINY');
  });

  it('returns RATE_LIMITED for large burst', () => {
    const attempts = [
      '2025-01-15T11:59:50.000Z',
      '2025-01-15T11:59:51.000Z',
      '2025-01-15T11:59:52.000Z',
      '2025-01-15T11:59:53.000Z',
      '2025-01-15T11:59:54.000Z',
      '2025-01-15T11:59:55.000Z',
      '2025-01-15T11:59:56.000Z'
    ];

    const result = evaluateMessagePreviewIntegrity({ attempts, now });
    expect(result.state).toBe('RATE_LIMITED');
  });

  it('does not produce a person score', () => {
    const attempts = [
      '2025-01-15T11:59:50.000Z',
      '2025-01-15T11:59:51.000Z'
    ];

    const result = evaluateMessagePreviewIntegrity({ attempts, now });
    expect(result).not.toHaveProperty('personScore');
    expect(result).not.toHaveProperty('trustScore');
    expect(result).not.toHaveProperty('reputationScore');
  });

  it('uses non-shaming explanation text', () => {
    const attempts = [
      '2025-01-15T11:59:50.000Z',
      '2025-01-15T11:59:51.000Z',
      '2025-01-15T11:59:52.000Z',
      '2025-01-15T11:59:53.000Z',
      '2025-01-15T11:59:54.000Z',
      '2025-01-15T11:59:55.000Z',
      '2025-01-15T11:59:56.000Z'
    ];

    const result = evaluateMessagePreviewIntegrity({ attempts, now });
    expect(result.explanation).not.toContain('suspicious');
    expect(result.explanation).not.toContain('untrusted');
    expect(result.explanation).not.toContain('risky');
    expect(result.explanation).not.toContain('abnormal');
    expect(result.explanation).toContain('account remains available');
  });

  it('ignores attempts outside the time window', () => {
    const attempts = [
      '2025-01-15T11:00:00.000Z', // outside window
      '2025-01-15T11:00:01.000Z', // outside window
      '2025-01-15T11:59:55.000Z'  // inside window
    ];

    const result = evaluateMessagePreviewIntegrity({ attempts, now });
    expect(result.state).toBe('NORMAL');
    expect(result.attemptsInWindow).toBe(1);
  });
});
