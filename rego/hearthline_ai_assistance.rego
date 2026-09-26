package hearthline.ai_assistance

default allow := false

required_root_fields := {
  "schemaVersion",
  "requestId",
  "action",
  "purpose",
  "participantSelectedText",
  "consent",
  "retention",
  "decisionUseProhibited",
  "personLevelInferenceProhibited",
  "participantReviewRequired",
  "requestedAt",
}

required_consent_fields := {
  "scope",
  "grantedAt",
  "revocable",
  "informed",
}

required_retention_fields := {
  "mode",
  "trainingUseAllowed",
  "deletionRoute",
}

allowed_actions := {
  "clarify",
  "translate",
  "consent_summary",
}

allowed_retention_modes := {
  "ephemeral",
  "participant-controlled",
  "documented-limited-retention",
}

allow if {
  count(deny) == 0
}

deny contains reason if {
  not is_object(input)
  reason := "request_must_be_an_object"
}

deny contains reason if {
  is_object(input)
  missing := required_root_fields - object.keys(input)
  count(missing) > 0
  reason := sprintf("missing_root_fields:%v", [sort(missing)])
}

deny contains reason if {
  is_object(input)
  extra := object.keys(input) - required_root_fields
  count(extra) > 0
  reason := sprintf("unexpected_root_fields:%v", [sort(extra)])
}

deny contains "unsupported_schema_version" if {
  input.schemaVersion != "1.0"
}

deny contains "purpose_missing_or_too_short" if {
  not is_string(input.purpose)
}

deny contains "purpose_missing_or_too_short" if {
  is_string(input.purpose)
  count(trim_space(input.purpose)) < 16
}

deny contains "purpose_too_long" if {
  is_string(input.purpose)
  count(input.purpose) > 500
}

deny contains "participant_selected_text_missing" if {
  not is_string(input.participantSelectedText)
}

deny contains "participant_selected_text_empty" if {
  is_string(input.participantSelectedText)
  count(input.participantSelectedText) == 0
}

deny contains "participant_selected_text_too_long" if {
  is_string(input.participantSelectedText)
  count(input.participantSelectedText) > 20000
}

deny contains "action_not_permitted" if {
  not allowed_actions[input.action]
}

deny contains "decision_use_must_be_prohibited" if {
  input.decisionUseProhibited != true
}

deny contains "person_level_inference_must_be_prohibited" if {
  input.personLevelInferenceProhibited != true
}

deny contains "participant_review_must_be_required" if {
  input.participantReviewRequired != true
}

deny contains "consent_must_be_an_object" if {
  not is_object(input.consent)
}

deny contains reason if {
  is_object(input.consent)
  missing := required_consent_fields - object.keys(input.consent)
  count(missing) > 0
  reason := sprintf("missing_consent_fields:%v", [sort(missing)])
}

deny contains reason if {
  is_object(input.consent)
  extra := object.keys(input.consent) - required_consent_fields
  count(extra) > 0
  reason := sprintf("unexpected_consent_fields:%v", [sort(extra)])
}

deny contains "consent_scope_must_be_single_request" if {
  input.consent.scope != "single-request"
}

deny contains "consent_must_be_informed" if {
  input.consent.informed != true
}

deny contains "consent_must_be_revocable" if {
  input.consent.revocable != true
}

deny contains "consent_timestamp_missing" if {
  not is_string(input.consent.grantedAt)
}

deny contains "retention_must_be_an_object" if {
  not is_object(input.retention)
}

deny contains reason if {
  is_object(input.retention)
  missing := required_retention_fields - object.keys(input.retention)
  count(missing) > 0
  reason := sprintf("missing_retention_fields:%v", [sort(missing)])
}

deny contains reason if {
  is_object(input.retention)
  extra := object.keys(input.retention) - required_retention_fields
  count(extra) > 0
  reason := sprintf("unexpected_retention_fields:%v", [sort(extra)])
}

deny contains "retention_mode_not_permitted" if {
  not allowed_retention_modes[input.retention.mode]
}

deny contains "training_use_must_be_disallowed" if {
  input.retention.trainingUseAllowed != false
}

deny contains "deletion_route_missing" if {
  not is_string(input.retention.deletionRoute)
}

deny contains "deletion_route_missing" if {
  is_string(input.retention.deletionRoute)
  count(trim_space(input.retention.deletionRoute)) < 8
}

decision := {
  "allow": allow,
  "deny": sort(deny),
  "requiredHumanFallback": true,
  "decisionUseProhibited": true,
  "personLevelInferenceProhibited": true,
}
