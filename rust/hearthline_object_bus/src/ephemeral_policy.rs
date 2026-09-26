use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EphemeralObjectClass {
    LocalOnlyReflection,
    LocalExportableReflection,
    PurposeLimitedPairwiseContext,
    EphemeralServerCiphertext,
    AggregateOnlyMeasure,
    GovernanceRecord,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EphemeralStorageMode {
    BrowserMemoryOnly,
    ExplicitLocalEncryptedStore,
    LocalFileExportOnly,
    SyntheticCiphertextTransport,
    ReviewedServerCiphertextStore,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EphemeralStorageDeclaration {
    pub object_class: EphemeralObjectClass,
    pub storage_mode: EphemeralStorageMode,
    pub network_transport_allowed: bool,
    pub plaintext_server_storage_allowed: bool,
    pub external_action_authorized: bool,
    pub ordinary_backup_allowed: bool,
    pub ordinary_cache_allowed: bool,
    pub ordinary_analytics_allowed: bool,
    pub ordinary_sync_allowed: bool,
    pub requires_security_review: bool,
    pub user_export_only: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum EphemeralPolicyError {
    LocalOnlyTransportRejected,
    PlaintextServerStorageRejected,
    ExternalActionRejected,
    BackupPathRejected,
    CachePathRejected,
    AnalyticsPathRejected,
    AutomaticSyncRejected,
    MissingSecurityReview,
    InvalidObjectModePair,
}

pub fn validate_ephemeral_storage(
    declaration: &EphemeralStorageDeclaration,
) -> Result<(), EphemeralPolicyError> {
    if declaration.external_action_authorized {
        return Err(EphemeralPolicyError::ExternalActionRejected);
    }

    if declaration.plaintext_server_storage_allowed {
        return Err(EphemeralPolicyError::PlaintextServerStorageRejected);
    }

    if declaration.ordinary_backup_allowed {
        return Err(EphemeralPolicyError::BackupPathRejected);
    }

    if declaration.ordinary_cache_allowed {
        return Err(EphemeralPolicyError::CachePathRejected);
    }

    if declaration.ordinary_analytics_allowed {
        return Err(EphemeralPolicyError::AnalyticsPathRejected);
    }

    match declaration.object_class {
        EphemeralObjectClass::LocalOnlyReflection
        | EphemeralObjectClass::LocalExportableReflection => {
            if declaration.network_transport_allowed {
                return Err(EphemeralPolicyError::LocalOnlyTransportRejected);
            }

            if declaration.ordinary_sync_allowed {
                return Err(EphemeralPolicyError::AutomaticSyncRejected);
            }

            if !declaration.user_export_only
                && declaration.object_class == EphemeralObjectClass::LocalExportableReflection
            {
                return Err(EphemeralPolicyError::InvalidObjectModePair);
            }
        }
        EphemeralObjectClass::PurposeLimitedPairwiseContext
        | EphemeralObjectClass::EphemeralServerCiphertext => {
            if !declaration.requires_security_review {
                return Err(EphemeralPolicyError::MissingSecurityReview);
            }
        }
        EphemeralObjectClass::AggregateOnlyMeasure
        | EphemeralObjectClass::GovernanceRecord => {}
    }

    Ok(())
}
