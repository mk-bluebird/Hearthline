use hearthline_object_bus::{
    BusError, HearthlineObjectBus, ObjectFamily, PlatformScope, RetentionClass,
    ScopedInteractionGrant, ScopedObjectNotice, SubscriptionCapability, TransitionKind,
};
use std::collections::BTreeSet;

fn object_family_set(values: &[ObjectFamily]) -> BTreeSet<ObjectFamily> {
    values.iter().copied().collect()
}

fn transition_set(values: &[TransitionKind]) -> BTreeSet<TransitionKind> {
    values.iter().copied().collect()
}

fn scope_set(values: &[PlatformScope]) -> BTreeSet<PlatformScope> {
    values.iter().copied().collect()
}

fn compliant_subscription(subscription_id: &str) -> SubscriptionCapability {
    SubscriptionCapability {
        subscription_id: subscription_id.to_owned(),
        subscriber_family: "meeting_plan_state".to_owned(),
        allowed_object_families: object_family_set(&[ObjectFamily::MeetingPlan]),
        allowed_transition_kinds: transition_set(&[
            TransitionKind::AccessGranted,
            TransitionKind::AccessRevoked,
            TransitionKind::Cancelled,
            TransitionKind::Expired,
        ]),
        allowed_scopes: scope_set(&[
            PlatformScope::MeetPlanDiscussion,
            PlatformScope::VenueContextDiscussion,
        ]),
        retention_class: RetentionClass::PurposeLimited,
        no_external_action: true,
        no_analytics_use: true,
        no_ranking_use: true,
        no_advertising_use: true,
        no_identity_inference: true,
    }
}

fn meeting_plan_notice() -> ScopedObjectNotice {
    ScopedObjectNotice {
        notice_id: "notice_fixture_meeting_plan_01".to_owned(),
        schema_version: "hearthline-scoped-object-notice-v1".to_owned(),
        object_reference: "object_fixture_meeting_plan_01".to_owned(),
        object_family: ObjectFamily::MeetingPlan,
        transition_kind: TransitionKind::AccessRevoked,
        capability_scope: Some(PlatformScope::MeetPlanDiscussion),
        audience_class: "meeting_plan_state".to_owned(),
        retention_class: RetentionClass::PurposeLimited,
        expires_at_utc: "2030-01-02T00:00:00Z".to_owned(),
        correlation_boundary: "boundary_fixture_meeting_plan_01".to_owned(),
        external_action_authorized: false,
    }
}

fn platform_interaction_grant() -> ScopedInteractionGrant {
    ScopedInteractionGrant {
        grant_id: "grant_fixture_message_01".to_owned(),
        schema_version: "hearthline-scoped-interaction-grant-v1".to_owned(),
        owner_reference: "owner_scope_fixture_01".to_owned(),
        recipient_reference: "recipient_scope_fixture_01".to_owned(),
        platform_scope: PlatformScope::DirectMessage,
        purpose: "Allow a current in-platform direct-message interaction.".to_owned(),
        granted_at_utc: "2030-01-01T00:00:00Z".to_owned(),
        expires_at_utc: "2030-01-02T00:00:00Z".to_owned(),
        object_reference: "object_fixture_conversation_01".to_owned(),
        retention_class: RetentionClass::PurposeLimited,
        external_action_authorized: false,
        real_world_consent_claim: false,
    }
}

#[test]
fn fixture_subscription_authorizes_fixture_notice() {
    let mut bus = HearthlineObjectBus::default();
    let subscription = compliant_subscription("subscription_fixture_01");

    bus.subscribe(subscription).expect("fixture subscription must be accepted");

    let result = bus.authorize_delivery(
        "subscription_fixture_01",
        &meeting_plan_notice(),
    );

    assert_eq!(result, Ok(()));
}

#[test]
fn fixture_grant_is_platform_interaction_only() {
    let grant = platform_interaction_grant();

    assert_eq!(
        HearthlineObjectBus::validate_grant(&grant),
        Ok(())
    );

    assert!(!grant.external_action_authorized);
    assert!(!grant.real_world_consent_claim);
}

#[test]
fn fixture_notice_cannot_be_promoted_to_external_action() {
    let mut bus = HearthlineObjectBus::default();

    bus.subscribe(compliant_subscription("subscription_fixture_02"))
        .expect("fixture subscription must be accepted");

    let mut notice = meeting_plan_notice();
    notice.external_action_authorized = true;

    assert_eq!(
        bus.authorize_delivery("subscription_fixture_02", &notice),
        Err(BusError::ExternalActionRejected)
    );
}

#[test]
fn fixture_local_only_notice_is_never_deliverable() {
    let mut bus = HearthlineObjectBus::default();

    bus.subscribe(compliant_subscription("subscription_fixture_03"))
        .expect("fixture subscription must be accepted");

    let mut notice = meeting_plan_notice();
    notice.retention_class = RetentionClass::LocalOnly;

    assert_eq!(
        bus.authorize_delivery("subscription_fixture_03", &notice),
        Err(BusError::LocalOnlyNoticeRejected)
    );
}
