import { describe, it, expect } from 'vitest';
import { evaluateCandidatePresentation } from '../lib/matching.js';

describe('matching', () => {
  const viewer = {
    adultConfirmed: true,
    age: 38,
    ageRange: [30, 55],
    intents: ['Dating and romance', 'Friendship'],
    interests: ['Gardening', 'Live music', 'Cooking'],
    pace: 'SLOWER',
    broadArea: 'Central Phoenix'
  };

  const candidate = {
    candidateRef: 'candidate-avery',
    displayName: 'Avery',
    age: 41,
    broadArea: 'Central Phoenix',
    intents: ['Dating and romance', 'Friendship'],
    interests: ['Birdwatching', 'Jazz', 'Farmers markets'],
    pace: 'SLOWER',
    about: 'Test bio'
  };

  it('rejects prohibited recovery fields', () => {
    const result = evaluateCandidatePresentation({
      viewer,
      candidate,
      visibleFields: { recoveryStatus: true }
    });

    expect(result.presented).toBe(false);
    expect(result.reason).toContain('not supported');
  });

  it('rejects prohibited health fields', () => {
    const result = evaluateCandidatePresentation({
      viewer,
      candidate,
      visibleFields: { healthStatus: true }
    });

    expect(result.presented).toBe(false);
  });

  it('rejects prohibited popularity fields', () => {
    const result = evaluateCandidatePresentation({
      viewer,
      candidate,
      visibleFields: { popularity: 5 }
    });

    expect(result.presented).toBe(false);
  });

  it('returns explanations without scores', () => {
    const result = evaluateCandidatePresentation({
      viewer,
      candidate,
      visibleFields: {}
    });

    expect(result.presented).toBe(true);
    expect(result.explanations.length).toBeGreaterThan(0);
    expect(result).not.toHaveProperty('score');
    expect(result).not.toHaveProperty('percentage');
    expect(result).not.toHaveProperty('compatibility');
  });

  it('includes intent overlap in explanations', () => {
    const result = evaluateCandidatePresentation({
      viewer,
      candidate,
      visibleFields: {}
    });

    expect(result.explanations).toContain('You selected compatible connection intentions.');
  });

  it('includes pace match in explanations', () => {
    const result = evaluateCandidatePresentation({
      viewer,
      candidate,
      visibleFields: {}
    });

    expect(result.explanations).toContain('You both prefer a slower conversation pace.');
  });

  it('includes broad area overlap in explanations', () => {
    const result = evaluateCandidatePresentation({
      viewer,
      candidate,
      visibleFields: {}
    });

    expect(result.explanations).toContain('Your broad areas overlap.');
  });

  it('rejects when adult is not confirmed', () => {
    const result = evaluateCandidatePresentation({
      viewer: { ...viewer, adultConfirmed: false },
      candidate,
      visibleFields: {}
    });

    expect(result.presented).toBe(false);
  });

  it('rejects when age is out of range', () => {
    const result = evaluateCandidatePresentation({
      viewer,
      candidate: { ...candidate, age: 25 },
      visibleFields: {}
    });

    expect(result.presented).toBe(false);
  });
});
