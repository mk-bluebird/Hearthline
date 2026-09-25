//! Hearthline Object Bus: a deterministic, in-memory policy boundary for
//! privacy-bounded typed object notices and scoped platform-interaction
//! grants.
//!
//! This crate is **not** a network transport, broker, database, global event
//! log, or real-world consent system. It only validates policy: whether a
//! subscription may exist, whether a notice may be delivered to a given
//! subscription, and whether an interaction grant is structurally valid.
//!
//! All references ([`ScopedObjectNotice::object_reference`],
//! [`ScopedInteractionGrant::owner_reference`],
//! [`ScopedInteractionGrant::recipient_reference`]) are opaque, object-scoped
//! strings. They must never carry user, profile, account, device, or
//! counterparty identifiers.

use serde::{Deserialize, Serialize};
use std::collections::{BTreeSet, HashMap};

/// How long data of this class may be retained. `LocalOnly` data never enters
/// the bus; notices, grants, and subscriptions carrying it are rejected.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RetentionClass {
    Ephemeral,
    PurposeLimited,
    AggregateOnly,
    LocalOnly,
}

/// The family of domain objects a notice can refer to.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ObjectFamily {
    Discovery,
    Conversation,
    MeetingPlan,
    PrivacyPreference,
    PreferenceDiscussion,
    SafetyReport,
    Governance,
}

/// The state transition a notice announces about an object.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TransitionKind {
    AccessGranted,
    AccessRevoked,
    Paused,
    Resumed,
    Expired,
    Deleted,
    Cancelled,
}

/// Platform-interaction scopes only. Deliberately excluded: touch, sex,
/// sexual activity, private venue entry, travel, alcohol, substance use,
/// aftercare obligation, future contact, location, identity, health records,
/// financial data, housing, work, gifts, payments, or any other real-world
/// act. A `PlatformScope` authorizes an interaction inside the product only.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PlatformScope {
    DirectMessage,
    VoiceCallRequest,
    VideoCallRequest,
    MediaReceiveRequest,
    PrivatePreferenceDiscussion,
    MeetPlanDiscussion,
    VenueContextDiscussion,
    AftercareDiscussion,
    PrivacyPreferenceDiscussion,
    HealthConversationOpener,
}

/// A minimal envelope announcing that an object changed state.
///
/// The envelope intentionally carries no actor IDs, user IDs, profile IDs,
/// counterparty IDs, account IDs, device IDs, IP addresses, locations, raw
/// text, message content, private preferences, health data, identity data,
/// financial data, analytics IDs, trace IDs, safety scores, risk scores,
/// ranking values, or consent-proof fields.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ScopedObjectNotice {
    pub notice_id: String,
    pub schema_version: String,
    /// Opaque, object-scoped reference. Not a user or account identifier.
    pub object_reference: String,
    pub object_family: ObjectFamily,
    pub transition_kind: TransitionKind,
    pub capability_scope: Option<PlatformScope>,
    pub audience_class: String,
    pub retention_class: RetentionClass,
    /// Canonical UTC expiry: `YYYY-MM-DDTHH:MM:SSZ`.
    pub expires_at_utc: String,
    pub correlation_boundary: String,
    pub external_action_authorized: bool,
}

/// What a subscriber is allowed to receive, plus mandatory usage constraints.
/// Every `no_*` flag must be `true` for the subscription to be accepted.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SubscriptionCapability {
    pub subscription_id: String,
    pub subscriber_family: String,
    pub allowed_object_families: BTreeSet<ObjectFamily>,
    pub allowed_transition_kinds: BTreeSet<TransitionKind>,
    pub allowed_scopes: BTreeSet<PlatformScope>,
    pub retention_class: RetentionClass,
    pub no_external_action: bool,
    pub no_analytics_use: bool,
    pub no_ranking_use: bool,
    pub no_advertising_use: bool,
    pub no_identity_inference: bool,
}

/// A scoped permission for a platform interaction only.
///
/// A grant is **not** proof of consent to any real-world act. It does not
/// certify consent, legal validity, identity, health, safety, intention,
/// meeting attendance, travel, touch, sexual activity, private venue entry,
/// aftercare, or future contact. Grants with
/// [`ScopedInteractionGrant::real_world_consent_claim`] set to `true` are
/// rejected.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ScopedInteractionGrant {
    pub grant_id: String,
    pub schema_version: String,
    /// Object-scoped opaque reference. Not a public identity, account,
    /// profile, or counterparty ID.
    pub owner_reference: String,
    /// Object-scoped opaque reference. Not a public identity, account,
    /// profile, or counterparty ID.
    pub recipient_reference: String,
    pub platform_scope: PlatformScope,
    pub purpose: String,
    /// Canonical UTC timestamp: `YYYY-MM-DDTHH:MM:SSZ`.
    pub granted_at_utc: String,
    /// Canonical UTC timestamp: `YYYY-MM-DDTHH:MM:SSZ`.
    pub expires_at_utc: String,
    /// Opaque, object-scoped reference. Not a user or account identifier.
    pub object_reference: String,
    pub retention_class: RetentionClass,
    pub external_action_authorized: bool,
    pub real_world_consent_claim: bool,
}

/// Policy violations detected by the bus.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BusError {
    LocalOnlyNoticeRejected,
    ExternalActionRejected,
    SubscriptionNotAuthorized,
    RetentionMismatch,
    ScopeNotAuthorized,
    RealWorldConsentClaimRejected,
    InvalidSubscriberConstraint,
    ExpiredNoticeRejected,
    ExpiredGrantRejected,
    InvalidSchemaVersion,
}

const CANONICAL_TIMESTAMP_LEN: usize = "YYYY-MM-DDTHH:MM:SSZ".len();

/// Validates the exact canonical UTC format `YYYY-MM-DDTHH:MM:SSZ`.
///
/// This is deliberately strict and simple: non-canonical timestamps (offsets,
/// fractional seconds, lowercase `t`/`z`, out-of-range components) are
/// rejected rather than normalized. No time crate is used.
fn is_canonical_utc_timestamp(value: &str) -> bool {
    let bytes = value.as_bytes();
    if bytes.len() != CANONICAL_TIMESTAMP_LEN {
        return false;
    }
    let digit = |i: usize| bytes[i].is_ascii_digit();
    // Layout: 2030-01-01T00:00:00Z
    let shape_ok = digit(0)
        && digit(1)
        && digit(2)
        && digit(3)
        && bytes[4] == b'-'
        && digit(5)
        && digit(6)
        && bytes[7] == b'-'
        && digit(8)
        && digit(9)
        && bytes[10] == b'T'
        && digit(11)
        && digit(12)
        && bytes[13] == b':'
        && digit(14)
        && digit(15)
        && bytes[16] == b':'
        && digit(17)
        && digit(18)
        && bytes[19] == b'Z';
    if !shape_ok {
        return false;
    }
    let month = (bytes[5] - b'0') * 10 + (bytes[6] - b'0');
    let day = (bytes[8] - b'0') * 10 + (bytes[9] - b'0');
    let hour = (bytes[11] - b'0') * 10 + (bytes[12] - b'0');
    let minute = (bytes[14] - b'0') * 10 + (bytes[15] - b'0');
    let second = (bytes[17] - b'0') * 10 + (bytes[18] - b'0');
    (1..=12).contains(&month)
        && (1..=31).contains(&day)
        && hour <= 23
        && minute <= 59
        && second <= 59
}

/// Returns `true` when `timestamp` denotes a moment at or before `now_utc`.
/// Both inputs must be canonical UTC timestamps; a malformed timestamp is
/// treated as expired (rejected). Lexical comparison is safe only because the
/// canonical format is fixed-width and big-endian.
fn is_expired(timestamp: &str, now_utc: &str) -> bool {
    if !is_canonical_utc_timestamp(timestamp) || !is_canonical_utc_timestamp(now_utc) {
        return true;
    }
    timestamp <= now_utc
}

/// Validate a schema version string (non-empty).
fn check_schema_version(schema_version: &str) -> Result<(), BusError> {
    if schema_version.trim().is_empty() {
        return Err(BusError::InvalidSchemaVersion);
    }
    Ok(())
}

/// A deterministic in-memory policy boundary. It stores only current
/// subscription capabilities; it performs no persistence, transport, queuing,
/// retries, dead-letter handling, logging, or cross-subscriber fan-out. There
/// is deliberately no publish method: this milestone implements only policy
/// validation and delivery authorization.
#[derive(Default)]
pub struct HearthlineObjectBus {
    subscriptions: HashMap<String, SubscriptionCapability>,
}

impl HearthlineObjectBus {
    /// Register a subscription capability.
    ///
    /// Rejects subscriptions that permit external action, analytics, ranking,
    /// advertising, or identity inference, and rejects `LocalOnly`
    /// subscriptions.
    pub fn subscribe(
        &mut self,
        capability: SubscriptionCapability,
    ) -> Result<(), BusError> {
        if !capability.no_external_action
            || !capability.no_analytics_use
            || !capability.no_ranking_use
            || !capability.no_advertising_use
            || !capability.no_identity_inference
        {
            return Err(BusError::InvalidSubscriberConstraint);
        }

        if capability.retention_class == RetentionClass::LocalOnly {
            return Err(BusError::LocalOnlyNoticeRejected);
        }

        self.subscriptions
            .insert(capability.subscription_id.clone(), capability);

        Ok(())
    }

    /// Remove a subscription. Returns `true` if it existed.
    pub fn unsubscribe(&mut self, subscription_id: &str) -> bool {
        self.subscriptions.remove(subscription_id).is_some()
    }

    /// Inspect a stored subscription capability.
    pub fn inspect_subscription_scope(
        &self,
        subscription_id: &str,
    ) -> Option<&SubscriptionCapability> {
        self.subscriptions.get(subscription_id)
    }

    /// Decide whether `notice` may be delivered to the subscription named by
    /// `subscription_id`, evaluated against the passed-in UTC reference
    /// timestamp `now_utc`.
    ///
    /// Enforces: no `LocalOnly` notices, no external-action notices, valid
    /// schema version, unexpired canonical expiry, subscription existence,
    /// retention match, and allowed family / transition / scope sets.
    pub fn authorize_delivery(
        &self,
        subscription_id: &str,
        notice: &ScopedObjectNotice,
        now_utc: &str,
    ) -> Result<(), BusError> {
        if notice.retention_class == RetentionClass::LocalOnly {
            return Err(BusError::LocalOnlyNoticeRejected);
        }

        if notice.external_action_authorized {
            return Err(BusError::ExternalActionRejected);
        }

        check_schema_version(&notice.schema_version)?;

        if is_expired(&notice.expires_at_utc, now_utc) {
            return Err(BusError::ExpiredNoticeRejected);
        }

        let subscription = self
            .subscriptions
            .get(subscription_id)
            .ok_or(BusError::SubscriptionNotAuthorized)?;

        if subscription.retention_class != notice.retention_class {
            return Err(BusError::RetentionMismatch);
        }

        if !subscription.allowed_object_families.contains(&notice.object_family)
            || !subscription
                .allowed_transition_kinds
                .contains(&notice.transition_kind)
        {
            return Err(BusError::SubscriptionNotAuthorized);
        }

        if let Some(scope) = notice.capability_scope {
            if !subscription.allowed_scopes.contains(&scope) {
                return Err(BusError::ScopeNotAuthorized);
            }
        }

        Ok(())
    }

    /// Structurally validate a scoped platform-interaction grant against the
    /// passed-in UTC reference timestamp `now_utc`.
    ///
    /// Rejects external-action grants, real-world consent claims, `LocalOnly`
    /// retention, invalid schema versions, and expired canonical timestamps.
    /// A passing grant is still only a platform-interaction permission; it is
    /// never proof of real-world consent.
    pub fn validate_grant(
        grant: &ScopedInteractionGrant,
        now_utc: &str,
    ) -> Result<(), BusError> {
        if grant.external_action_authorized {
            return Err(BusError::ExternalActionRejected);
        }

        if grant.real_world_consent_claim {
            return Err(BusError::RealWorldConsentClaimRejected);
        }

        if grant.retention_class == RetentionClass::LocalOnly {
            return Err(BusError::LocalOnlyNoticeRejected);
        }

        check_schema_version(&grant.schema_version)?;

        if is_expired(&grant.expires_at_utc, now_utc) {
            return Err(BusError::ExpiredGrantRejected);
        }

        Ok(())
    }
}

pub mod policy;
