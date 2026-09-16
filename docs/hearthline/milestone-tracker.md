# Hearthline Milestone Tracker

## Current Milestone: M2 — Repository Hardening

This document tracks progress through the Hearthline milestone roadmap.

## M1 Status

**M1 — Local-First Prototype:** Complete, subject to test confirmation.

The M1 milestone established the core local-first demonstration application with:
- Welcome and privacy-first onboarding
- Local profile editor with pseudonymous display names
- Connection explorer with plain-language overlap explanations
- Mutual-interest gate before conversation
- Per-recipient disclosure controls
- Limited conversation screen with local drafting
- HearthChat local rule-based drafting assistant
- Pace controls and low-energy mode
- Pause-without-penalty state
- Passkey capability inspection (informational only)
- Local privacy and security history (content-free)
- Temporary action-pacing demonstration
- Optional meeting-planning checklist
- Optional neutral support-contact planning
- Local data reset and export preview

## M2 Checklist

### Repository Infrastructure
- [x] Package metadata updated (name, version, description, license, engines)
- [ ] Tests pass (`npm run test`)
- [ ] Build succeeds (`npm run build`)
- [x] GitHub Actions workflow created (`.github/workflows/quality.yml`)

### Privacy and Security Hardening
- [x] Local storage hardening (stable prefix, forbidden-data validation)
- [x] Audit validation (content-free events, allowlisted templates)
- [x] Forbidden-data guard (nested key detection, circular reference handling)
- [x] Component-boundary checks (allowed-read registry)

### Documentation
- [x] Privacy model documented (`docs/hearthline/privacy-model.md`)
- [x] Threat model documented (`docs/hearthline/threat-model.md`)
- [x] Accessibility statement (`docs/hearthline/accessibility.md`)
- [x] Browser support statement (`docs/hearthline/browser-support.md`)
- [x] Release checklist (`docs/hearthline/release-checklist.md`)

## M3 Onward (Future Work)

Future milestones may address:
- Server-side consent enforcement
- Verified WebAuthn ceremonies
- Secure session handling
- Production database integration
- Independent security review
- Privacy impact assessment
- Red-team security testing

## Important Distinctions

This repository is a **local demonstration only**. It does not implement:
- Real account creation or authentication
- Real message delivery
- External provider integration
- Medical, recovery, or treatment functionality
- User scoring of any kind

No claims are made about server authentication or production enforcement capabilities in this milestone.
