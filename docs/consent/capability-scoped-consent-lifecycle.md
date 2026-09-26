# Capability-Scoped Consent Lifecycle

## Purpose

The Capability-Scoped Consent Lifecycle models a member's current permission for
one named action, for one stated purpose, in one defined recipient or session
scope, for a limited period.

It does not determine legal consent, capacity, safety, trustworthiness,
compatibility, relationship status, or permission for any other action.

## Core rules

1. Consent is specific.
2. Consent is informed.
3. Consent is freely given.
4. Consent is ongoing.
5. Consent is revocable at any time.
6. Silence, delay, non-response, a profile, a match, a message, a prior action,
   a preference, an earlier consent grant, or a meeting plan is not new consent.
7. Consent to one capability does not imply consent to another.
8. Consent to one recipient does not imply consent to another.
9. Withdrawal, pause, decline, expiry, blocking, or reporting must stop the
   relevant capability immediately.
10. The platform must not require a reason, apology, negotiation, continued
    contact, or aftercare to decline, pause, withdraw, or block.

## Capability examples

- Direct conversation.
- Sexual-topic discussion.
- Sending or viewing media.
- Voice call.
- Video call.
- Named public-venue discussion.
- Public-first meeting plan.
- Trusted-contact meeting share.
- AR camera access.
- AR microphone access.
- AR spatial mapping.
- Recording.

## States

| State | Meaning | Capability available? |
|---|---|---:|
| UNKNOWN | No current permission exists | No |
| REQUESTED | A specific request awaits a response | No |
| DISCUSSION_OPTIONAL | A person chose to discuss conditions; no permission exists yet | No |
| GRANTED | Permission was affirmatively granted but not yet used | Only when all other policy gates pass |
| ACTIVE | Permission is currently being used | Yes, within scope |
| PAUSED | Permission is temporarily stopped | No |
| DECLINED | Recipient declined the request | No |
| WITHDRAWN | Grantor removed permission | No |
| EXPIRED | Time limit passed | No |
| COMPLETED | Scoped action ended normally | No new action without a new grant |
| BLOCKED_OR_REVIEWABLE | Block, restriction, or report affects contact/access | No |
| OPTIONAL_REFLECTION | Voluntary private or mutual reflection after completion | No |
| CLOSED | Lifecycle record is finished and retention/deletion rules apply | No |

## Required request content

Every consent request must identify:

- Requested capability.
- Purpose.
- Named recipient or participant scope.
- Whether this is a one-time, session-scoped, or time-limited request.
- Expiry time.
- What data or device capability is involved.
- Whether recording, storage, or export is possible.
- How to decline, pause, withdraw, block, or report.
- A plain-language statement that no response or decline carries no penalty.

## Required member-facing request text

> [Name or chosen display name] is asking to [named capability] for
> [purpose]. This request expires [time]. You can say yes, no, or leave it
> unanswered. Saying no, pausing, or changing your mind will not reduce your
> access to Hearthline or create an obligation to explain.

## Withdrawal semantics

Withdrawal must:

1. End the active capability immediately.
2. Invalidate associated authorization tokens.
3. Stop queued and background actions.
4. Remove access from cached client projections.
5. End relevant camera, microphone, recording, media, or AR permissions where
   technically possible.
6. Preserve only content-minimized accountability information as required by
   retention policy.
7. Never trigger retaliation, repeated prompts, a visibility penalty, or a
   counterpart-facing explanation of private reasons.

## Optional reflection

Optional reflection must:

- Be private by default.
- Be skippable.
- Never ask for a rating of the other person.
- Never create a reputation, trust, safety, or desirability score.
- Never require continued contact.
- Offer a route to block, report, or seek human review.
