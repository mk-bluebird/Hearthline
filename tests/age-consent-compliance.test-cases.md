# Age, Consent, Preference, and Arizona Policy Test Cases

## Adult-platform eligibility

| ID | Preconditions | Action | Expected result |
|---|---|---|---|
| AGE-001 | Eligibility is `eligible`; review date is current | Request adult-only discovery | Available subject to other policy checks |
| AGE-002 | Eligibility is `unknown` | Request adult-only discovery | Denied; verification path may be offered |
| AGE-003 | Eligibility is `verification_expired` | Request direct conversation | Denied; no counterpart disclosure |
| AGE-004 | Eligibility is `ineligible` | Request any adult-only capability | Denied; no matching, messaging, or visibility |
| AGE-005 | Counterpart queries a profile | Read discovery projection | Exact age, DOB, verification method, and history never returned |

## Consent state

| ID | Preconditions | Action | Expected result |
|---|---|---|---|
| CONSENT-001 | No grant exists | Open direct conversation | Denied as `no_matching_grant` |
| CONSENT-002 | Grant is `unknown` | Start voice call | Denied as `grant_unknown` |
| CONSENT-003 | Active direct-conversation grant exists for a named recipient | Open direct conversation | Allowed until expiry |
| CONSENT-004 | Grant is withdrawn | Send queued message | Queue is invalidated; delivery denied |
| CONSENT-005 | Grant has expired | Start a call | Denied as `grant_expired` |
| CONSENT-006 | Grant targets another member | Open conversation with a different member | Denied as `recipient_scope_mismatch` |
| CONSENT-007 | Chat grant exists | Request named venue discussion | Denied; separate venue grant required |
| CONSENT-008 | Mutual interest exists but sexual-topic consent is absent | Attempt sexual-topic mode | Denied; ordinary conversation remains available |

## Preference and boundaries

| ID | Preconditions | Action | Expected result |
|---|---|---|---|
| PREF-001 | Member changes an activity preference | Recompute candidate eligibility | Prior preference removed immediately |
| PREF-002 | Member sets a display weight | Render own discovery surface | Category order may change; no counterpart ranking changes |
| PREF-003 | Preference is missing | Candidate generation | No inferred substitute value |
| PREF-004 | Boundary says `ask_first` for sexual topics | Prepare escalation prompt | Explicit checkpoint required |
| PREF-005 | Boundary says `no` for location sharing | Counterpart requests location capability | Denied |
| PREF-006 | Boundary says `no` for material exchange | Creation of value-linked workflow | Denied |

## Arizona platform-policy boundaries

| ID | Preconditions | Action | Expected result |
|---|---|---|---|
| AZ-001 | Both policy eligibility states are `eligible`; consent active; no block; no value exchange | Enable scoped feature | `allow_platform_operation` |
| AZ-002 | One participant is not eligible | Enable scoped feature | Deny with `participant_not_currently_eligible_under_30_plus_policy` |
| AZ-003 | Consent state is withdrawn | Enable scoped feature | Deny with `active_consent_grant_missing` |
| AZ-004 | Commercial exchange is detected or declared | Create sexual-access workflow | Deny with `commercial_or_value_exchange_not_supported` |
| AZ-005 | Transport is conditioned on intimacy | Create transportation-for-intimacy workflow | Deny with `transport_conditioned_on_intimacy_not_supported` |
| AZ-006 | Exact location requested in discovery | Publish discovery card | Deny with `precise_location_sharing_not_available_in_this_flow` |
| AZ-007 | Commercial context is unknown | Request sensitive escalation | `review_required`; do not create the feature capability |
| AZ-008 | Private named venue requires unresolved policy context | Enable venue flow | `review_required`; do not disclose venue |

## Privacy and audit

| ID | Preconditions | Action | Expected result |
|---|---|---|---|
| AUDIT-001 | Compliance check is processed | Inspect audit event | Contains policy decision metadata only |
| AUDIT-002 | Compliance check includes private message text upstream | Inspect audit event | Message text absent |
| AUDIT-003 | Compliance check includes exact location upstream | Inspect audit event | Exact location absent and request rejected at boundary |
| AUDIT-004 | Grant is revoked | Inspect cache and async queue | Capability revoked before queued action delivery |
| AUDIT-005 | Retention deadline passes | Run deletion job | Operational decision event deleted/minimized per retention policy |
