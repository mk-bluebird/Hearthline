import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { inspectPasskeyCapability } from '../lib/webauthn.js';

describe('webauthn', () => {
  let originalGlobalThis;
  let originalWindow;
  let originalNavigator;

  beforeEach(() => {
    // Save originals
    originalGlobalThis = globalThis;
    originalWindow = typeof window !== 'undefined' ? window : undefined;
    originalNavigator = typeof navigator !== 'undefined' ? navigator : undefined;
  });

  afterEach(() => {
    // Restore - tests run in Node environment so just clean up any mocks
    // The vitest environment handles restoration
  });

  it('unsupported environment returns all capability flags as false', async () => {
    // In Node.js without mocks, all should be false
    const result = await inspectPasskeyCapability();
    expect(result.webAuthnAvailable).toBe(false);
    expect(result.credentialsApiAvailable).toBe(false);
    expect(result.userVerifyingPlatformAuthenticatorAvailable).toBe(false);
    expect(result.secureContext).toBe(false);
    expect(result.checkedAt).toBeDefined();
    expect(result.externalActionAuthorized).toBe(false);
  });

  it('secure unsupported environment returns secureContext true and other capability flags false', async () => {
    // Mock a secure context without WebAuthn
    const mockGlobalThis = {
      isSecureContext: true,
      PublicKeyCredential: undefined
    };

    // Temporarily set up the mock
    Object.defineProperty(globalThis, 'isSecureContext', {
      value: true,
      writable: true,
      configurable: true
    });

    const result = await inspectPasskeyCapability();
    expect(result.secureContext).toBe(true);
    expect(result.webAuthnAvailable).toBe(false);
    expect(result.credentialsApiAvailable).toBe(false);
    expect(result.externalActionAuthorized).toBe(false);

    // Clean up
    delete globalThis.isSecureContext;
  });

  it('supported mock environment returns expected flags', async () => {
    // Mock full WebAuthn support
    const mockPublicKeyCredential = {
      isUserVerifyingPlatformAuthenticatorAvailable: async () => true
    };

    Object.defineProperty(globalThis, 'PublicKeyCredential', {
      value: mockPublicKeyCredential,
      writable: true,
      configurable: true
    });

    const result = await inspectPasskeyCapability();
    expect(result.webAuthnAvailable).toBe(true);
    expect(result.userVerifyingPlatformAuthenticatorAvailable).toBe(true);
    expect(result.externalActionAuthorized).toBe(false);

    // Clean up
    delete globalThis.PublicKeyCredential;
  });

  it('failed platform-authenticator check safely returns false', async () => {
    // Mock PublicKeyCredential that throws
    const mockPublicKeyCredential = {
      isUserVerifyingPlatformAuthenticatorAvailable: async () => {
        throw new Error('Not available');
      }
    };

    Object.defineProperty(globalThis, 'PublicKeyCredential', {
      value: mockPublicKeyCredential,
      writable: true,
      configurable: true
    });

    const result = await inspectPasskeyCapability();
    expect(result.webAuthnAvailable).toBe(true);
    expect(result.userVerifyingPlatformAuthenticatorAvailable).toBe(false);
    expect(result.externalActionAuthorized).toBe(false);

    // Clean up
    delete globalThis.PublicKeyCredential;
  });

  it('result always has externalActionAuthorized false', async () => {
    const result = await inspectPasskeyCapability();
    expect(result.externalActionAuthorized).toBe(false);
  });

  it('checkedAt is always present', async () => {
    const result = await inspectPasskeyCapability();
    expect(result.checkedAt).toBeDefined();
    expect(typeof result.checkedAt).toBe('string');
  });
});
