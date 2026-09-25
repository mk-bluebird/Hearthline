//! Integration tests for the Hearthline Object Bus policy boundary.
//!
//! All fixtures use fixed fictional references and canonical synthetic UTC
//! timestamps (e.g. `2030-01-01T00:00:00Z`). No actual user data, real
//! profiles, real message content, real venues, real identities, real
//! locations, or real consent/encounter records appear here.

use hearthline_object_bus::policy::{
    CorrelationClass, ExceptionalCorrelationRequest, PolicyError, PrimitiveKind, ScopeDefinition,
    select_primitive, validate_exceptional_correlation, validate_scope_definition,
};
use hearthline_object_bus::{
    BusError, HearthlineObjectBus, ObjectFamily, PlatformScope, RetentionClass,
    ScopedInteractionGrant, ScopedObjectNotice, SubscriptionCapability, TransitionKind,
};
use std::collections::BTreeSet;

const NOW: &str = "2030-01-01T00:00:00Z";
const FUTURE: &str = "2030-01-02T00:00:00Z";
const PAST: &str = "2029-12-31T23:59:59Z";

fn base_capability() -> SubscriptionCapability {
    SubscriptionCapability {
        subscription_id: "sub-fictional-1".to_string(),
        subscriber_family: "fictional-client-family".to_string(),
        allowed_object_families: BTreeSet::from([ObjectFamily::Conversation]),
        allowed_transition_kinds: BTreeSet::from([TransitionKind::AccessGranted]),
        allowed_scopes: BTreeSet::from([PlatformScope::DirectMessage]),
        retention_class: RetentionClass::Ephemeral,
        no_external_action: true,
        no_analytics_use: true,
        no_ranking_use: true,
        no_advertising_use: true,
        no_identity_inference: true,
    }
}

fn base_notice() -> ScopedObjectNotice {
    ScopedObjectNotice {
        notice_id: "notice-fictional-1".to_string(),
        schema_version: "1.0".to_string(),
        object_reference: "obj-fictional-0001".to_string(),
        object_family: ObjectFamily::Conversation,
        transition_kind: TransitionKind::AccessGranted,
        capability_scope: Some(PlatformScope::DirectMessage),
        audience_class: "fictional-audience-class".to_string(),
        retention_class: RetentionClass::Ephemeral,
        expires_at_utc: FUTURE.to_string(),
        correlation_boundary: "none".to_string(),
        external_action_authorized: false,
    }
}

fn base_grant() -> ScopedInteractionGrant {
    ScopedInteractionGrant {
        grant_id: "grant-fictional-1".to_string(),
        schema_version: "1.0".to_string(),
        owner_reference: "obj-fictional-owner-0001".to_string(),
        recipient_reference: "obj-fictional-recipient-0002".to_string(),
        platform_scope: PlatformScope::DirectMessage,
        purpose: "fictional platform direct-message interaction".to_string(),
        granted_at_utc: NOW.to_string(),
        expires_at_utc: FUTURE.to_string(),
        object_reference: "obj-fictional-0001".to_string(),
        retention_class: RetentionClass::PurposeLimited,
        external_action_authorized: false,
        real_world_consent_claim: false,
    }
}

fn base_scope_definition() -> ScopeDefinition {
    ScopeDefinition {
        scope: PlatformScope::DirectMessage,
        plain_language_name: "ask to start a chat".to_string(),
        platform_capability: "opens one in-app conversation thread".to_string(),
        does_not_mean: vec![
            "agreement to any real-world meeting".to_string(),
            "agreement to any real-world act".to_string(),
        ],
        retention_class: RetentionClass::PurposeLimited,
        real_world_act_claim: false,
        external_action_authorized: false,
    }
}

fn base_correlation_request() -> ExceptionalCorrelationRequest {
    ExceptionalCorrelationRequest {
        request_id: "corr-fictional-1".to_string(),
        correlation_class: CorrelationClass::Appeal,
        stated_purpose: "review a fictional appeal case".to_string(),
        minimum_object_families: BTreeSet::from(["conversation".to_string()]),
        minimum_time_window_minutes: 60,
        reviewer_authorization_id: "reviewer-auth-fictional-1".to_string(),
        retention_expires_at_utc: FUTURE.to_string(),
        no_ranking_use: true,
        no_advertising_use: true,
        no_external_action_without_separate_approval: true,
    }
}

// 1. Valid subscription accepts a compatible ephemeral notice.
#[test]
fn valid_subscription_accepts_compatible_ephemeral_notice() {
    let mut bus = HearthlineObjectBus::default();
    bus.subscribe(base_capability()).expect("valid subscription");
    bus.authorize_delivery("sub-fictional-1", &base_notice(), NOW)
        .expect("compatible ephemeral notice is authorized");
}

// 2. Subscription with `no_external_action = false` is rejected.
#[test]
fn subscription_allowing_external_action_is_rejected() {
    let mut bus = HearthlineObjectBus::default();
    let mut capability = base_capability();
    capability.no_external_action = false;
    assert_eq!(
        bus.subscribe(capability),
        Err(BusError::InvalidSubscriberConstraint)
    );
}

// 3. Subscription with `no_analytics_use = false` is rejected.
#[test]
fn subscription_allowing_analytics_use_is_rejected() {
    let mut bus = HearthlineObjectBus::default();
    let mut capability = base_capability();
    capability.no_analytics_use = false;
    assert_eq!(
        bus.subscribe(capability),
        Err(BusError::InvalidSubscriberConstraint)
    );
}

// 4. `LocalOnly` notice is rejected.
#[test]
fn local_only_notice_is_rejected() {
    let mut bus = HearthlineObjectBus::default();
    bus.subscribe(base_capability()).expect("valid subscription");
    let mut notice = base_notice();
    notice.retention_class = RetentionClass::LocalOnly;
    assert_eq!(
        bus.authorize_delivery("sub-fictional-1", &notice, NOW),
        Err(BusError::LocalOnlyNoticeRejected)
    );
}

// 5. Notice with external action authority is rejected.
#[test]
fn notice_with_external_action_authority_is_rejected() {
    let mut bus = HearthlineObjectBus::default();
    bus.subscribe(base_capability()).expect("valid subscription");
    let mut notice = base_notice();
    notice.external_action_authorized = true;
    assert_eq!(
        bus.authorize_delivery("sub-fictional-1", &notice, NOW),
        Err(BusError::ExternalActionRejected)
    );
}

// 6. Notice with unauthorized object family is rejected.
#[test]
fn notice_with_unauthorized_object_family_is_rejected() {
    let mut bus = HearthlineObjectBus::default();
    bus.subscribe(base_capability()).expect("valid subscription");
    let mut notice = base_notice();
    notice.object_family = ObjectFamily::Governance;
    assert_eq!(
        bus.authorize_delivery("sub-fictional-1", &notice, NOW),
        Err(BusError::SubscriptionNotAuthorized)
    );
}

// 7. Notice with unauthorized transition kind is rejected.
#[test]
fn notice_with_unauthorized_transition_kind_is_rejected() {
    let mut bus = HearthlineObjectBus::default();
    bus.subscribe(base_capability()).expect("valid subscription");
    let mut notice = base_notice();
    notice.transition_kind = TransitionKind::Deleted;
    assert_eq!(
        bus.authorize_delivery("sub-fictional-1", &notice, NOW),
        Err(BusError::SubscriptionNotAuthorized)
    );
}

// 8. Notice with unauthorized platform scope is rejected.
#[test]
fn notice_with_unauthorized_platform_scope_is_rejected() {
    let mut bus = HearthlineObjectBus::default();
    bus.subscribe(base_capability()).expect("valid subscription");
    let mut notice = base_notice();
    notice.capability_scope = Some(PlatformScope::VideoCallRequest);
    assert_eq!(
        bus.authorize_delivery("sub-fictional-1", &notice, NOW),
        Err(BusError::ScopeNotAuthorized)
    );
}

// 9. Notice with mismatched retention class is rejected.
#[test]
fn notice_with_mismatched_retention_class_is_rejected() {
    let mut bus = HearthlineObjectBus::default();
    bus.subscribe(base_capability()).expect("valid subscription");
    let mut notice = base_notice();
    notice.retention_class = RetentionClass::PurposeLimited;
    assert_eq!(
        bus.authorize_delivery("sub-fictional-1", &notice, NOW),
        Err(BusError::RetentionMismatch)
    );
}

// 10. Expired canonical UTC notice is rejected.
#[test]
fn expired_canonical_utc_notice_is_rejected() {
    let mut bus = HearthlineObjectBus::default();
    bus.subscribe(base_capability()).expect("valid subscription");
    let mut notice = base_notice();
    notice.expires_at_utc = PAST.to_string();
    assert_eq!(
        bus.authorize_delivery("sub-fictional-1", &notice, NOW),
        Err(BusError::ExpiredNoticeRejected)
    );
}

// Extra: non-canonical expiry timestamp is rejected as expired.
#[test]
fn non_canonical_notice_expiry_is_rejected() {
    let mut bus = HearthlineObjectBus::default();
    bus.subscribe(base_capability()).expect("valid subscription");
    let mut notice = base_notice();
    notice.expires_at_utc = "2030-01-02T00:00:00+00:00".to_string();
    assert_eq!(
        bus.authorize_delivery("sub-fictional-1", &notice, NOW),
        Err(BusError::ExpiredNoticeRejected)
    );
}

// 11. Valid grant passes validation.
#[test]
fn valid_grant_passes_validation() {
    assert_eq!(
        HearthlineObjectBus::validate_grant(&base_grant(), NOW),
        Ok(())
    );
}

// 12. Grant claiming real-world consent is rejected.
#[test]
fn grant_claiming_real_world_consent_is_rejected() {
    let mut grant = base_grant();
    grant.real_world_consent_claim = true;
    assert_eq!(
        HearthlineObjectBus::validate_grant(&grant, NOW),
        Err(BusError::RealWorldConsentClaimRejected)
    );
}

// 13. Grant authorizing external action is rejected.
#[test]
fn grant_authorizing_external_action_is_rejected() {
    let mut grant = base_grant();
    grant.external_action_authorized = true;
    assert_eq!(
        HearthlineObjectBus::validate_grant(&grant, NOW),
        Err(BusError::ExternalActionRejected)
    );
}

// 14. Expired grant is rejected.
#[test]
fn expired_grant_is_rejected() {
    let mut grant = base_grant();
    grant.expires_at_utc = PAST.to_string();
    assert_eq!(
        HearthlineObjectBus::validate_grant(&grant, NOW),
        Err(BusError::ExpiredGrantRejected)
    );
}

// 15. `select_primitive` returns `LocalOnly` first.
#[test]
fn select_primitive_returns_local_only_first() {
    assert_eq!(
        select_primitive(true, true, true),
        PrimitiveKind::LocalOnly
    );
    assert_eq!(
        select_primitive(false, true, false),
        PrimitiveKind::LocalOnly
    );
}

// 16. `select_primitive` returns `SessionSnapshot` before `ScopedNotice`.
#[test]
fn select_primitive_prefers_snapshot_over_notice() {
    assert_eq!(
        select_primitive(true, false, true),
        PrimitiveKind::SessionSnapshot
    );
    assert_eq!(
        select_primitive(true, false, false),
        PrimitiveKind::ScopedNotice
    );
    assert_eq!(
        select_primitive(false, false, false),
        PrimitiveKind::RequestResponse
    );
}

// 17. Valid scope definition passes.
#[test]
fn valid_scope_definition_passes() {
    assert_eq!(validate_scope_definition(&base_scope_definition()), Ok(()));
}

// 18. Scope definition with empty `does_not_mean` fails.
#[test]
fn scope_definition_with_empty_does_not_mean_fails() {
    let mut definition = base_scope_definition();
    definition.does_not_mean = Vec::new();
    assert_eq!(
        validate_scope_definition(&definition),
        Err(PolicyError::EmptyDoesNotMean)
    );
}

// 19. Scope definition claiming a real-world act fails.
#[test]
fn scope_definition_claiming_real_world_act_fails() {
    let mut definition = base_scope_definition();
    definition.real_world_act_claim = true;
    assert_eq!(
        validate_scope_definition(&definition),
        Err(PolicyError::RealWorldActScopeRejected)
    );
}

// Extra: scope definition authorizing external action fails.
#[test]
fn scope_definition_authorizing_external_action_fails() {
    let mut definition = base_scope_definition();
    definition.external_action_authorized = true;
    assert_eq!(
        validate_scope_definition(&definition),
        Err(PolicyError::ExternalActionRejected)
    );
}

// 20. Valid exceptional correlation request for an appeal passes.
#[test]
fn valid_appeal_correlation_request_passes() {
    assert_eq!(
        validate_exceptional_correlation(&base_correlation_request(), NOW),
        Ok(())
    );
}

// 21. Routine product correlation fails.
#[test]
fn routine_product_correlation_fails() {
    let mut request = base_correlation_request();
    request.correlation_class = CorrelationClass::RoutineProduct;
    assert_eq!(
        validate_exceptional_correlation(&request, NOW),
        Err(PolicyError::InvalidCorrelationClass)
    );
}

// 22. Analytics correlation fails.
#[test]
fn analytics_correlation_fails() {
    let mut request = base_correlation_request();
    request.correlation_class = CorrelationClass::Analytics;
    assert_eq!(
        validate_exceptional_correlation(&request, NOW),
        Err(PolicyError::InvalidCorrelationClass)
    );
}

// 23. Exceptional correlation request with `no_ranking_use = false` fails.
#[test]
fn correlation_request_allowing_ranking_use_fails() {
    let mut request = base_correlation_request();
    request.no_ranking_use = false;
    assert_eq!(
        validate_exceptional_correlation(&request, NOW),
        Err(PolicyError::MissingCorrelationSafeguard)
    );
}

// 24. `unsubscribe` removes a subscription and returns `true`.
#[test]
fn unsubscribe_removes_subscription_and_returns_true() {
    let mut bus = HearthlineObjectBus::default();
    bus.subscribe(base_capability()).expect("valid subscription");
    assert!(bus.unsubscribe("sub-fictional-1"));
    assert!(!bus.unsubscribe("sub-fictional-1"));
}

// 25. Inspecting an unsubscribed subscription returns `None`.
#[test]
fn inspecting_unsubscribed_subscription_returns_none() {
    let mut bus = HearthlineObjectBus::default();
    bus.subscribe(base_capability()).expect("valid subscription");
    assert!(bus.inspect_subscription_scope("sub-fictional-1").is_some());
    assert!(bus.unsubscribe("sub-fictional-1"));
    assert!(bus.inspect_subscription_scope("sub-fictional-1").is_none());
}
