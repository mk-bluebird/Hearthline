export async function inspectPasskeyCapability() {
  const result = {
    webAuthnAvailable: false,
    credentialsApiAvailable: false,
    userVerifyingPlatformAuthenticatorAvailable: false,
    secureContext: false,
    checkedAt: new Date().toISOString(),
    externalActionAuthorized: false
  };

  try {
    // Check secure context
    if (typeof globalThis !== 'undefined' && globalThis.isSecureContext !== undefined) {
      result.secureContext = globalThis.isSecureContext === true;
    } else if (typeof window !== 'undefined' && window.isSecureContext !== undefined) {
      result.secureContext = window.isSecureContext === true;
    }

    // Check PublicKeyCredential
    if (typeof globalThis !== 'undefined' && globalThis.PublicKeyCredential) {
      result.webAuthnAvailable = true;
    } else if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      result.webAuthnAvailable = true;
    }

    // Check navigator.credentials
    if (typeof navigator !== 'undefined' && navigator.credentials) {
      result.credentialsApiAvailable = true;
    }

    // Check user-verifying platform authenticator
    const platformAuthAvailCheck = 
      (typeof globalThis !== 'undefined' && globalThis.PublicKeyCredential && typeof globalThis.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') ||
      (typeof window !== 'undefined' && window.PublicKeyCredential && typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function');

    if (platformAuthAvailCheck) {
      try {
        const checkFn = (typeof globalThis !== 'undefined' && globalThis.PublicKeyCredential && globalThis.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) ||
                        (typeof window !== 'undefined' && window.PublicKeyCredential && window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable);
        const isAvailable = await checkFn();
        result.userVerifyingPlatformAuthenticatorAvailable = isAvailable === true;
      } catch (e) {
        result.userVerifyingPlatformAuthenticatorAvailable = false;
      }
    }
  } catch (error) {
    // Safely handle any unexpected errors
    result.checkedAt = new Date().toISOString();
  }

  return result;
}
