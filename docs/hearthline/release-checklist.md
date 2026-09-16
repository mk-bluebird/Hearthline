# Hearthline Release Checklist

Use this checklist before releasing any version of the Hearthline demonstration application.

## Build and Test

- [ ] `npm run test` passes with all tests green
- [ ] `npm run build` completes without errors
- [ ] No console errors in development or production builds
- [ ] All new features have corresponding test coverage

## Package Metadata

- [ ] `package.json` name is `hearthline-starter`
- [ ] Version follows semantic versioning
- [ ] License field is present (MIT)
- [ ] Description accurately states local-first demo nature
- [ ] Engines field specifies Node version requirement
- [ ] No unauthorized dependencies added

## Security and Privacy Checks

- [ ] No external network requests introduced
  - Verify no `fetch()`, `XMLHttpRequest`, `WebSocket`, `EventSource` calls
  - Verify no analytics SDKs installed
  - Verify no authentication providers integrated
- [ ] Forbidden-data tests pass
  - `findForbiddenDataKeys` detects all prohibited fields
  - `assertNoForbiddenData` throws appropriately
  - Circular reference handling works correctly
- [ ] Component-boundary tests pass
  - Allowed reads are permitted
  - Denied reads are blocked
  - Unknown components throw errors
- [ ] Audit events remain content-free
  - No message text accepted
  - No draft text accepted
  - No recipient references accepted
  - Templates used for user-facing messages
- [ ] Local export is sanitized
  - Drafts excluded
  - Messages excluded
  - Consent data excluded
  - Persona data excluded
  - Recipients excluded
  - Credentials excluded

## Documentation Review

- [ ] README accurately describes local demo scope
- [ ] Privacy model document reviewed and accurate
- [ ] Threat model document reviewed and accurate
- [ ] Accessibility statement reviewed
- [ ] Browser support statement reviewed
- [ ] Milestone tracker updated

## Code Quality

- [ ] No real authentication implemented
- [ ] No real messaging implemented
- [ ] No recovery mechanisms implemented
- [ ] No external platform claims made
- [ ] No person scoring introduced
- [ ] Storage prefix is stable (`hearthline-starter:`)
- [ ] Error handling is graceful
- [ ] User-facing messages are calm and clear

## Manual Verification

- [ ] Application starts without errors
- [ ] Navigation works as expected
- [ ] Privacy controls function correctly
- [ ] Draft invalidation works when consent changes
- [ ] Low-energy mode toggles properly
- [ ] Local data reset clears state
- [ ] Export preview shows only safe data

## Repository Hygiene

- [ ] No secrets committed
- [ ] No large binary files added
- [ ] `.gitignore` is current
- [ ] LICENSE file present
- [ ] CHANGELOG updated if applicable

## GitHub Actions (if applicable)

- [ ] Workflow file exists at `.github/workflows/quality.yml`
- [ ] Workflow runs on push and pull_request
- [ ] Workflow uses Node 20
- [ ] Workflow runs `npm ci`, `npm run test`, `npm run build`
- [ ] Workflow does not publish or deploy
- [ ] Workflow does not use secrets

## Sign-Off

Before release, confirm:

- [ ] This is a local demonstration only
- [ ] No production claims are made
- [ ] Users understand the demo limitations
- [ ] Privacy and threat models are accurate
- [ ] Accessibility commitments are documented

---

**Note:** This checklist applies to the M2 milestone hardening phase. Future production releases would require additional security review, compliance verification, and operational readiness checks.
