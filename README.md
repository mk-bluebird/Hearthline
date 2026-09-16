# Hearthline Starter

**Connection at your pace.**

## What This Demonstrates

Hearthline Starter is a local-first web application that demonstrates privacy-focused social connection behavior for adults seeking dating, friendship, activities, and community connection at a calmer pace.

This is a **public demonstration application**, not a dating service backend, medical product, treatment system, recovery certification service, reputation system, or surveillance tool.

## Important Statements

- **This is a local demo only.** It does not create real accounts, send real messages, or connect to any server.
- **It does not diagnose, treat, certify, or verify recovery.** No health, recovery, treatment, or trauma information is collected.
- **It does not score users.** There are no compatibility scores, reputation scores, trust scores, popularity values, social-worth labels, or desirability rankings.
- **All data stays in your browser.** Nothing is transmitted externally.

## Setup

```sh
npm install
```

## Commands

```sh
npm run dev      # Start development server
npm run build    # Build for production
npm run test     # Run tests with Vitest
```

The application builds without environment variables.

## Privacy Model

- Default to minimum visible profile fields
- Evaluate disclosure before rendering any protected field
- Evaluate disclosure before generating or previewing a draft
- Remove affected local draft text when a scope is revoked
- No recipient is notified about another person's privacy changes
- No inference of recovery, health, trauma, or treatment context
- No public or private scores of any kind

## Feature List

1. Welcome and privacy-first onboarding
2. Local profile editor with pseudonymous display names
3. Connection explorer with plain-language overlap explanations
4. Mutual-interest gate before conversation
5. Per-recipient disclosure controls
6. Limited conversation screen with local drafting
7. HearthChat local rule-based drafting assistant
8. Pace controls and low-energy mode
9. Pause-without-penalty state
10. Passkey capability and secure sign-in readiness screen
11. Local privacy and security history (content-free)
12. Temporary action-pacing demonstration
13. Optional meeting-planning checklist
14. Optional neutral support-contact planning
15. Local data reset and export preview

## Non-Goals

- Real account creation or authentication
- Real message sending or delivery
- Server-side processing or databases
- External API integration
- Recovery status, diagnosis, or treatment tracking
- User scoring, ranking, or reputation systems
- Location tracking or surveillance
- Third-party analytics or data collection

## Repository Structure

```
hearthline-starter/
├── src/
│   ├── components/     # Reusable UI components
│   ├── data/           # Demo profile data
│   ├── hooks/          # React hooks for state management
│   ├── lib/            # Core logic (consent, matching, integrity, etc.)
│   ├── pages/          # Page-level components
│   ├── styles/         # CSS with design tokens
│   └── test/           # Vitest test files
├── public/             # Static assets
└── index.html          # Entry HTML
```

## Accessibility Notes

- Keyboard navigable controls with visible focus styles
- Semantic headings and ARIA labels
- Reduced-motion friendly CSS
- High contrast colors
- No auto-advancing UI or countdown pressure
- Plain-language error messages
- No guilt or urgency wording
- Low-energy mode reduces cognitive load

## Extension Path for Production

A future production backend could add:

- Server-verified WebAuthn ceremonies
- Secure session handling
- PostgreSQL or equivalent server database
- Encryption and key management
- Content-free audit pipeline
- Role-separated service boundaries
- Consent evaluation at render and send time
- Threat modeling and independent security review

None of these are implemented in this starter application.

## License

MIT
