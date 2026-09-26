# Age, Consent, and Preference Invariants

## Age-policy invariants

1. The product must deny access to adult-only discovery and adult-intimacy features
   unless `adultPlatformEligibility.state == "eligible"`.

2. The platform's `minimumAgePolicy == 30` is a voluntary Hearthline membership
   rule. It does not represent an Arizona legal-age determination.

3. Discovery, profile presentation, messaging, and counterpart-facing explanations
   must never disclose a member's date of birth, exact age, age-verification
   method, review result, identity-document data, or eligibility history.

4. An expired or revoked age-policy result fails closed. It may not be treated as
   a prior permanent permission.

## Consent invariants

1. `unknown` means no permission.
2. `withdrawn` means the capability is denied immediately.
3. `expired` means the capability is denied immediately.
4. Only `granted` with an unexpired `expiresAt` may authorize its named capability.
5. Every grant must identify:
   - the capability,
   - the purpose,
   - the recipient scope,
   - the grantor,
   - the policy version,
   - the expiry,
   - the current state.
6. Consent for one capability does not imply consent for another.
7. Consent for one recipient does not imply consent for another.
8. Consent to chat does not imply consent to calls, media, location, meetings,
   recording, sexual discussion, or sexual activity.
9. Silence, lack of response, earlier activity, a profile field, a preference,
   a match, a view, an interest action, or past consent is not a new consent grant.
10. Revocation must terminate access before any asynchronous delivery, queued job,
    cache projection, or external adapter action can continue.

## Preference invariants

1. Every preference facet must be directly member-selected.
2. Preferences describe current interests or interface controls, not personality,
   moral character, relationship value, trustworthiness, sexual consent, or
   capability.
3. A display weight may organize the member's own discovery surface only.
4. A display weight must not rank a counterpart, allocate counterpart visibility,
   estimate compatibility, or predict response.
5. Missing preferences must remain missing; the system may not infer them.
6. A member may revise or remove preferences without penalty.

## Boundary invariants

1. Boundary answers are current communication preferences, not contracts.
2. `no` and `ask_first` must be honored before an interaction request is shown.
3. The feature must not route or facilitate money, housing, employment, debt relief,
   transportation dependency, drugs, gifts conditioned on intimacy, or basic needs
   in exchange for social or sexual access.
4. An interaction involving transport conditioned on intimacy must be blocked from
   workflow creation and routed only through appropriate safety/reporting choices,
   if the member chooses to report it.

## Prohibited inference invariants

The service must not infer, calculate, store, or rank by:

- identity, sexuality, disability, health, recovery, sobriety, emotion, or vulnerability;
- wealth, income, debt, housing, employment, legal status, or immigration status;
- exact location, routes, venue attendance, device proximity, or routine;
- social graph, address books, profile views, read receipts, private messages, or response speed;
- attractiveness, desirability, popularity, trustworthiness, risk, compatibility, or likelihood of reply.
