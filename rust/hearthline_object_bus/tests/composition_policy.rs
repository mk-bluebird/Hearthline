use hearthline_object_bus::composition_policy::{
    validate_composition_edge, validate_manifest, CompositionEdge,
    CompositionPolicyError, ObjectManifest, PrivacyClass,
};
use hearthline_object_bus::RetentionClass;
use std::collections::BTreeSet;

fn privacy_set(values: &[PrivacyClass]) -> BTreeSet<PrivacyClass> {
    values.iter().copied().collect()
}

fn text_set(values: &[&str]) -> BTreeSet<String> {
    values.iter().map(|value| (*value).to_owned()).collect()
}

fn manifest(
    object_id: &str,
    privacy_class: PrivacyClass,
    retention_class: RetentionClass,
    input_classes: &[PrivacyClass],
    output_classes: &[PrivacyClass],
    local_only: bool,
) -> ObjectManifest {
    ObjectManifest {
        object_id: object_id.to_owned(),
        version: "v1".to_owned(),
        object_family: "synthetic_fixture".to_owned(),
        input_classes: privacy_set(input_classes),
        output_classes: privacy_set(output_classes),
        platform_scopes: text_set(&["private_preference_discussion"]),
        privacy_class,
        retention_class,
        accessibility_primitives: text_set(&["keyboard_activate", "text_first"]),
        noncommercial_constraints: text_set(&["no_value_for_intimacy"]),
        ranking_constraints: text_set(&["no_person_level_ranking"]),
        local_only,
        external_action_authorized: false,
        real_world_consent_claim: false,
        required_reviews: text_set(&["privacy_security", "accessibility"]),
        compatibility_range: "^1".to_owned(),
    }
}

#[test]
fn valid_purpose_limited_edge_is_accepted() {
    let source = manifest(
        "source",
        PrivacyClass::PurposeLimited,
        RetentionClass::PurposeLimited,
        &[PrivacyClass::RecipientScoped],
        &[PrivacyClass::RecipientScoped],
        false,
    );
    let target = manifest(
        "target",
        PrivacyClass::PurposeLimited,
        RetentionClass::PurposeLimited,
        &[PrivacyClass::RecipientScoped],
        &[PrivacyClass::PurposeLimited],
        false,
    );

    let edge = CompositionEdge {
        source_object_id: "source".to_owned(),
        source_output_class: PrivacyClass::RecipientScoped,
        target_object_id: "target".to_owned(),
        target_input_class: PrivacyClass::RecipientScoped,
    };

    assert_eq!(validate_composition_edge(&source, &target, &edge), Ok(()));
}

#[test]
fn local_only_manifest_requires_local_only_retention() {
    let invalid = manifest(
        "local",
        PrivacyClass::LocalOnly,
        RetentionClass::PurposeLimited,
        &[PrivacyClass::LocalOnly],
        &[PrivacyClass::LocalOnly],
        true,
    );

    assert_eq!(
        validate_manifest(&invalid),
        Err(CompositionPolicyError::RetentionClassMismatch)
    );
}

#[test]
fn non_local_manifest_rejects_local_only_retention() {
    let invalid = manifest(
        "invalid",
        PrivacyClass::PurposeLimited,
        RetentionClass::LocalOnly,
        &[PrivacyClass::PurposeLimited],
        &[PrivacyClass::PurposeLimited],
        false,
    );

    assert_eq!(
        validate_manifest(&invalid),
        Err(CompositionPolicyError::RetentionClassMismatch)
    );
}

#[test]
fn local_only_output_cannot_enter_composition() {
    let source = manifest(
        "local_source",
        PrivacyClass::LocalOnly,
        RetentionClass::LocalOnly,
        &[PrivacyClass::LocalOnly],
        &[PrivacyClass::LocalOnly],
        true,
    );
    let target = manifest(
        "target",
        PrivacyClass::PurposeLimited,
        RetentionClass::PurposeLimited,
        &[PrivacyClass::PurposeLimited],
        &[PrivacyClass::PurposeLimited],
        false,
    );

    let edge = CompositionEdge {
        source_object_id: "local_source".to_owned(),
        source_output_class: PrivacyClass::LocalOnly,
        target_object_id: "target".to_owned(),
        target_input_class: PrivacyClass::PurposeLimited,
    };

    assert_eq!(
        validate_composition_edge(&source, &target, &edge),
        Err(CompositionPolicyError::LocalOnlyOutputRejected)
    );
}

#[test]
fn recipient_scoped_output_cannot_flow_to_broad_discovery() {
    let source = manifest(
        "private_source",
        PrivacyClass::RecipientScoped,
        RetentionClass::PurposeLimited,
        &[PrivacyClass::RecipientScoped],
        &[PrivacyClass::RecipientScoped],
        false,
    );
    let target = manifest(
        "discovery_target",
        PrivacyClass::BroadDiscovery,
        RetentionClass::PurposeLimited,
        &[PrivacyClass::RecipientScoped],
        &[PrivacyClass::BroadDiscovery],
        false,
    );

    let edge = CompositionEdge {
        source_object_id: "private_source".to_owned(),
        source_output_class: PrivacyClass::RecipientScoped,
        target_object_id: "discovery_target".to_owned(),
        target_input_class: PrivacyClass::RecipientScoped,
    };

    assert_eq!(
        validate_composition_edge(&source, &target, &edge),
        Err(CompositionPolicyError::PrivateOutputToDiscoveryRejected)
    );
}

#[test]
fn recipient_scoped_output_cannot_flow_to_public_object() {
    let source = manifest(
        "private_source",
        PrivacyClass::RecipientScoped,
        RetentionClass::PurposeLimited,
        &[PrivacyClass::RecipientScoped],
        &[PrivacyClass::RecipientScoped],
        false,
    );
    let target = manifest(
        "public_target",
        PrivacyClass::Public,
        RetentionClass::PurposeLimited,
        &[PrivacyClass::RecipientScoped],
        &[PrivacyClass::Public],
        false,
    );

    let edge = CompositionEdge {
        source_object_id: "private_source".to_owned(),
        source_output_class: PrivacyClass::RecipientScoped,
        target_object_id: "public_target".to_owned(),
        target_input_class: PrivacyClass::RecipientScoped,
    };

    assert_eq!(
        validate_composition_edge(&source, &target, &edge),
        Err(CompositionPolicyError::PrivateOutputToPublicRejected)
    );
}

#[test]
fn recipient_scoped_output_cannot_flow_to_aggregate_only_object() {
    let source = manifest(
        "private_source",
        PrivacyClass::RecipientScoped,
        RetentionClass::PurposeLimited,
        &[PrivacyClass::RecipientScoped],
        &[PrivacyClass::RecipientScoped],
        false,
    );
    let target = manifest(
        "aggregate_target",
        PrivacyClass::AggregateOnly,
        RetentionClass::AggregateOnly,
        &[PrivacyClass::RecipientScoped],
        &[PrivacyClass::AggregateOnly],
        false,
    );

    let edge = CompositionEdge {
        source_object_id: "private_source".to_owned(),
        source_output_class: PrivacyClass::RecipientScoped,
        target_object_id: "aggregate_target".to_owned(),
        target_input_class: PrivacyClass::RecipientScoped,
    };

    assert_eq!(
        validate_composition_edge(&source, &target, &edge),
        Err(CompositionPolicyError::PrivateOutputToAggregateRejected)
    );
}

#[test]
fn mismatched_edge_classes_are_rejected() {
    let source = manifest(
        "source",
        PrivacyClass::Public,
        RetentionClass::Ephemeral,
        &[PrivacyClass::Public],
        &[PrivacyClass::Public],
        false,
    );
    let target = manifest(
        "target",
        PrivacyClass::Public,
        RetentionClass::Ephemeral,
        &[PrivacyClass::RecipientScoped],
        &[PrivacyClass::Public],
        false,
    );

    let edge = CompositionEdge {
        source_object_id: "source".to_owned(),
        source_output_class: PrivacyClass::Public,
        target_object_id: "target".to_owned(),
        target_input_class: PrivacyClass::RecipientScoped,
    };

    assert_eq!(
        validate_composition_edge(&source, &target, &edge),
        Err(CompositionPolicyError::IncompatibleInputOutput)
    );
}
