# Decision Fairness Audit Policy

## Purpose

The Decision Fairness Audit Trail records how Hearthline product decisions were
made so that members, reviewers, and release owners can inspect whether a
decision used an authorized policy, an allowed data path, and an explainable
outcome.

It does not determine a member's protected identity, fairness category, moral
character, safety, risk, trustworthiness, or eligibility for human dignity.

## In-scope decisions

- Discovery eligibility.
- Discovery presentation allocation.
- Consent capability activation or revocation.
- Identity disclosure access.
- Privacy-envelope access.
- Feature-access denial.
- Block/restriction enforcement.
- Report intake routing.
- Moderation action.
- Appeal decision.
- Accessibility alternative delivery.
- Human-review escalation.

## Mandatory audit fields

Each decision event must include:

- Opaque decision identifier.
- Opaque subject reference where necessary for correction or appeal.
- Decision category.
- Outcome.
- Reason codes.
- Policy version.
- Rule-set version.
- Allowed-field manifest version.
- Forbidden-field enforcement result.
- Feature-flag snapshot identifier.
- Model identifier only if a model was approved for that decision class.
- Human-review status.
- Timestamp.
- Retention class.

## Prohibited audit fields

Never log:

- Inferred or declared protected class.
- Protected-class proxy.
- Identity-confidence score.
- Risk, trust, safety, desirability, popularity, or compatibility score.
- Raw profile text, private message, intimate media, voice, video, or biometric data.
- Exact location, route, venue attendance, device proximity, or presence.
- Contact graph, uploaded contacts, profile views, response speed, or online status.
- Health, recovery, disability, finances, housing, employment, immigration, or legal history.
- A free-form narrative about why a member is considered difficult, unsafe, or undesirable.

## Audit questions

The audit system may answer:

- Was a decision made under a reviewed policy version?
- Did the decision use only fields on the allowed-field manifest?
- Was a forbidden field requested, supplied, or accessed?
- Did the system apply the current consent and revocation state?
- Did an accessibility alternative exist and work?
- Was a required human review or appeal path provided?
- Did a feature flag cause different behavior?
- Did an outcome differ after a policy/version change?

The audit system must not answer:

- What protected identity does this person have?
- Is this person more risky, more trustworthy, or more desirable?
- Is this person likely to report, appeal, decline, or disengage?
- Is this group statistically more difficult, safe, unsafe, or valuable?
