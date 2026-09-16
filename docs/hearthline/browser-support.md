# Hearthline Browser Support

## Target Environment

Hearthline Starter targets modern evergreen browsers with the following baseline capabilities:

- **localStorage:** Required for local state persistence
- **ES Modules:** Required for JavaScript module loading
- **Fetch API:** Available but not used by application logic
- **Modern CSS:** Flexbox, Grid, CSS custom properties
- **React 18:** Required for component rendering

## Supported Browsers

The application is designed to work on recent versions of:

- Google Chrome (last 2 versions)
- Mozilla Firefox (last 2 versions)
- Microsoft Edge (last 2 versions)
- Safari (last 2 versions)

## localStorage Requirement

The application requires localStorage to be:
- Available (not disabled by user or browser settings)
- Writable (not in private/incognito mode with storage blocked)
- Sufficient capacity (typically 5MB minimum)

If localStorage is unavailable:
- The application gracefully handles the limitation
- Fallback values are used for state
- Users may see reduced functionality
- No data persists between sessions

## Secure Context and WebAuthn Capability Inspection

The application includes a WebAuthn capability inspection feature (`webauthn.js`) that:

### What It Does
- Checks if the browser is in a secure context (`isSecureContext`)
- Checks if `PublicKeyCredential` API exists
- Checks if `navigator.credentials` API exists
- Checks if user-verifying platform authenticator is available

### What It Does NOT Do
- Does NOT create any passkey or credential
- Does NOT call `navigator.credentials.create()`
- Does NOT call `navigator.credentials.get()`
- Does NOT enroll any account
- Does NOT read existing credentials
- Does NOT send any network request
- Does NOT provide real authentication

## Unsupported Browser Behavior

When WebAuthn capabilities are not available:
- All capability flags return `false`
- The inspection result remains informational only
- No error is shown to the user
- The application continues to function without passkey features

## Private/Incognito Mode

In private browsing modes:
- localStorage may be cleared when the session ends
- Some browsers block localStorage entirely
- The application handles this gracefully with fallbacks
- Users should be aware data will not persist

## Mobile Browser Considerations

Mobile browsers may have:
- Smaller localStorage quotas
- More aggressive memory management
- Different touch interaction patterns
- Varying support for newer CSS features

The responsive design adapts to mobile viewports, but full mobile testing has not been completed in this demo phase.

## No Guarantee of Real Authentication

This demonstration:
- Does NOT implement real authentication
- Does NOT guarantee compatibility with any specific passkey provider
- Does NOT support credential recovery
- Does NOT support multi-device credential synchronization

A production service would require:
- Verified WebAuthn implementation
- Cross-platform testing
- Fallback authentication mechanisms
- Credential recovery procedures

## Feature Detection

The application uses feature detection rather than browser sniffing:
- Checks for API availability before use
- Provides fallbacks when features are missing
- Degrades gracefully when capabilities are absent

## Future Production Requirements

A production deployment would need:
- Comprehensive cross-browser testing matrix
- Automated browser compatibility testing
- Polyfills or transpilation for older browser support
- Explicit minimum version documentation
- Browser-specific bug tracking and workarounds
