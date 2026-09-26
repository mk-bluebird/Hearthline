use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PrivacyClass {
    Public,
    BroadDiscovery,
    RecipientScoped,
    PurposeLimited,
    LocalOnly,
    AggregateOnly,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RetentionClass {
    Ephemeral,
    PurposeLimited,
    AggregateOnly,
    LocalOnly,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ObjectManifest {
    pub object_id: String,
    pub version: String,
    pub object_family: String,
    pub input_classes: BTreeSet<PrivacyClass>,
    pub output_classes: BTreeSet<PrivacyClass>,
    pub platform_scopes: BTreeSet<String>,
    pub privacy_class: PrivacyClass,
    pub retention_class: RetentionClass,
    pub accessibility_primitives: BTreeSet<String>,
    pub noncommercial_constraints: BTreeSet<String>,
    pub ranking_constraints: BTreeSet<String>,
    pub local_only: bool,
    pub external_action_authorized: bool,
    pub real_world_consent_claim: bool,
    pub required_reviews: BTreeSet<String>,
    pub compatibility_range: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CompositionEdge {
    pub source_object_id: String,
    pub source_output_class: PrivacyClass,
    pub target_object_id: String,
    pub target_input_class: PrivacyClass,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CompositionPolicyError {
    UnknownObject,
    MissingManifest,
    ExternalActionRejected,
    RealWorldConsentClaimRejected,
    LocalOnlyOutputRejected,
    PrivateOutputToDiscoveryRejected,
    MissingAccessibilityPrimitive,
    RetentionClassMismatch,
    IncompatibleInputOutput,
    MissingRequiredReview,
}

pub fn validate_manifest(
    manifest: &ObjectManifest,
) -> Result<(), CompositionPolicyError> {
    if manifest.external_action_authorized {
        return Err(CompositionPolicyError::ExternalActionRejected);
    }

    if manifest.real_world_consent_claim {
        return Err(CompositionPolicyError::RealWorldConsentClaimRejected);
    }

    if manifest.local_only
        && (manifest.privacy_class != PrivacyClass::LocalOnly
            || manifest.retention_class != RetentionClass::LocalOnly)
    {
        return Err(CompositionPolicyError::RetentionClassMismatch);
    }

    if manifest.accessibility_primitives.is_empty() {
        return Err(CompositionPolicyError::MissingAccessibilityPrimitive);
    }

    if manifest.required_reviews.is_empty() {
        return Err(CompositionPolicyError::MissingRequiredReview);
    }

    Ok(())
}

pub fn validate_composition_edge(
    source: &ObjectManifest,
    target: &ObjectManifest,
    edge: &CompositionEdge,
) -> Result<(), CompositionPolicyError> {
    if source.object_id != edge.source_object_id || target.object_id != edge.target_object_id {
        return Err(CompositionPolicyError::UnknownObject);
    }

    if source.local_only || edge.source_output_class == PrivacyClass::LocalOnly {
        return Err(CompositionPolicyError::LocalOnlyOutputRejected);
    }

    if !source.output_classes.contains(&edge.source_output_class)
        || !target.input_classes.contains(&edge.target_input_class)
    {
        return Err(CompositionPolicyError::IncompatibleInputOutput);
    }

    if edge.source_output_class == PrivacyClass::RecipientScoped
        && target.privacy_class == PrivacyClass::BroadDiscovery
    {
        return Err(CompositionPolicyError::PrivateOutputToDiscoveryRejected);
    }

    Ok(())
}
