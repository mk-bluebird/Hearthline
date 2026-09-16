# Hearthline Threat Model

## Assets Protected

This demonstration application handles the following local assets:

- **Local preferences:** Pace settings, low-energy mode, manual review settings
- **Local demo profile state:** Pseudonymous display names, interests, broad areas
- **Draft text:** Unsent message drafts stored in localStorage
- **Recipient-scoped display choices:** Per-recipient sharing preferences
- **Local generic audit events:** Content-free activity history with timestamps

## In-Scope Demo Threats

The following threats are addressed within this demo's scope:

### Accidental Over-Disclosure Through Stale Local Draft State

**Threat:** A user changes privacy preferences but an old draft containing now-restricted information remains available.

**Controls:**
- Draft invalidation when consent scope changes
- Protected field tracking on drafts
- Clear user-facing messages when drafts become unavailable

### Forbidden Sensitive Fields Reaching Local Models

**Threat:** Sensitive data fields (health, recovery, scores) inadvertently enter the demo's data flow.

**Controls:**
- Forbidden-data guard module (`forbiddenData.js`)
- Nested key detection at any depth
- Circular reference detection
- Validation before localStorage writes

### Bad localStorage Data

**Threat:** Corrupted or malformed JSON in localStorage causes application errors.

**Controls:**
- Try-catch handling on all localStorage operations
- Fallback values when parsing fails
- Removal of malformed entries
- Graceful degradation when storage is unavailable

### Accidental External Request Introduction

**Threat:** Future code changes might introduce network calls that violate the local-first model.

**Controls:**
- No network client in dependencies
- No fetch, XMLHttpRequest, WebSocket, or similar APIs in source
- Documentation stating no external requests
- Code review checklist item for network API introduction

### Accidental Person-Scoring Introduction

**Threat:** Future development might add compatibility, trust, or reputation scoring.

**Controls:**
- Explicit forbidden keys for score-related fields
- Documentation stating no scoring
- Test coverage for forbidden data detection
- Release checklist verification

### Prohibited Module Dependency Introduction

**Threat:** New dependencies might introduce analytics, authentication, or network capabilities.

**Controls:**
- Minimal dependency set
- Package metadata clearly states local-first nature
- No SDK installations in this milestone

## Implemented Controls

| Control | Purpose | Implementation |
|---------|---------|----------------|
| Consent draft invalidation | Prevent stale draft disclosure | `consent.js` |
| Forbidden-data guard | Block sensitive fields | `forbiddenData.js` |
| Component registry | Enforce module boundaries | `componentRegistry.js` |
| Local export sanitization | Safe data preview | `storage.js:createSafeLocalExport` |
| No network client | Prevent external requests | No dependencies, no fetch calls |
| No external account system | Clarify demo scope | Documentation, no auth code |
| Audit event templates | Content-free logging | `audit.js` |
| Storage prefix | Namespace isolation | `hearthline-starter:` |

## Out of Scope

The following threats are explicitly out of scope for this demo:

- **Real account takeover:** No accounts exist to take over.
- **Server compromise:** No server exists to compromise.
- **Real credential recovery:** No credentials are created or stored.
- **Production message delivery:** No messages are sent.
- **External-provider tokens:** No OAuth or external authentication.
- **Database injection:** No database connection exists.
- **Session hijacking:** No sessions are created.
- **Man-in-the-middle attacks:** No network communication occurs.

## Future Production Requirements

A production service would require additional controls:

### Server-Side Enforcement
- Server-authoritative consent evaluation
- Server-side validation of all inputs
- Database-level access controls

### Authentication Security
- Verified WebAuthn ceremonies with proper challenge-response
- Secure session management
- Credential rotation and revocation

### Operational Security
- Role-separated service boundaries
- Content-free audit pipeline with tamper detection
- Rate limiting and abuse detection
- Incident response procedures

### Review Processes
- Independent security audit
- Privacy impact assessment
- Red-team penetration testing
- Regular vulnerability assessments

### Compliance
- GDPR, CCPA, or applicable privacy regulation compliance
- Data retention policies
- User data export and deletion mechanisms

## Limitations of This Model

This threat model:
- Applies only to the local demonstration application
- Does not address production deployment risks
- Assumes browser localStorage behaves as specified
- Does not protect against browser vulnerabilities
- Does not protect against malware on the user's device
- Is not a substitute for professional security review
