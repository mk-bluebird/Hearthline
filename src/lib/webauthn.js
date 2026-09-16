export async function inspectPasskeyCapability() {
  const result = {
    webAuthnAvailable: false,
    credentialsApiAvailable: false,
    userVerifyingPlatformAuthenticatorAvailable: false,
    secureContext: false,
    checkedAt: new Date().toISOString()
  };

  try {
    // Check secure context
    result.secureContext = typeof window !== 'undefined' && window.isSecureContext === true;

    // Check PublicKeyCredential
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      result.webAuthnAvailable = true;
    }

    // Check navigator.credentials
    if (typeof navigator !== 'undefined' && navigator.credentials) {
      result.credentialsApiAvailable = true;
    }

    // Check user-verifying platform authenticator
    if (
      typeof window !== 'undefined' &&
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    ) {
      try {
        const isAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
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
