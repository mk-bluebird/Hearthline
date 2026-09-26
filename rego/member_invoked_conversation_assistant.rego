package hearthline.assistant.member_invoked

default allow_request := false
default allow_automatic_action := false
default allow_account_restriction := false

allowed_tasks := {
  "draft_boundary",
  "draft_decline",
  "draft_public_first_invitation",
  "draft_pace_request",
  "explain_consent_checkpoint",
  "summarize_selected_shared_preferences",
  "review_selected_pressure_pattern",
  "draft_report_from_selected_content",
  "explain_block_or_report_options"
}

request_is_member_initiated if {
  input.memberInitiated == true
}

task_is_allowed if {
  input.task in allowed_tasks
}

selected_content_is_bounded if {
  count(input.selectedContent) > 0
  count(input.selectedContent) <= 20
}

retention_is_permitted if {
  input.retentionClass == "local_only"
}

retention_is_permitted if {
  input.retentionClass == "ephemeral_task_processing"
}

retention_is_permitted if {
  input.retentionClass == "member_saved_draft"
}

allow_request if {
  request_is_member_initiated
  task_is_allowed
  selected_content_is_bounded
  retention_is_permitted
}

allow_automatic_action if {
  false
}

allow_account_restriction if {
  false
}
