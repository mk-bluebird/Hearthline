use serde::{Deserialize, Serialize};
use std::collections::{BTreeSet, HashMap};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RetentionClass {
    Ephemeral,
    PurposeLimited,
    AggregateOnly,
    LocalOnly,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
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

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BusError {
    LocalOnlyNoticeRejected,
    ExternalActionRejected,
    SubscriptionNotAuthorized,
    RetentionMismatch,
    ScopeNotAuthorized,
    RealWorldConsentClaimRejected,
    InvalidSubscriberConstraint,
}

#[derive(Default)]
pub struct HearthlineObjectBus {
    subscriptions: HashMap<String, SubscriptionCapability>,
}

impl HearthlineObjectBus {
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

    pub fn inspect_subscription_scope(
        &self,
        subscription_id: &str,
    ) -> Option<&SubscriptionCapability> {
        self.subscriptions.get(subscription_id)
    }

    pub fn authorize_delivery(
        &self,
        subscription_id: &str,
        notice: &ScopedObjectNotice,
    ) -> Result<(), BusError> {
        if notice.retention_class == RetentionClass::LocalOnly {
            return Err(BusError::LocalOnlyNoticeRejected);
        }

        if notice.external_action_authorized {
            return Err(BusError::ExternalActionRejected);
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

    pub fn validate_grant(
        grant: &ScopedInteractionGrant,
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

        Ok(())
    }
}
