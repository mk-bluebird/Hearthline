//! Policy primitives for the Hearthline Object Bus.
//!
//! This module selects interaction primitives, validates human-readable scope
//! definitions, and screens *eligibility* of exceptional correlation requests
//! for a separately governed process. It does **not** implement any
//! correlation itself, and nothing here certifies real-world consent or
//! authorizes external action.

use crate::{PlatformScope, RetentionClass, is_canonical_utc_timestamp};
use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;

/// The channel class used to express an interaction.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PrimitiveKind {
    LocalOnly,
    RequestResponse,
    SessionSnapshot,
    ObjectLocalState,
    ScopedNotice,
    AggregateObservation,
    GovernanceCorrelation,
}

/// A requested correlation purpose. Only the four exceptional classes may
/// even be considered; routine product use, advertising, ranking, and
/// analytics correlations are always rejected.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CorrelationClass {
    RoutineProduct,
    Advertising,
    Ranking,
    Analytics,
    SecurityIncident,
    Appeal,
    RetentionAudit,
    AggregateAccessAudit,
}

/// A human-readable definition of what a platform scope means — and, just as
/// importantly, what it does not mean. Scope definitions that claim a
/// real-world act or authorize external action are invalid by construction.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ScopeDefinition {
    pub scope: PlatformScope,
    pub plain_language_name: String,
    pub platform_capability: String,
    /// Non-empty list of things this scope explicitly does NOT mean.
    pub does_not_mean: Vec<String>,
    pub retention_class: RetentionClass,
    /// Must be `false`: no scope may claim a real-world act.
    pub real_world_act_claim: bool,
    /// Must be `false`: no scope may authorize external action.
    pub external_action_authorized: bool,
}

/// A request asking whether cross-object correlation could be eligible for a
/// separately governed review process. Passing validation grants eligibility
/// screening only — never the correlation itself.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ExceptionalCorrelationRequest {
    pub request_id: String,
    pub correlation_class: CorrelationClass,
    pub stated_purpose: String,
    pub minimum_object_families: BTreeSet<String>,
    pub minimum_time_window_minutes: u32,
    pub reviewer_authorization_id: String,
    /// Canonical UTC expiry (`YYYY-MM-DDTHH:MM:SSZ`) for the correlated data.
    pub retention_expires_at_utc: String,
    pub no_ranking_use: bool,
    pub no_advertising_use: bool,
    pub no_external_action_without_separate_approval: bool,
}

/// Policy violations detected in this module.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PolicyError {
    RealWorldActScopeRejected,
    ExternalActionRejected,
    EmptyDoesNotMean,
    LocalOnlyRetentionRejected,
    InvalidCorrelationClass,
    MissingCorrelationSafeguard,
    EmptyObjectFamilySet,
    NonPositiveTimeWindow,
    MissingReviewerAuthorization,
    InvalidRetentionExpiry,
}

/// Select the smallest channel class that satisfies the stated needs.
///
/// Selection order (fixed):
/// 1. [`PrimitiveKind::LocalOnly`] when `local_only` is true.
/// 2. [`PrimitiveKind::SessionSnapshot`] when a current snapshot is required.
/// 3. [`PrimitiveKind::ScopedNotice`] only when a cross-object notice is
///    required.
/// 4. [`PrimitiveKind::RequestResponse`] otherwise.
pub fn select_primitive(
    requires_cross_object_notice: bool,
    local_only: bool,
    requires_current_snapshot: bool,
) -> PrimitiveKind {
    if local_only {
        PrimitiveKind::LocalOnly
    } else if requires_current_snapshot {
        PrimitiveKind::SessionSnapshot
    } else if requires_cross_object_notice {
        PrimitiveKind::ScopedNotice
    } else {
        PrimitiveKind::RequestResponse
    }
}

/// Validate a scope definition. Rejects real-world act claims, external
/// action authorization, empty `does_not_mean` lists, and `LocalOnly`
/// retention (local-only data never enters bus-visible scope definitions).
pub fn validate_scope_definition(
    definition: &ScopeDefinition,
) -> Result<(), PolicyError> {
    if definition.real_world_act_claim {
        return Err(PolicyError::RealWorldActScopeRejected);
    }

    if definition.external_action_authorized {
        return Err(PolicyError::ExternalActionRejected);
    }

    if definition.does_not_mean.is_empty() {
        return Err(PolicyError::EmptyDoesNotMean);
    }

    if definition.retention_class == RetentionClass::LocalOnly {
        return Err(PolicyError::LocalOnlyRetentionRejected);
    }

    Ok(())
}

/// Screen an exceptional correlation request for eligibility for a separately
/// governed process. This performs no correlation and stores nothing.
///
/// Allows only `SecurityIncident`, `Appeal`, `RetentionAudit`, and
/// `AggregateAccessAudit`. Requires a non-empty object-family set, a positive
/// minimum time window, a non-empty reviewer authorization ID, a valid future
/// canonical UTC retention expiry (relative to the passed-in `now_utc`), and
/// all three safeguard flags set to `true`.
pub fn validate_exceptional_correlation(
    request: &ExceptionalCorrelationRequest,
    now_utc: &str,
) -> Result<(), PolicyError> {
    match request.correlation_class {
        CorrelationClass::SecurityIncident
        | CorrelationClass::Appeal
        | CorrelationClass::RetentionAudit
        | CorrelationClass::AggregateAccessAudit => {}
        CorrelationClass::RoutineProduct
        | CorrelationClass::Advertising
        | CorrelationClass::Ranking
        | CorrelationClass::Analytics => {
            return Err(PolicyError::InvalidCorrelationClass);
        }
    }

    if !request.no_ranking_use
        || !request.no_advertising_use
        || !request.no_external_action_without_separate_approval
    {
        return Err(PolicyError::MissingCorrelationSafeguard);
    }

    if request.minimum_object_families.is_empty() {
        return Err(PolicyError::EmptyObjectFamilySet);
    }

    if request.minimum_time_window_minutes == 0 {
        return Err(PolicyError::NonPositiveTimeWindow);
    }

    if request.reviewer_authorization_id.trim().is_empty() {
        return Err(PolicyError::MissingReviewerAuthorization);
    }

    // The retention expiry must be canonical UTC and strictly in the future
    // relative to the caller-supplied reference time. Lexical comparison is
    // valid because both strings are canonical fixed-width UTC timestamps.
    if !is_canonical_utc_timestamp(&request.retention_expires_at_utc)
        || !is_canonical_utc_timestamp(now_utc)
        || request.retention_expires_at_utc <= now_utc
    {
        return Err(PolicyError::InvalidRetentionExpiry);
    }

    Ok(())
}
