package hearthline.ai_assistance_test

import data.hearthline.ai_assistance

valid_request := {
  "schemaVersion": "1.0",
  "requestId": "request-20260926-0001",
  "action": "clarify",
  "purpose": "Prepare a clearer participant-authored message.",
  "participantSelectedText": "Could someone help me make this clearer?",
  "consent": {
    "scope": "single-request",
    "grantedAt": "2026-09-26T11:00:00Z",
    "revocable": true,
    "informed": true
  },
  "retention": {
    "mode": "ephemeral",
    "trainingUseAllowed": false,
    "deletionRoute": "https://example.invalid/deletion"
  },
  "decisionUseProhibited": true,
  "personLevelInferenceProhibited": true,
  "participantReviewRequired": true,
  "requestedAt": "2026-09-26T11:00:00Z"
}

test_allows_a_complete_rights_constrained_request if {
  result := ai_assistance.decision with input as valid_request
  result.allow
  count(result.deny) == 0
  result.requiredHumanFallback
  result.decisionUseProhibited
  result.personLevelInferenceProhibited
}

test_rejects_missing_single_request_consent if {
  request := object.remove(valid_request, "consent")
  result := ai_assistance.decision with input as request

  not result.allow
  "missing_root_fields:[\"consent\"]" in result.deny
}

test_rejects_non_single_request_consent if {
  request := object.union(valid_request, {
    "consent": object.union(valid_request.consent, {
      "scope": "persistent"
    })
  })

  result := ai_assistance.decision with input as request

  not result.allow
  "consent_scope_must_be_single_request" in result.deny
}

test_rejects_missing_declared_purpose if {
  request := object.remove(valid_request, "purpose")
  result := ai_assistance.decision with input as request

  not result.allow
  "missing_root_fields:[\"purpose\"]" in result.deny
}

test_rejects_training_use if {
  request := object.union(valid_request, {
    "retention": object.union(valid_request.retention, {
      "trainingUseAllowed": true
    })
  })

  result := ai_assistance.decision with input as request

  not result.allow
  "training_use_must_be_disallowed" in result.deny
}

test_rejects_automated_decision_use if {
  request := object.union(valid_request, {
    "decisionUseProhibited": false
  })

  result := ai_assistance.decision with input as request

  not result.allow
  "decision_use_must_be_prohibited" in result.deny
}

test_rejects_person_level_inference if {
  request := object.union(valid_request, {
    "personLevelInferenceProhibited": false
  })

  result := ai_assistance.decision with input as request

  not result.allow
  "person_level_inference_must_be_prohibited" in result.deny
}
