import { describe, it, expect } from 'vitest';
import {
  HearthlineComponent,
  isReadAllowed,
  assertReadAllowed,
  listAllowedReads,
  listForbiddenReads,
  validateComponentRegistry,
  assertValidComponentRegistry
} from '../lib/componentRegistry.js';

describe('componentRegistry', () => {
  it('validates successfully', () => {
    const result = validateComponentRegistry();
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(() => assertValidComponentRegistry()).not.toThrow();
  });

  it('allows required reads', () => {
    expect(isReadAllowed(HearthlineComponent.ANCHOR_LINE, HearthlineComponent.IDENTITY_CONTINUITY)).toBe(true);
    expect(isReadAllowed(HearthlineComponent.COMMON_GROUND, HearthlineComponent.IDENTITY_CONTINUITY)).toBe(true);
    expect(isReadAllowed(HearthlineComponent.HEARTH_CHAT, HearthlineComponent.COMMON_GROUND)).toBe(true);
    expect(isReadAllowed(HearthlineComponent.HEARTH_CHAT, HearthlineComponent.STEADY_PATH)).toBe(true);
    expect(isReadAllowed(HearthlineComponent.STEADY_PATH, HearthlineComponent.IDENTITY_CONTINUITY)).toBe(true);
    expect(isReadAllowed(HearthlineComponent.TRUE_COMPASS, HearthlineComponent.COMMON_GROUND)).toBe(true);
    expect(isReadAllowed(HearthlineComponent.TRUE_COMPASS, HearthlineComponent.STEADY_PATH)).toBe(true);
    expect(isReadAllowed(HearthlineComponent.LANTERN, HearthlineComponent.ANCHOR_LINE)).toBe(true);
    expect(isReadAllowed(HearthlineComponent.MEMORY_AID, HearthlineComponent.ANCHOR_LINE)).toBe(true);
    expect(isReadAllowed(HearthlineComponent.MEMORY_AID, HearthlineComponent.STEADY_PATH)).toBe(true);
    expect(isReadAllowed(HearthlineComponent.WAYPOINT, HearthlineComponent.COMMON_GROUND)).toBe(true);
    expect(isReadAllowed(HearthlineComponent.WAYPOINT, HearthlineComponent.STEADY_PATH)).toBe(true);
    expect(isReadAllowed(HearthlineComponent.RECOVERY_EXPRESSION, HearthlineComponent.COMMON_GROUND)).toBe(true);
    expect(isReadAllowed(HearthlineComponent.RECIPIENT_PERSONA, HearthlineComponent.COMMON_GROUND)).toBe(true);
    expect(isReadAllowed(HearthlineComponent.RECIPIENT_PERSONA, HearthlineComponent.IDENTITY_CONTINUITY)).toBe(true);
  });

  it('denies TRUE_COMPASS -> RECOVERY_EXPRESSION', () => {
    expect(isReadAllowed(HearthlineComponent.TRUE_COMPASS, HearthlineComponent.RECOVERY_EXPRESSION)).toBe(false);
    expect(() => assertReadAllowed(HearthlineComponent.TRUE_COMPASS, HearthlineComponent.RECOVERY_EXPRESSION)).toThrow();
  });

  it('denies TRUE_COMPASS -> RECIPIENT_PERSONA', () => {
    expect(isReadAllowed(HearthlineComponent.TRUE_COMPASS, HearthlineComponent.RECIPIENT_PERSONA)).toBe(false);
    expect(() => assertReadAllowed(HearthlineComponent.TRUE_COMPASS, HearthlineComponent.RECIPIENT_PERSONA)).toThrow();
  });

  it('denies LANTERN -> RECOVERY_EXPRESSION', () => {
    expect(isReadAllowed(HearthlineComponent.LANTERN, HearthlineComponent.RECOVERY_EXPRESSION)).toBe(false);
    expect(() => assertReadAllowed(HearthlineComponent.LANTERN, HearthlineComponent.RECOVERY_EXPRESSION)).toThrow();
  });

  it('denies LANTERN -> RECIPIENT_PERSONA', () => {
    expect(isReadAllowed(HearthlineComponent.LANTERN, HearthlineComponent.RECIPIENT_PERSONA)).toBe(false);
    expect(() => assertReadAllowed(HearthlineComponent.LANTERN, HearthlineComponent.RECIPIENT_PERSONA)).toThrow();
  });

  it('denies RECOVERY_EXPRESSION -> LANTERN', () => {
    expect(isReadAllowed(HearthlineComponent.RECOVERY_EXPRESSION, HearthlineComponent.LANTERN)).toBe(false);
    expect(() => assertReadAllowed(HearthlineComponent.RECOVERY_EXPRESSION, HearthlineComponent.LANTERN)).toThrow();
  });

  it('denies RECIPIENT_PERSONA -> LANTERN', () => {
    expect(isReadAllowed(HearthlineComponent.RECIPIENT_PERSONA, HearthlineComponent.LANTERN)).toBe(false);
    expect(() => assertReadAllowed(HearthlineComponent.RECIPIENT_PERSONA, HearthlineComponent.LANTERN)).toThrow();
  });

  it('AFTERLIGHT has no allowed reads', () => {
    const allowed = listAllowedReads(HearthlineComponent.AFTERLIGHT);
    expect(allowed).toEqual([]);
    for (const target of Object.values(HearthlineComponent)) {
      if (target !== HearthlineComponent.AFTERLIGHT) {
        expect(isReadAllowed(HearthlineComponent.AFTERLIGHT, target)).toBe(false);
      }
    }
  });

  it('throws on unknown component as source', () => {
    expect(() => isReadAllowed('UNKNOWN_COMPONENT', HearthlineComponent.ANCHOR_LINE)).toThrow(TypeError);
    expect(() => listAllowedReads('UNKNOWN_COMPONENT')).toThrow(TypeError);
  });

  it('throws on unknown component as target', () => {
    expect(() => isReadAllowed(HearthlineComponent.ANCHOR_LINE, 'UNKNOWN_COMPONENT')).toThrow(TypeError);
  });

  it('lists forbidden reads', () => {
    const forbidden = listForbiddenReads();
    expect(Array.isArray(forbidden)).toBe(true);
    expect(forbidden.length).toBeGreaterThan(0);
    const trueCompassRecovery = forbidden.find(
      f => f.source === HearthlineComponent.TRUE_COMPASS && f.target === HearthlineComponent.RECOVERY_EXPRESSION
    );
    expect(trueCompassRecovery).toBeDefined();
  });
});
