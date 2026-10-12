# Current Connection Intent Card

## Purpose

The Current Connection Intent Card lets eligible adults state what they are
open to now: conversation, friendship, companionship, shared activities,
dates, romance, intimacy, casual connection, or an undecided path.

Intent is descriptive. It is not consent, a promise, a contract, a prediction,
a demand for response, or permission to escalate.

Implementation:
[Intent Card module](../../typescript/intent/intent-card.ts)

## Core rules

1. A member may select multiple intents, revise them, pause them, or remove
   them at any time.
2. A member may select no intent and still use core account, privacy,
   reporting, accessibility, and resource features.
3. Discovery requires independently selected current intent and current
   discovery permission for both members.
4. Exact shared intent may support a discovery explanation. It must not
   produce a score, ranking, popularity signal, or prediction.
5. Shared intent does not open messaging, sexual discussion, media sharing,
   voice/video, venue disclosure, meeting planning, recording, or AR access.
6. Each later capability requires its own current authorization and consent
   checkpoint.
7. Intent must not be used to calculate sexual availability, vulnerability,
   desirability, popularity, compatibility, response likelihood, or risk.
8. Intent must not be used for advertising, public search indexing, model
   training, behavioral profiling, or portable reputation.
9. Casual connection and intimacy must never be connected to money, housing,
   employment, debt relief, transportation dependency, drugs, gifts
   conditioned on intimacy, or basic needs.
10. Missing declarations must not be replaced with inferred declarations.
11. Preference values remain member-owned until revised, removed, or deleted.
    Grant expiry does not expire or rewrite the underlying preferences.
12. Pausing the card suppresses recipient projections and discovery use.
    Resuming does not create a new disclosure or discovery grant.

## Intent categories

The implementation supports:

- Conversation.
- Friendship.
- Companionship.
- Shared activities.
- Dates.
- Romance.
- Intimacy.
- Casual connection.
- Casual intimacy.
- Friendship with optional intimacy.
- Still deciding.

Members may select multiple categories, including a combination of specific
interests and "Still deciding."

"Still deciding" is not treated as a wildcard, a positive match, or an
inference about identity, experience, or willingness.

Related categories remain distinct. The platform must not silently treat
"intimacy," "casual intimacy," and "friendship with optional intimacy" as
equivalent.

## Continuity preferences

Members may separately select:

- Not specified.
- One meeting at a time.
- Occasional.
- Ongoing.
- Open to discussing.

Continuity is a preference, not a commitment to a meeting, relationship,
response, or continued participation.

## Pacing controls

Members may separately select non-diagnostic current preferences:

- Text first.
- Public first.
- Conversation first.
- Low-pressure.
- Gentle pacing.
- Short activity preferred.
- Slower replies welcome.
- No photo required.
- Ask before sexual topics.
- Not discussing personal context yet.
- No answer needed.

These controls must not be interpreted as evidence of health, recovery,
crisis, disability, emotional state, capacity, or vulnerability.

A pacing preference is not a consent grant. A missing pacing preference is
not permission to escalate.

## Prohibited categories

The Intent Card must not ask members to select:

- Stress relief.
- Loneliness.
- Crisis.
- Trauma.
- Emotional instability.
- Financial need.
- Housing need.
- Transportation dependence.
- Recovery status.
- Health status.
- Disability label.
- Sexual availability score.
- Sexual role requirement.
- Risk classification.
- Safety classification.
- Willingness to obey.
- Desire to be rescued.
- Dependence on another person.

This structured-field prohibition does not authorize scanning private
communications or inferring these attributes elsewhere.

## Required member-facing reminder

> What you choose here describes what you are open to right now. It is not
> consent to a message, photo, call, meeting, location sharing, sexual topic,
> recording, touch, or intimacy. You can change it at any time.

## Disclosure contract

Each field requires its own current disclosure permission:

- Intent selections.
- Continuity preference.
- Pacing preferences.

A recipient-bound grant must identify:

- The card reference.
- The card revision.
- The intended recipient.
- The permitted purpose.
- The grant validity period.
- Current granted status.
- The explicitly permitted fields.

Protected values must not render when the grant is missing, revoked,
expired, not yet valid, bound to another revision, bound to another
recipient, or issued for another purpose.

The module's structural projection function is not an authorization check.
Member-facing services must use the authorized projection entry point
with current authoritative grant information.

## Lifecycle

Editing a card creates a strictly newer revision.

Existing grants bound to an earlier revision do not authorize disclosure
of the new revision. Pending suggestions and controlled cached projections
must be invalidated or reauthorized.

Pausing creates a new revision and suppresses projections. Removing all
intents creates an empty selection without changing unrelated preferences.

No lifecycle action automatically sends a message, changes relationship
status, schedules a meeting, or creates a consent grant.

## Service wiring

CommonGround:
- Supplies current recipient-bound field permission at the moment of use.

TrueCompass:
- Receives only currently permitted projections.
- May show exact shared declared intent.
- Must not rank people by overlap count.

SteadyPath:
- Applies member-selected pacing through a separate action gate.
- Does not infer reasons for the selected preferences.

AnchorLine:
- Authenticates callers and resolves account authority.
- Does not treat the Intent Card as identity or age evidence.

Afterlight:
- May record an approved privacy-choice lifecycle event.
- Must not retain intent values, pacing values, or continuity values.

Lantern:
- Has no Intent Card content read path.
- Applies only separately authorized action-integrity controls.

## Implementation boundaries

The TypeScript module:

- Validates structured values and rejects unknown fields.
- Returns detached, immutable objects.
- Preserves empty selections.
- Provides revision-bound lifecycle updates.
- Provides current recipient-bound projection.
- Computes literal shared intent without a numeric score.

It does not:

- Authenticate callers.
- Verify membership eligibility.
- Verify signatures.
- Fetch grants.
- Authorize discovery or messaging.
- Persist or delete records.
- Guarantee recall of information already received.

Production integration must provide those boundaries explicitly.
