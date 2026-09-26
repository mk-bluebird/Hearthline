# Identity Disclosure Ladder

## Purpose

The Identity Disclosure Ladder lets an adult choose whether, when, and to whom
they disclose optional identity-related information while using Hearthline.

The Ladder is not an identity-verification requirement, a credibility measure,
a trust score, a relationship prerequisite, a matching score, or permission to
contact someone.

The only platform eligibility requirement is a current result showing that the
account satisfies Hearthline's adult-membership policy. For Hearthline, this is
a 30+ product requirement. The normal connection, discovery, and casual-
encounter flows must not require legal name, government identity document,
public identity label, photograph, voice, video, biometric information, face,
workplace, home address, precise location, social account, or credential
presentation.

## Core principle

> A person may be known gradually, selectively, or not at all beyond the
> information required to operate a chosen feature safely and lawfully.

A profile, message, match, reaction, disclosure, credential, or prior consent
does not create entitlement to additional identity information, photographs,
voice, video, contact details, social accounts, address, workplace, location,
meeting, recording, affection, or intimacy.

## Disclosure levels

The levels describe visibility scope, not authenticity, trustworthiness,
relationship value, or social rank.

| Level | Name | Information that may be included | Audience | Preconditions |
|---|---|---|---|---|
| 0 | Private / undisclosed | Nothing identity-related beyond internal account operation and adult-policy eligibility result | Account owner and strictly authorized system components | None |
| 1 | Broad self-presentation | Optional display name, selected pronouns, selected language, general connection intention, non-identifying self-description | People permitted to view the relevant discovery card | Owner enables field-specific discovery visibility |
| 2 | Reciprocal-interest context | Optional additional self-description or member-selected identity context | One specifically reciprocally interested member | Both people independently enter reciprocal-interest state |
| 3 | Conversation context | Optional more detailed identity, communication, or lived-experience context | One specifically consented conversation counterpart | Both people separately consent to direct conversation |
| 4 | Meeting-planning context | Voluntary information relevant to a selected public-first plan, such as an accessibility preference or preferred name for a venue reservation | Specific counterpart or chosen trusted contact | Separate purpose-specific consent and short expiry |
| 5 | Credential presentation | A narrow verifiable claim, such as “meets Hearthline’s 30+ membership policy” | Verifier approved by the member for a defined purpose | Separate consent, explicit verifier, purpose, and expiry |

## Prohibited disclosure ladder behaviors

The Ladder must not:

- Require an identity label for discovery, messaging, casual encounters, romance,
  friendship, activities, or community participation.
- Require disclosure of legal name, government identity, employer, school,
  address, telephone number, social-media profile, face, body, voice, video,
  biometric characteristic, disability, health, recovery, sexuality, religion,
  race, ethnicity, nationality, income, housing, immigration, legal history, or
  relationship history.
- Infer an identity from writing style, device data, photographs, voice, location,
  social graph, activity patterns, media, or third-party data.
- Allow a recipient to request disclosure repeatedly after a decline, withdrawal,
  silence, or expiry.
- Treat lower disclosure as suspicious, incomplete, deceptive, less desirable,
  less trustworthy, or less eligible.
- Use disclosure level to rank people, modify visibility, predict response, or
  calculate compatibility, safety, or risk.
- Publish an identity credential, credential metadata, issuer, subject identifier,
  or verification history to a profile or discovery surface.
- Use identity claims as advertising inventory, recommendation inputs, model
  training data, or a transferable asset.

## Fresh-consent rule

Each level transition requires new, explicit, contextual consent.

```text
Level 1 does not authorize Level 2.
Level 2 does not authorize Level 3.
Level 3 does not authorize Level 4.
Level 4 does not authorize Level 5.
Level 5 does not authorize publication of the credential or underlying identity.
```

For every proposed transition, Hearthline must show:

1. The exact fields proposed for disclosure.
2. The recipient or audience.
3. The purpose.
4. The expiration time.
5. Whether the recipient can retain, export, or copy the information.
6. How to withdraw or reduce the scope.
7. A statement that declining or delaying has no penalty.

## Required member-facing consent text

> You control this disclosure. You are choosing to share the items listed below
> with the named recipient for the stated purpose until the stated expiry time.
> You can change your mind at any time. Declining, waiting, or sharing less does
> not affect your ability to use Hearthline.

## Revocation behavior

When a member revokes a disclosure:

1. Hearthline stops presenting the scoped field immediately.
2. Access tokens, cached projections, signed links, and queued notifications
   associated with the disclosure are invalidated.
3. Future API reads fail closed.
4. The platform records only a content-minimized revocation event for
   accountability and appeal.
5. Hearthline cannot retract information a recipient has independently copied,
   recorded, or remembered; the UI must explain this honestly before disclosure.
6. Revocation cannot produce a penalty, downgrade, warning badge, or visibility
   reduction for the person who revoked.

## Credential boundary

A verifiable credential is optional and must prove only the minimum necessary
claim. Example:

```text
This account satisfies Hearthline's current 30+ adult-membership policy.
```

It must not automatically reveal:

- Legal name.
- Date of birth.
- Exact age.
- Address.
- Government identifier.
- Document image.
- Credential subject identifier.
- Credential issuer relationship history.
- Social account.
- Location.
- Protected identity category.

## Accessibility requirements

- Every level and field must be controllable by keyboard and screen reader.
- Text-first disclosure paths must provide all core functionality.
- No camera, microphone, face scan, voice sample, gesture, AR device, travel, or
  location permission may be required for core participation.
- Disclosure descriptions must be available in plain language.
- Members must be able to pause, reduce, revoke, block, and report without
  completing a disclosure.
- A non-camera and non-biometric adult-eligibility path must exist.
