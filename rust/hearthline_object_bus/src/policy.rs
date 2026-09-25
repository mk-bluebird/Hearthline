use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;

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

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GrantScope {
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

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ScopeDefinition {
    pub scope: GrantScope,
    pub plain_language_name: String,
    pub platform_capability: String,
    pub does_not_mean: Vec<String>,
    pub retention_class: String,
    pub real_world_act_claim: bool,
    pub external_action_authorized: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ExceptionalCorrelationRequest {
    pub request_id: String,
    pub correlation_class: CorrelationClass,
    pub stated_purpose: String,
    pub minimum_object_families: BTreeSet<String>,
    pub minimum_time_window_minutes: u32,
    pub reviewer_authorization_id: String,
    pub retention_expires_at_utc: String,
    pub no_ranking_use: bool,
    pub no_advertising_use: bool,
    pub no_external_action_without_separate_approval: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PolicyError {
    BusNotRequired,
    RealWorldActScopeRejected,
    ExternalActionRejected,
    InvalidCorrelationClass,
    MissingCorrelationSafeguard,
}

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

pub fn validate_scope_definition(
    definition: &ScopeDefinition,
) -> Result<(), PolicyError> {
    if definition.real_world_act_claim {
        return Err(PolicyError::RealWorldActScopeRejected);
    }

    if definition.external_action_authorized {
        return Err(PolicyError::ExternalActionRejected);
    }

    Ok(())
}

pub fn validate_exceptional_correlation(
    request: &ExceptionalCorrelationRequest,
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
        || request.minimum_object_families.is_empty()
        || request.minimum_time_window_minutes == 0
    {
        return Err(PolicyError::MissingCorrelationSafeguard);
    }

    Ok(())
}
