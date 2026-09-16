# Hearthline Privacy Model

## Local-First Demo Scope

Hearthline Starter is a local-first demonstration application. All data processing and storage occurs within the user's browser using localStorage. No data is transmitted to external servers by the application logic.

## What This Demo Does Not Implement

- **No real accounts:** There is no account creation, authentication, or user registration system.
- **No real messages:** Message drafting is simulated locally; no messages are sent or delivered.
- **No third-party analytics:** The application does not include analytics, tracking, or telemetry services.
- **No network requests:** Application logic does not make HTTP requests to external APIs or services.
- **No health or recovery data:** The demo does not collect, process, or store information about:
  - Recovery status or history
  - Treatment history
  - Diagnosis or health conditions
  - Trauma history
  - Substance use history
- **No person scoring:** The demo implements no scoring systems including:
  - Trust scores
  - Reputation scores
  - Compatibility scores
  - Popularity metrics
  - Response rates
  - Social graph analysis

## Consent Behavior

Consent in this demo is local and demonstrative only:

- Consent choices affect local draft validity and rendering behavior.
- Revoking a sharing preference invalidates affected unsent drafts locally.
- No recipient is notified about another person's privacy changes.
- Consent state is stored only in browser localStorage.

## Browser Storage Limitations

- Data persists only in the user's browser localStorage.
- Clearing browser data removes all stored state.
- Storage capacity is limited by browser constraints.
- No backup or recovery mechanism exists.
- Malformed stored data is detected and removed safely.

## Local Data Reset

Users can reset all local demo data through the application interface. This action:
- Clears localStorage entries created by the application.
- Returns the application to its initial state.
- Does not affect any server-side data (none exists in this demo).

## Export Preview Limitations

The local export preview feature:
- Shows only non-sensitive settings and generic activity history.
- Excludes draft text, message content, and recipient information.
- Excludes consent field names and persona linkage data.
- Excludes credential or browser capability details.
- Is a preview only; no file is actually transmitted.

## Distinction from Future Production Service

This demonstration differs from a production service in critical ways:

| Demo (Current) | Production (Future) |
|----------------|---------------------|
| Local storage only | Server-side database |
| No authentication | Verified WebAuthn |
| Simulated consent | Server-enforced consent |
| No message delivery | Secure message transport |
| Client-side validation | Server-side validation |
| No audit trail | Content-free audit pipeline |
| Single-device state | Multi-device synchronization |

A production service would require:
- Independent security review
- Privacy impact assessment
- Threat modeling with red-team testing
- Regulatory compliance assessment
- Operational security procedures

## Privacy Commitments

Even as a demo, Hearthline commits to:
- Minimum visible profile fields by default
- Plain-language privacy explanations
- No inference of sensitive characteristics
- No urgency prompts or response penalties
- Clear distinction between demo and production capabilities
