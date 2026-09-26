# Non-Disclosure Identity Protection Pattern

## Purpose

The Non-Disclosure Identity Protection Pattern protects optional, self-stated
identity-related claims without forcing members to certify, verify, publish, or
defend those claims.

It supports a member saying only what they choose, at the scope they choose,
without requiring the platform to decide whether the identity is authentic,
complete, important, or relevant to another person.

## Core principle

> A self-stated identity claim is the member's statement about themselves, not
> a platform judgment, a credential requirement, an invitation to scrutiny, or
> a matching signal.

## Claim statuses

The platform may record only disclosure and evidence-handling status. It must
not assign a truth score or confidence score.

| Status | Meaning | Platform interpretation |
|---|---|---|
| `self_stated` | The member chose to describe themselves | Present only at the member-selected scope; do not certify or infer more |
| `credential_presented` | The member voluntarily presented a narrowly scoped credential | Verify only the minimum claim required for a stated feature; do not publish credential metadata |
| `not_disclosed` | The member chose not to state the category | No inference, penalty, visibility reduction, or repeated prompting |
| `withdrawn` | The member withdrew the statement from a scope | Stop presentation immediately; do not retain it for matching or ranking |
| `expired` | A time-limited claim or disclosure scope ended | Stop presentation and prevent future use without new action |

## Why confidence is prohibited

A field such as `confidence: 0.87` is prohibited because it can:

- Convert self-description into a platform verdict.
- Create a covert “real identity” hierarchy.
- Penalize people who cannot or do not want to present credentials.
- Become an input to moderation, matching, advertising, or exclusion.
- Conflate technical verification with lived identity.
- Invite discriminatory treatment and unsafe disclosure demands.

The platform can record limited technical verification results for a narrowly
scoped feature only. It must not translate technical evidence into a social
confidence score.

## Claim categories

Claims are organized by disclosure sensitivity, not by social value.

### Low-sensitivity self-presentation examples

- Display name.
- Pronouns.
- Selected language.
- General connection intention.
- Communication style.
- Public activity interests.
- Broad self-description written by the member.

### Sensitive or protected identity examples

- Sexual orientation.
- Gender identity.
- Race, ethnicity, nationality, or tribal affiliation.
- Religion or faith.
- Disability, health, or accessibility context.
- Recovery or sobriety context.
- Immigration or legal status.
- Relationship status.
- Intimate preferences.
- Financial, housing, or employment context.

Sensitive identity categories must be private by default. They must never be
required for discovery, matching, messaging, casual encounters, or a public
profile.

## Protection rules

1. A member can omit any optional claim.
2. Omission is not a negative signal.
3. The platform must not infer omitted categories.
4. A protected claim must be private by default.
5. A protected claim can be disclosed only with field-level, recipient-specific,
   purpose-specific, revocable consent.
6. A protected claim must not be used to rank, demote, target, advertise to,
   exclude, risk-score, trust-score, or commercially profile a member.
7. A protected claim must not appear in a public search index, URL, activity
   feed, analytics event, debug log, or exported recommendation payload.
8. A recipient must not see whether a member omitted, withdrew, hid, or never
   created a protected claim.
9. Staff access must be least-privilege, purpose-limited, logged, and subject to
   human-review safeguards.
10. A member must be able to correct or delete their own claim.
11. Claim deletion must remove it from all discovery projections, caches,
    indexes, feature stores, exports, and model-training datasets.
12. A person may block, report, or leave an interaction without explaining any
    identity or disclosure decision.

## Protected-class handling

The field `protectedClassFlag` should not be a profile-visible attribute and
must not be exposed to matching, ranking, advertising, or other members.

If the system uses a protection classification at all, it must be an internal
data-handling label such as:

```text
sensitivity = ordinary | sensitive | protected
```

The label means only:

> Apply stricter defaults, access controls, retention, logging restrictions,
> and disclosure checks.

It does not mean:

> This member belongs to a verified protected category.

## Fairness review scope

Fairness review must verify:

- Protected claims cannot reach candidate generation, ordering, allocation,
  advertising, or person-level evaluation.
- Omission of a protected claim has identical eligibility treatment to
  disclosure.
- No proxy fields route around the restriction.
- Counterpart-facing APIs hide both values and “field absent” metadata.
- Accessibility, language, privacy choices, and slower communication pace do not
  cause hidden demotion.
- Review uses synthetic, voluntary, or access-path test cohorts, not inferred
  protected-class labels.
- Human-review and appeal routes exist for access-control or moderation mistakes.
