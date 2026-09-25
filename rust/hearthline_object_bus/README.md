# Hearthline Object Bus

A deterministic, in-memory **policy boundary** for privacy-bounded typed
object notices and scoped platform-interaction grants in Hearthline.

## 1. Purpose and non-goals

The crate answers exactly three questions:

1. May this subscription exist? (`HearthlineObjectBus::subscribe`)
2. May this notice be delivered to this subscription?
   (`HearthlineObjectBus::authorize_delivery`)
3. Is this interaction grant structurally valid?
   (`HearthlineObjectBus::validate_grant`)

It is **not** a transport layer, message queue, or consent registry.

```text
This crate does not implement a network bus, a broker, a database, a global
event log, cryptography, message transport, user identity, location handling,
medical handling, real-world consent certification, payment, matching, ranking,
advertising, analytics, emergency response, or external action.
```

There is deliberately no `publish` method and no event fan-out; only policy
validation and delivery authorization are implemented.

## 2. Object-notice channel classes

Notices (`ScopedObjectNotice`) carry an `ObjectFamily`
(`discovery`, `conversation`, `meeting_plan`, `privacy_preference`,
`preference_discussion`, `safety_report`, `governance`), a `TransitionKind`
(`access_granted`, `access_revoked`, `paused`, `resumed`, `expired`,
`deleted`, `cancelled`), an optional `PlatformScope`, a `RetentionClass`, and a
correlation boundary label. A notice announces only that an object changed
state; it carries no payload.

Allowed platform scopes are limited to in-product interactions:
`direct_message`, `voice_call_request`, `video_call_request`,
`media_receive_request`, `private_preference_discussion`,
`meet_plan_discussion`, `venue_context_discussion`, `aftercare_discussion`,
`privacy_preference_discussion`, and `health_conversation_opener`. No scope
exists for touch, sex, sexual activity, private venue entry, travel, alcohol,
substance use, aftercare obligation, future contact, location, identity,
health records, financial data, housing, work, gifts, payments, or any other
real-world act.

## 3. Prohibited envelope fields

`ScopedObjectNotice` must never gain actor IDs, user IDs, profile IDs,
counterparty IDs, account IDs, device IDs, IP addresses, locations, raw text,
message content, private preferences, health data, identity data, financial
data, analytics IDs, trace IDs, safety scores, risk scores, ranking values, or
consent-proof fields. All reference fields (`object_reference`,
`owner_reference`, `recipient_reference`) are opaque, object-scoped strings —
never public identity, account, profile, or counterparty identifiers.

## 4. Scoped interaction grants are not real-world consent

```text
A platform interaction grant is not proof of consent to a real-world act. It
does not certify consent, legal validity, identity, health, safety, intention,
meeting attendance, travel, touch, sexual activity, private venue entry,
aftercare, or future contact.
```

`validate_grant` rejects any grant with `real_world_consent_claim = true`
(`BusError::RealWorldConsentClaimRejected`) and any grant with
`external_action_authorized = true` (`BusError::ExternalActionRejected`). The
crate neither proves nor records real-world consent.

## 5. Primitive selection

`policy::select_primitive` chooses the smallest channel class in a fixed
order:

1. `LocalOnly` when the interaction stays on-device.
2. `SessionSnapshot` when a current snapshot is required.
3. `ScopedNotice` only when a cross-object notice is required.
4. `RequestResponse` otherwise.

## 6. Exceptional correlation policy

`policy::validate_exceptional_correlation` only screens *eligibility* for a
separately governed review process; it never performs correlation itself.
Only `SecurityIncident`, `Appeal`, `RetentionAudit`, and
`AggregateAccessAudit` requests may pass screening. `RoutineProduct`,
`Advertising`, `Ranking`, and `Analytics` correlations are always rejected.
Passing requires a non-empty object-family set, a positive minimum time
window, a non-empty reviewer authorization ID, a valid future canonical UTC
retention expiry (relative to a caller-supplied reference time), and all of
`no_ranking_use`, `no_advertising_use`, and
`no_external_action_without_separate_approval` set to `true`.

## 7. Revocation boundary

Revocation flows through the same policy gate as every other transition. An
`access_revoked`, `expired`, `deleted`, or `cancelled` notice is subject to the
same family / transition / scope / retention checks, and `unsubscribe`
immediately removes a subscription's capability from the in-memory store —
afterwards `inspect_subscription_scope` returns `None` and `authorize_delivery`
fails with `SubscriptionNotAuthorized`. The bus keeps no delivery history, so
revocation takes effect at once with no residual state to purge.

## 8. Local-only object exclusion

`LocalOnly` data never enters the bus. `subscribe` rejects `LocalOnly`
subscriptions, `authorize_delivery` rejects `LocalOnly` notices, and
`validate_grant` rejects `LocalOnly` grants — each with
`BusError::LocalOnlyNoticeRejected`. Scope definitions with `LocalOnly`
retention are likewise rejected by `validate_scope_definition`.

## 9. Canonical UTC timestamp limitation

Timestamps must match the exact canonical format:

```text
YYYY-MM-DDTHH:MM:SSZ
```

Non-canonical timestamps (offsets such as `+00:00`, fractional seconds,
lowercase `t`/`z`, out-of-range components) are rejected rather than
normalized. Expiry checks compare two validated canonical strings
**lexically**, which is correct only because the format is fixed-width and
big-endian. There is no timezone conversion, no leap-second handling, and no
full calendar validation (e.g. day 31 is accepted in every month). Callers
must supply their own UTC reference timestamp; the crate reads no clock.

## 10. Security and privacy limitations

- In-memory only: no persistence, transport, queuing, retries, dead-letter
  handling, logging, or cross-subscriber delivery history.
- Subscriptions that permit external action, analytics, ranking, advertising,
  or identity inference are rejected at registration
  (`BusError::InvalidSubscriberConstraint`).
- Notices authorizing external action are rejected
  (`BusError::ExternalActionRejected`).
- Empty schema versions are rejected (`BusError::InvalidSchemaVersion`).
- This is a policy-validation library, not a security perimeter; callers must
  enforce authentication, authorization, and transport security outside it.
- Nothing here constitutes legal advice or a compliance certification.

## 11. Test coverage summary

Integration tests live in `tests/object_bus_policy.rs` (all fixtures use
fictional references and synthetic timestamps such as
`2030-01-01T00:00:00Z`):

| # | Test | Covers |
|---|------|--------|
| 1 | `valid_subscription_accepts_compatible_ephemeral_notice` | happy-path delivery authorization |
| 2 | `subscription_allowing_external_action_is_rejected` | subscriber constraint |
| 3 | `subscription_allowing_analytics_use_is_rejected` | subscriber constraint |
| 4 | `local_only_notice_is_rejected` | local-only exclusion |
| 5 | `notice_with_external_action_authority_is_rejected` | external-action rejection |
| 6 | `notice_with_unauthorized_object_family_is_rejected` | family allow-list |
| 7 | `notice_with_unauthorized_transition_kind_is_rejected` | transition allow-list |
| 8 | `notice_with_unauthorized_platform_scope_is_rejected` | scope allow-list |
| 9 | `notice_with_mismatched_retention_class_is_rejected` | retention matching |
| 10 | `expired_canonical_utc_notice_is_rejected` | notice expiry |
| 11 | `non_canonical_notice_expiry_is_rejected` | canonical-format strictness |
| 12 | `valid_grant_passes_validation` | grant happy path |
| 13 | `grant_claiming_real_world_consent_is_rejected` | real-world consent rejection |
| 14 | `grant_authorizing_external_action_is_rejected` | grant external-action rejection |
| 15 | `expired_grant_is_rejected` | grant expiry |
| 16 | `select_primitive_returns_local_only_first` | primitive ordering |
| 17 | `select_primitive_prefers_snapshot_over_notice` | primitive ordering |
| 18 | `valid_scope_definition_passes` | scope definition validation |
| 19 | `scope_definition_with_empty_does_not_mean_fails` | `does_not_mean` requirement |
| 20 | `scope_definition_claiming_real_world_act_fails` | real-world act rejection |
| 21 | `scope_definition_authorizing_external_action_fails` | scope external-action rejection |
| 22 | `valid_appeal_correlation_request_passes` | exceptional correlation screening |
| 23 | `routine_product_correlation_fails` | prohibited correlation class |
| 24 | `analytics_correlation_fails` | prohibited correlation class |
| 25 | `correlation_request_allowing_ranking_use_fails` | safeguard flags |
| 26 | `unsubscribe_removes_subscription_and_returns_true` | revocation boundary |
| 27 | `inspecting_unsubscribed_subscription_returns_none` | revocation boundary |

## License

Licensed under either of `MIT OR Apache-2.0` at your option.
