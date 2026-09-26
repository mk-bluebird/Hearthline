use crate::RetentionClass;
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
    pub retention_class: RetentionClass,
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
    RetentionClassMismatch,
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
        EphemeralObjectClass::LocalOnlyReflection => {
            if declaration.retention_class != RetentionClass::LocalOnly {
                return Err(EphemeralPolicyError::RetentionClassMismatch);
            }

            if declaration.network_transport_allowed {
                return Err(EphemeralPolicyError::LocalOnlyTransportRejected);
            }

            if declaration.ordinary_sync_allowed {
                return Err(EphemeralPolicyError::AutomaticSyncRejected);
            }

            if declaration.user_export_only {
                return Err(EphemeralPolicyError::InvalidObjectModePair);
            }

            match declaration.storage_mode {
                EphemeralStorageMode::BrowserMemoryOnly
                | EphemeralStorageMode::ExplicitLocalEncryptedStore => Ok(()),
                EphemeralStorageMode::LocalFileExportOnly
                | EphemeralStorageMode::SyntheticCiphertextTransport
                | EphemeralStorageMode::ReviewedServerCiphertextStore => {
                    Err(EphemeralPolicyError::InvalidObjectModePair)
                }
            }
        }
        EphemeralObjectClass::LocalExportableReflection => {
            if declaration.retention_class != RetentionClass::LocalOnly {
                return Err(EphemeralPolicyError::RetentionClassMismatch);
            }

            if declaration.network_transport_allowed {
                return Err(EphemeralPolicyError::LocalOnlyTransportRejected);
            }

            if declaration.ordinary_sync_allowed {
                return Err(EphemeralPolicyError::AutomaticSyncRejected);
            }

            if !declaration.user_export_only {
                return Err(EphemeralPolicyError::InvalidObjectModePair);
            }

            match declaration.storage_mode {
                EphemeralStorageMode::BrowserMemoryOnly
                | EphemeralStorageMode::ExplicitLocalEncryptedStore
                | EphemeralStorageMode::LocalFileExportOnly => Ok(()),
                EphemeralStorageMode::SyntheticCiphertextTransport
                | EphemeralStorageMode::ReviewedServerCiphertextStore => {
                    Err(EphemeralPolicyError::InvalidObjectModePair)
                }
            }
        }
        EphemeralObjectClass::PurposeLimitedPairwiseContext => {
            if declaration.retention_class != RetentionClass::PurposeLimited {
                return Err(EphemeralPolicyError::RetentionClassMismatch);
            }

            if !declaration.requires_security_review {
                return Err(EphemeralPolicyError::MissingSecurityReview);
            }

            match declaration.storage_mode {
                EphemeralStorageMode::SyntheticCiphertextTransport
                | EphemeralStorageMode::ReviewedServerCiphertextStore => Ok(()),
                EphemeralStorageMode::BrowserMemoryOnly
                | EphemeralStorageMode::ExplicitLocalEncryptedStore
                | EphemeralStorageMode::LocalFileExportOnly => {
                    Err(EphemeralPolicyError::InvalidObjectModePair)
                }
            }
        }
        EphemeralObjectClass::EphemeralServerCiphertext => {
            if declaration.retention_class != RetentionClass::Ephemeral {
                return Err(EphemeralPolicyError::RetentionClassMismatch);
            }

            if !declaration.requires_security_review {
                return Err(EphemeralPolicyError::MissingSecurityReview);
            }

            match declaration.storage_mode {
                EphemeralStorageMode::SyntheticCiphertextTransport
                | EphemeralStorageMode::ReviewedServerCiphertextStore => Ok(()),
                EphemeralStorageMode::BrowserMemoryOnly
                | EphemeralStorageMode::ExplicitLocalEncryptedStore
                | EphemeralStorageMode::LocalFileExportOnly => {
                    Err(EphemeralPolicyError::InvalidObjectModePair)
                }
            }
        }
        EphemeralObjectClass::AggregateOnlyMeasure => {
            if declaration.retention_class != RetentionClass::AggregateOnly {
                return Err(EphemeralPolicyError::RetentionClassMismatch);
            }

            if declaration.network_transport_allowed {
                return Err(EphemeralPolicyError::InvalidObjectModePair);
            }

            if declaration.ordinary_sync_allowed || declaration.user_export_only {
                return Err(EphemeralPolicyError::InvalidObjectModePair);
            }

            match declaration.storage_mode {
                EphemeralStorageMode::BrowserMemoryOnly
                | EphemeralStorageMode::ExplicitLocalEncryptedStore
                | EphemeralStorageMode::LocalFileExportOnly => {
                    Err(EphemeralPolicyError::InvalidObjectModePair)
                }
                EphemeralStorageMode::SyntheticCiphertextTransport
                | EphemeralStorageMode::ReviewedServerCiphertextStore => Ok(()),
            }
        }
        EphemeralObjectClass::GovernanceRecord => {
            if declaration.retention_class != RetentionClass::PurposeLimited {
                return Err(EphemeralPolicyError::RetentionClassMismatch);
            }

            if declaration.network_transport_allowed {
                return Err(EphemeralPolicyError::InvalidObjectModePair);
            }

            if declaration.ordinary_sync_allowed || declaration.user_export_only {
                return Err(EphemeralPolicyError::InvalidObjectModePair);
            }

            match declaration.storage_mode {
                EphemeralStorageMode::BrowserMemoryOnly
                | EphemeralStorageMode::ExplicitLocalEncryptedStore
                | EphemeralStorageMode::LocalFileExportOnly => {
                    Err(EphemeralPolicyError::InvalidObjectModePair)
                }
                EphemeralStorageMode::SyntheticCiphertextTransport
                | EphemeralStorageMode::ReviewedServerCiphertextStore => Ok(()),
            }
        }
    }
}
