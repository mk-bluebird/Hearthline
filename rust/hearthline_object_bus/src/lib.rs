//! Hearthline Object Bus: a deterministic, in-memory policy boundary for
//! privacy-bounded typed object notices and scoped platform-interaction grants.
//!
//! This crate is not a network transport, broker, database, global event log,
//! analytics system, ranking system, or real-world consent system. It validates
//! whether a subscription may exist, whether a notice may be delivered to a
//! given subscription, and whether an interaction grant is structurally valid.
//!
//! All references carried by public types are opaque and object-scoped. They
//! must never encode user, profile, account, device, location, or counterpart
//! identifiers.

use serde::{Deserialize, Serialize};
use std::collections::{BTreeSet, HashMap};

pub mod audit_policy;
pub mod composition_policy;
pub mod ephemeral_policy;
pub mod policy;

/// How long data of this class may be retained.
///
/// `LocalOnly` data never enters the bus. Notices, grants, and subscriptions
/// carrying this class are rejected.
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

/// Platform-interaction scopes only.
///
/// Deliberately excluded: touch, sex, sexual activity, private venue entry,
/// travel, alcohol, substance use, aftercare obligation, future contact,
/// location, identity, health records, financial data, housing, work, gifts,
/// payments, or any other real-world act.
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
    pub object_reference: String,
    pub object_family: ObjectFamily,
    pub transition_kind: TransitionKind,
    pub capability_scope: Option<PlatformScope>,
    pub audience_class: String,
    pub retention_class: RetentionClass,
    pub expires_at_utc: String,
    pub correlation_boundary: String,
    pub external_action_authorized: bool,
}

/// What a subscriber is allowed to receive, plus mandatory usage constraints.
///
/// Every `no_*` field must be `true` for the subscription to be accepted.
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
/// A grant is not proof of consent to any real-world act. It does not certify
/// consent, legal validity, identity, health, safety, intention, meeting
/// attendance, travel, touch, sexual activity, private venue entry, aftercare,
/// or future contact.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ScopedInteractionGrant {
    pub grant_id: String,
    pub schema_version: String,
    pub owner_reference: String,
    pub recipient_reference: String,
    pub platform_scope: PlatformScope,
    pub purpose: String,
    pub granted_at_utc: String,
    pub expires_at_utc: String,
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
    DuplicateSubscription,
    ExpiredNoticeRejected,
    ExpiredGrantRejected,
    InvalidSchemaVersion,
    InvalidReference,
    InvalidTimestamp,
    InvalidGrantWindow,
}

const CANONICAL_TIMESTAMP_LEN: usize = "YYYY-MM-DDTHH:MM:SSZ".len();

fn is_leap_year(year: u16) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

fn days_in_month(year: u16, month: u8) -> Option<u8> {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => Some(31),
        4 | 6 | 9 | 11 => Some(30),
        2 if is_leap_year(year) => Some(29),
        2 => Some(28),
        _ => None,
    }
}

fn two_digit(bytes: &[u8], first: usize) -> u8 {
    (bytes[first] - b'0') * 10 + (bytes[first + 1] - b'0')
}

fn four_digit(bytes: &[u8], first: usize) -> u16 {
    u16::from(bytes[first] - b'0') * 1000
        + u16::from(bytes[first + 1] - b'0') * 100
        + u16::from(bytes[first + 2] - b'0') * 10
        + u16::from(bytes[first + 3] - b'0')
}

/// Validates the exact canonical UTC format `YYYY-MM-DDTHH:MM:SSZ`.
///
/// The parser rejects fractional seconds, offsets, lowercase delimiters,
/// invalid month/day combinations, leap-second values, and non-canonical input.
/// Lexical comparison is safe only after this fixed-width UTC validation.
pub fn is_canonical_utc_timestamp(value: &str) -> bool {
    let bytes = value.as_bytes();

    if bytes.len() != CANONICAL_TIMESTAMP_LEN {
        return false;
    }

    let digit = |index: usize| bytes[index].is_ascii_digit();

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

    let year = four_digit(bytes, 0);
    let month = two_digit(bytes, 5);
    let day = two_digit(bytes, 8);
    let hour = two_digit(bytes, 11);
    let minute = two_digit(bytes, 14);
    let second = two_digit(bytes, 17);

    let Some(max_day) = days_in_month(year, month) else {
        return false;
    };

    (1..=max_day).contains(&day) && hour <= 23 && minute <= 59 && second <= 59
}

fn is_expired(timestamp: &str, now_utc: &str) -> bool {
    if !is_canonical_utc_timestamp(timestamp) || !is_canonical_utc_timestamp(now_utc) {
        return true;
    }

    timestamp <= now_utc
}

fn has_text(value: &str) -> bool {
    !value.trim().is_empty()
}

fn check_schema_version(schema_version: &str) -> Result<(), BusError> {
    if !has_text(schema_version) {
        return Err(BusError::InvalidSchemaVersion);
    }

    Ok(())
}

fn check_reference(reference: &str) -> Result<(), BusError> {
    if !has_text(reference) {
        return Err(BusError::InvalidReference);
    }

    Ok(())
}

fn check_notice_structure(notice: &ScopedObjectNotice) -> Result<(), BusError> {
    check_reference(&notice.notice_id)?;
    check_schema_version(&notice.schema_version)?;
    check_reference(&notice.object_reference)?;
    check_reference(&notice.audience_class)?;
    check_reference(&notice.correlation_boundary)?;

    if !is_canonical_utc_timestamp(&notice.expires_at_utc) {
        return Err(BusError::InvalidTimestamp);
    }

    Ok(())
}

fn check_grant_structure(grant: &ScopedInteractionGrant) -> Result<(), BusError> {
    check_reference(&grant.grant_id)?;
    check_schema_version(&grant.schema_version)?;
    check_reference(&grant.owner_reference)?;
    check_reference(&grant.recipient_reference)?;
    check_reference(&grant.purpose)?;
    check_reference(&grant.object_reference)?;

    if !is_canonical_utc_timestamp(&grant.granted_at_utc)
        || !is_canonical_utc_timestamp(&grant.expires_at_utc)
    {
        return Err(BusError::InvalidTimestamp);
    }

    if grant.expires_at_utc <= grant.granted_at_utc {
        return Err(BusError::InvalidGrantWindow);
    }

    Ok(())
}

/// A deterministic in-memory policy boundary.
///
/// It stores only current subscription capabilities. It performs no persistence,
/// transport, queuing, retries, dead-letter handling, logging, or
/// cross-subscriber fan-out. There is deliberately no publish method.
#[derive(Default)]
pub struct HearthlineObjectBus {
    subscriptions: HashMap<String, SubscriptionCapability>,
}

impl HearthlineObjectBus {
    /// Register a subscription capability.
    pub fn subscribe(
        &mut self,
        capability: SubscriptionCapability,
    ) -> Result<(), BusError> {
        check_reference(&capability.subscription_id)?;
        check_reference(&capability.subscriber_family)?;

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

        if capability.allowed_object_families.is_empty()
            || capability.allowed_transition_kinds.is_empty()
        {
            return Err(BusError::InvalidSubscriberConstraint);
        }

        if self.subscriptions.contains_key(&capability.subscription_id) {
            return Err(BusError::DuplicateSubscription);
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

    /// Decide whether `notice` may be delivered to `subscription_id`.
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

        check_notice_structure(notice)?;

        if !is_canonical_utc_timestamp(now_utc) {
            return Err(BusError::InvalidTimestamp);
        }

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

        if !subscription
            .allowed_object_families
            .contains(&notice.object_family)
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

    /// Structurally validate a scoped platform-interaction grant.
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

        check_grant_structure(grant)?;

        if !is_canonical_utc_timestamp(now_utc) {
            return Err(BusError::InvalidTimestamp);
        }

        if is_expired(&grant.expires_at_utc, now_utc) {
            return Err(BusError::ExpiredGrantRejected);
        }

        Ok(())
    }
}
