use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuditDomain {
    Compliance,
    HumanReview,
    Appeal,
    Retention,
    ResearchLane,
    AccessParity,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuditActorRole {
    Reporter,
    Reviewer,
    AppealReviewer,
    System,
    RetentionWorker,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuditOutcomeCategory {
    NotApplicable,
    NoPolicyMatch,
    EducationNotice,
    PublicContentRemoved,
    FeatureRestriction,
    AccountAction,
    AppealUpheld,
    AppealModified,
    AppealReversed,
    CaseClosed,
    RetentionPurged,
    IntegrityVerified,
    CorrectionRecorded,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AuditEvent {
    pub audit_event_id: String,
    pub audit_case_reference: String,
    pub audit_domain: AuditDomain,
    pub event_type: String,
    pub occurred_at_utc: String,
    pub actor_role: AuditActorRole,
    pub outcome_category: AuditOutcomeCategory,
    pub version_reference: String,
    pub retention_expires_at_utc: String,
    pub prior_event_hash: Option<String>,
    pub event_hash: String,
    pub correction_reference: Option<String>,
    pub external_action_authorized: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AuditPolicyError {
    ExternalActionRejected,
    InvalidTimestamp,
    InvalidRetention,
    MissingVersionReference,
    MissingEventType,
    InvalidHash,
    CorrectionReferenceMissing,
}

fn is_canonical_utc_timestamp(value: &str) -> bool {
    let bytes = value.as_bytes();

    bytes.len() == 20
        && bytes[4] == b'-'
        && bytes[7] == b'-'
        && bytes[10] == b'T'
        && bytes[13] == b':'
        && bytes[16] == b':'
        && bytes[19] == b'Z'
        && bytes
            .iter()
            .enumerate()
            .all(|(index, byte)| match index {
                4 | 7 | 10 | 13 | 16 | 19 => true,
                _ => byte.is_ascii_digit(),
            })
}

pub fn validate_audit_event(
    event: &AuditEvent,
    now_utc: &str,
) -> Result<(), AuditPolicyError> {
    if event.external_action_authorized {
        return Err(AuditPolicyError::ExternalActionRejected);
    }

    if !is_canonical_utc_timestamp(&event.occurred_at_utc)
        || !is_canonical_utc_timestamp(&event.retention_expires_at_utc)
        || !is_canonical_utc_timestamp(now_utc)
    {
        return Err(AuditPolicyError::InvalidTimestamp);
    }

    if event.retention_expires_at_utc <= event.occurred_at_utc
        || event.retention_expires_at_utc <= now_utc
    {
        return Err(AuditPolicyError::InvalidRetention);
    }

    if event.version_reference.trim().is_empty() {
        return Err(AuditPolicyError::MissingVersionReference);
    }

    if event.event_type.trim().is_empty() {
        return Err(AuditPolicyError::MissingEventType);
    }

    if event.event_hash.trim().len() < 32 {
        return Err(AuditPolicyError::InvalidHash);
    }

    if event.outcome_category == AuditOutcomeCategory::CorrectionRecorded
        && event.correction_reference.as_deref().unwrap_or("").trim().is_empty()
    {
        return Err(AuditPolicyError::CorrectionReferenceMissing);
    }

    Ok(())
}
