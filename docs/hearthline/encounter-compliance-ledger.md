# EncounterComplianceLedger

## Purpose

EncounterComplianceLedger records the minimum governance evidence needed to
audit Hearthline's own compliance processes: selected report intake, human
review, appeal, policy outcome, retention expiry, and access to ledger records.

It is not a behavioral dossier, reputation system, legal-risk score, consent
registry, commercial-sex registry, or profile history.

## Core rule

The ledger records platform process events, not intimate user content.

A ledger event may establish that:

- a report was opened;
- a report entered human review;
- a reviewer recorded a policy outcome;
- an appeal was opened or resolved;
- a retention period expired;
- access to a ledger record occurred;
- a record was cryptographically closed or purged.

A ledger event must not contain:

- message text;
- photos, audio, video, or files;
- profile text;
- private-charter content;
- intimate-palette content;
- afterglow content;
- exact location;
- address;
- workplace;
- financial information;
- health, recovery, identity, or vulnerability information;
- public identity;
- account identifier;
- device fingerprint;
- IP address;
- user-score, risk-score, legal-score, trust-score, or reputation-score;
- legal conclusion or criminality determination.

## Data model

The ledger uses an opaque case identifier and an opaque event identifier.
Mapping from case identifier to an operational review workspace, if temporarily
necessary, exists outside the ledger in a separately protected, purpose-limited
system with a defined deletion schedule.

The ledger must not be joined with:

- discovery;
- profile;
- matching;
- recommendation;
- advertising;
- analytics;
- model training;
- payment;
- identity verification;
- location;
- private compatibility;
- private reflection;
- user-level moderation scoring.

## Integrity and correction

The event chain is tamper-evident, not permanently immutable personal data.

When a correction is needed:

1. Preserve the original event's integrity reference.
2. Append a correction event with a reason category.
3. Mark the superseded event as corrected for authorized auditors.
4. Do not rewrite historic audit evidence silently.
5. Do not retain unnecessary personal or sensitive content merely to preserve
   the chain.

When retention ends:

1. Delete the external case-to-content mapping.
2. Destroy any case-specific encryption key or protected reference.
3. Retain only a non-linkable aggregate or a cryptographically closed event
   marker where required for audit.
4. Ensure the remaining marker cannot be used to reconstruct identity,
   content, relationship history, or a person-level compliance profile.

## Required event categories

- `report_opened`
- `report_submitted_for_review`
- `human_review_started`
- `human_review_completed`
- `appeal_opened`
- `appeal_resolved`
- `content_action_completed`
- `feature_restriction_completed`
- `case_closed_no_action`
- `retention_expired`
- `case_mapping_destroyed`
- `ledger_accessed`
- `correction_recorded`
- `integrity_check_completed`

## Outcome categories

- `no_policy_match`
- `education_notice`
- `public_content_removed`
- `feature_restriction`
- `account_action`
- `appeal_upheld`
- `appeal_modified`
- `appeal_reversed`
- `case_closed`
- `retention_purged`
- `integrity_verified`

Outcome categories describe a platform process result only. They are not
statements about a person's identity, intent, character, legal status,
commercial activity, consent, capacity, or future eligibility.

## Access rules

- Ledger access is restricted to authorized governance personnel.
- Every access creates a separate `ledger_accessed` audit event.
- Access purpose is recorded using a closed vocabulary.
- Access is denied unless a current case-governance purpose exists.
- No product team, advertising system, matching system, general analytics
  system, or automated agent has read access.
- External disclosure requires separate legal and policy review.
- The ledger cannot automatically contact law enforcement, employers, family,
  venues, emergency contacts, or third parties.

## Retention

- Retention is purpose-limited and jurisdiction-reviewed.
- Every event includes a retention expiry.
- No record is retained indefinitely merely because it is called immutable.
- Case mappings expire earlier than aggregate governance markers.
- Retention changes require a new ledger-policy version and documented review.
