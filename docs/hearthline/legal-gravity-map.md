# LegalGravityMap

## Purpose

LegalGravityMap provides a versioned, plain-language, read-only orientation
layer describing Hearthline's reviewed product posture for narrowly defined
features in a named jurisdiction.

It is not legal advice. It does not determine whether a particular person's
conduct is lawful. It does not assess intent, create a legal risk score, or
make a legal decision for any user.

## Why feature boundaries replace simple legality labels

A jurisdiction may permit consensual adult dating and online communication while
prohibiting commercial sexual conduct, coercion, trafficking, unlawful
recording, harassment, distribution of intimate imagery without consent, or
other conduct. A single `allowed` or `prohibited` label cannot accurately
represent those distinctions.

LegalGravityMap therefore reports a platform feature posture rather than a
universal legal classification.

## Status vocabulary

- `information_only`
  - The jurisdiction has not received a completed counsel review for the
    feature boundary. Hearthline provides only a non-advice notice and links to
    official sources.

- `reviewed_available`
  - Qualified local counsel has reviewed the feature boundary. Hearthline may
    make the listed non-commercial feature available subject to current policy,
    age assurance, consent controls, privacy safeguards, and ongoing review.

- `reviewed_restricted`
  - A feature may be limited to a narrower workflow, for example:
    no payment features, no precise location, no public availability signals,
    no private-venue planning, or no explicit-content sharing.

- `not_available`
  - Hearthline does not make the feature available in the jurisdiction because
    counsel review, product safeguards, or a legal/policy boundary does not
    support offering it.

- `under_review`
  - The prior posture is being re-reviewed after a law, policy, enforcement,
    product, or source change. The feature must not expand during review.

## Universal product boundaries

These boundaries apply in every jurisdiction, independent of a local map entry:

- No money, rates, deposits, tips, payment links, payment handles, financial
  account details, crypto addresses, gifts conditioned on intimacy, housing
  conditioned on intimacy, transport conditioned on intimacy, labor
  conditioned on intimacy, debt relief conditioned on intimacy, or other
  value-for-intimacy flows.

- No person-level legal-risk score, consent score, desirability score, morality
  score, commercial-sex score, trafficking score, or hidden vulnerability
  score.

- No inference of identity, health, recovery, sexuality, finances, capacity,
  vulnerability, or legal status from language, behavior, metadata,
  communication mode, device data, or refusal to disclose.

- No automated legal advice, fact-pattern interpretation, criminality
  determination, or legal-compliance certification.

- No requirement to disclose precise location, workplace, home, financial
  status, intimate history, health information, or private identity to access
  ordinary connection features.

- No payment processing, stored value, escrow, person-to-person transfers,
  hotel booking, lodging exchange, transport exchange, employment exchange,
  debt exchange, or other consideration-linked encounter workflow.

- No use of legal-map access, reading, or location selection for discovery,
  ranking, recommendation, advertising, eligibility, moderation scoring, or
  person-level profiling.

## Jurisdiction entry requirements

A jurisdiction entry is publishable only when it has:

1. A local jurisdiction code and human-readable name.
2. A narrow feature scope.
3. A published product posture using the approved status vocabulary.
4. Source citations, with primary official legal sources preferred.
5. A qualified local counsel review reference held in internal legal records.
6. Effective and review-by dates.
7. A plain-language non-advice notice.
8. An accessibility-reviewed summary.
9. A documented change history.
10. A statement of which product functions remain unavailable.

## Example: Arizona feature posture

This is an example of a product posture, not legal advice.

- General adult friendship, dating, romance, conversation, and non-commercial
  adult connection: `reviewed_available`, subject to age assurance, consent,
  privacy, accessible communication, and non-commercial-integrity safeguards.

- Platform support for money, rates, payment links, deposits, tips, or value
  exchanged for sexual conduct: `not_available`.

- Hosting, rides, lodging, or travel as searchable sexual-access attributes:
  `not_available`.

- Coarse, user-declared, non-GPS venue and availability context:
  `reviewed_restricted`, limited to privacy-preserving, non-commercial,
  user-revocable, broad-area and broad-time controls.

- Private adult compatibility discussion:
  `reviewed_restricted`, available only through explicit mutual opt-in,
  recipient-scoped access, revocation, limited retention, and exclusion from
  discovery, advertising, ranking, and analytics.

## Data minimization

LegalGravityMap is static content.

It must not collect or retain:

- User identity.
- Account ID.
- Device fingerprint.
- Exact location.
- IP-derived location associated with an account.
- Page view receipt.
- Scroll depth.
- Reading time.
- Link-click history.
- Jurisdiction-selection history.
- Legal-content acknowledgement.
- Legal-comprehension score.

Infrastructure reliability measurements may exist only in aggregate, must not
be account-linked, and must not be used to infer where a user lives or what
they intend to do.

## Update workflow

1. A scheduled review date, official source change, product change, or legal
   notice opens a jurisdiction review.
2. The entry moves to `under_review`.
3. Qualified local counsel reviews the narrow product feature boundary.
4. Product, privacy, accessibility, and safety reviewers verify that the
   implementation matches the reviewed boundary.
5. A new versioned static entry is published with sources and effective date.
6. A concise change note explains the product posture change.
7. Superseded entries remain in a version history without collecting user
   reading or acknowledgement data.

## Prohibited claims

LegalGravityMap must never state or imply:

- “This activity is legal for you.”
- “You are legally safe.”
- “Hearthline has verified that your encounter is lawful.”
- “This feature proves consent.”
- “This feature proves non-commercial intent.”
- “You may rely on this map instead of legal advice.”
- “Your location determines your eligibility.”
- “Your legal-map selection will be kept private” unless all infrastructure,
  logging, and routing practices have been independently verified.
