PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS compliance_case (
    case_id TEXT PRIMARY KEY
        CHECK (length(case_id) BETWEEN 24 AND 160),
    case_status TEXT NOT NULL
        CHECK (case_status IN (
            'open',
            'under_review',
            'appeal_open',
            'closed',
            'retention_closed'
        )),
    created_at_utc TEXT NOT NULL,
    retention_expires_at_utc TEXT NOT NULL,
    policy_version TEXT NOT NULL
        CHECK (length(policy_version) BETWEEN 1 AND 120),
    mapping_destroyed_at_utc TEXT,
    closed_at_utc TEXT,
    CHECK (retention_expires_at_utc > created_at_utc)
);

CREATE TABLE IF NOT EXISTS compliance_ledger_event (
    event_id TEXT PRIMARY KEY
        CHECK (length(event_id) BETWEEN 24 AND 160),
    case_id TEXT NOT NULL,
    event_sequence INTEGER NOT NULL
        CHECK (event_sequence > 0),
    event_type TEXT NOT NULL
        CHECK (event_type IN (
            'report_opened',
            'report_submitted_for_review',
            'human_review_started',
            'human_review_completed',
            'appeal_opened',
            'appeal_resolved',
            'content_action_completed',
            'feature_restriction_completed',
            'case_closed_no_action',
            'retention_expired',
            'case_mapping_destroyed',
            'ledger_accessed',
            'correction_recorded',
            'integrity_check_completed'
        )),
    review_status TEXT NOT NULL
        CHECK (review_status IN (
            'not_applicable',
            'pending',
            'in_review',
            'completed',
            'appealed',
            'retention_closed'
        )),
    outcome_category TEXT NOT NULL
        CHECK (outcome_category IN (
            'not_applicable',
            'no_policy_match',
            'education_notice',
            'public_content_removed',
            'feature_restriction',
            'account_action',
            'appeal_upheld',
            'appeal_modified',
            'appeal_reversed',
            'case_closed',
            'retention_purged',
            'integrity_verified'
        )),
    occurred_at_utc TEXT NOT NULL,
    retention_expires_at_utc TEXT NOT NULL,
    policy_version TEXT NOT NULL
        CHECK (length(policy_version) BETWEEN 1 AND 120),
    access_purpose TEXT
        CHECK (
            access_purpose IS NULL OR access_purpose IN (
                'case_review',
                'appeal_review',
                'retention_verification',
                'integrity_audit',
                'authorized_legal_review'
            )
        ),
    correction_target_event_id TEXT,
    prior_event_hash TEXT,
    event_hash TEXT NOT NULL
        CHECK (length(event_hash) BETWEEN 32 AND 256),
    FOREIGN KEY (case_id) REFERENCES compliance_case(case_id)
        ON DELETE RESTRICT,
    FOREIGN KEY (correction_target_event_id)
        REFERENCES compliance_ledger_event(event_id)
        ON DELETE RESTRICT,
    UNIQUE (case_id, event_sequence),
    CHECK (retention_expires_at_utc >= occurred_at_utc)
);

CREATE INDEX IF NOT EXISTS idx_compliance_case_retention
    ON compliance_case(retention_expires_at_utc);

CREATE INDEX IF NOT EXISTS idx_compliance_ledger_event_case_sequence
    ON compliance_ledger_event(case_id, event_sequence);

CREATE INDEX IF NOT EXISTS idx_compliance_ledger_event_retention
    ON compliance_ledger_event(retention_expires_at_utc);

CREATE TRIGGER IF NOT EXISTS prevent_ledger_event_update
BEFORE UPDATE ON compliance_ledger_event
BEGIN
    SELECT RAISE(ABORT, 'Compliance ledger events are append-only; record a correction event instead.');
END;

CREATE TRIGGER IF NOT EXISTS prevent_ledger_event_delete
BEFORE DELETE ON compliance_ledger_event
BEGIN
    SELECT RAISE(ABORT, 'Compliance ledger events cannot be deleted individually; use retention-close workflow.');
END;
