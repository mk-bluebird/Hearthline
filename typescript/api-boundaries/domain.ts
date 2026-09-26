export type Id = string;

export type RightsAccessOutcome =
  | "approved_with_safeguards"
  | "requires_remediation"
  | "blocked_from_release"
  | "requires_policy_or_legal_review";

export type BroadRegionScope =
  | "selected_broad_region"
  | "remote"
  | "public_category_only";

export type MediaClass =
  | "non_sensitive_media"
  | "sensitive_personal_media"
  | "explicit_adult_media";

export interface RightsAccessReview {
  readonly reviewId: Id;
  readonly featureRef: Id;
  readonly featureVersion: string;
  readonly dimensions: readonly (
    | "access"
    | "autonomy"
    | "consent"
    | "privacy"
    | "non_discrimination"
    | "accessibility"
    | "safety_and_exit"
    | "noncommercial_integrity"
    | "accountability"
  )[];
  readonly evidenceRefs: readonly Id[];
  readonly outcome: RightsAccessOutcome;
  readonly findingCodes: readonly string[];
  readonly reviewedAt: string;
  readonly policyVersion: string;
}

export interface StructuralUncertaintyDecision {
  readonly decisionId: Id;
  readonly fieldClass:
    | "connection_intent"
    | "boundary"
    | "consent"
    | "activity_window"
    | "broad_region"
    | "access_control"
    | "identity_facet"
    | "public_source_attribute"
    | "policy_context";
  readonly observedState:
    | "absent"
    | "not_disclosed"
    | "ambiguous"
    | "withdrawn"
    | "expired"
    | "outdated"
    | "policy_unclear";
  readonly systemAction:
    | "exclude_from_decision"
    | "require_member_confirmation"
    | "deny_sensitive_capability"
    | "offer_non_disclosing_alternative"
    | "mark_source_unknown"
    | "route_to_human_or_policy_review";
  readonly createdAt: string;
  readonly policyVersion: string;
}

export interface BroadRegionSelection {
  readonly selectionId: Id;
  readonly ownerRef: Id;
  readonly state:
    | "active"
    | "paused_by_owner"
    | "withdrawn"
    | "deleted";
  readonly settingScope: BroadRegionScope;
  readonly broadRegionId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MediaShare {
  readonly shareId: Id;
  readonly senderRef: Id;
  readonly recipientRef: Id;
  readonly mediaRef: Id;
  readonly mediaClass: MediaClass;
  readonly purpose:
    | "conversation"
    | "personal_sharing"
    | "explicit_adult_sharing";
  readonly state:
    | "proposed"
    | "recipient_view_permission_pending"
    | "active"
    | "withdrawn"
    | "expired"
    | "blocked"
    | "cancelled";
  readonly consentGrantRef: Id;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly senderConfirmed: true;
  readonly copyRiskNoticeAcknowledged: true;
}

export interface AftercareSession {
  readonly sessionId: Id;
  readonly ownerRef: Id;
  readonly state:
    | "active"
    | "paused_by_owner"
    | "completed"
    | "discarded"
    | "deleted";
  readonly entryMode:
    | "member_opened"
    | "member_scheduled_reminder"
    | "member_selected_interaction_menu";
  readonly selectedTools: readonly (
    | "quiet_notifications"
    | "pause_discovery"
    | "private_reflection_prompt"
    | "boundary_review"
    | "pace_review"
    | "private_next_step_note"
    | "consent_reminder"
    | "quiet_exit_controls"
    | "public_resources_link"
    | "trusted_contact_draft"
    | "deletion_and_expiry_review"
  )[];
  readonly localOnly: boolean;
  readonly createdAt: string;
  readonly memberInitiated: true;
}

export interface SocialOptionsSession {
  readonly sessionId: Id;
  readonly ownerRef: Id;
  readonly state:
    | "active"
    | "paused_by_owner"
    | "completed"
    | "discarded"
    | "deleted";
  readonly memberSelectedInputs: {
    readonly connectionGoals?: readonly (
      | "conversation"
      | "friendship"
      | "shared_activity"
      | "dating"
      | "romance"
      | "casual_connection"
      | "undecided"
    )[];
    readonly formats?: readonly (
      | "text"
      | "remote"
      | "public_activity"
      | "learning"
      | "creative_activity"
      | "shared_game"
    )[];
    readonly pace?:
      | "one_time_option"
      | "occasional_option"
      | "flexible"
      | "no_recurring_plan";
    readonly comfortControls?: readonly string[];
    readonly costPreference?:
      | "no_cost_preferred"
      | "low_cost_preferred"
      | "not_discussing";
    readonly settingScope?:
      | "remote"
      | "public_category_only"
      | "selected_broad_region";
    readonly planningWindow?:
      | "today"
      | "this_week"
      | "next_two_weeks"
      | "unspecified";
  };
  readonly notificationPreference:
    | "none"
    | "member_opened_only"
    | "digest_only"
    | "single_member_selected_reminder";
  readonly createdAt: string;
  readonly memberInitiated: true;
}

export interface Appeal {
  readonly appealId: Id;
  readonly appellantRef: Id;
  readonly decisionRef: Id;
  readonly state:
    | "draft"
    | "submitted"
    | "receipt_confirmed"
    | "under_human_review"
    | "additional_member_context_requested"
    | "resolved"
    | "withdrawn_by_member"
    | "closed";
  readonly appealGrounds: readonly (
    | "policy_misapplied"
    | "context_missing_or_incorrect"
    | "identity_or_account_error"
    | "content_or_media_misclassified"
    | "accessibility_process_barrier"
    | "procedure_or_notice_error"
    | "new_relevant_member_context"
    | "other_plain_language_explanation"
  )[];
  readonly memberStatement?: string;
  readonly requestedAccommodation?:
    | "text_first"
    | "plain_language"
    | "asynchronous_response"
    | "screen_reader_compatible"
    | "other_member_described"
    | "none";
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly policyVersion: string;
}

export interface InteroperabilityConnection {
  readonly connectionId: Id;
  readonly ownerRef: Id;
  readonly kind:
    | "member_data_export"
    | "member_data_import"
    | "oauth_connection"
    | "minimal_claim_presentation";
  readonly state:
    | "draft"
    | "awaiting_member_confirmation"
    | "active"
    | "revoked"
    | "completed"
    | "expired"
    | "cancelled";
  readonly purpose:
    | "data_portability"
    | "member_selected_import"
    | "documented_provider_connection"
    | "minimal_current_predicate";
  readonly requestedScopes: readonly (
    | "member_authored_profile_fields"
    | "member_authored_preferences"
    | "member_authored_drafts"
    | "member_authored_settings"
    | "member_accessibility_controls"
    | "member_connection_intent"
    | "member_relationship_goals"
    | "member_owned_export_metadata"
    | "minimal_current_predicate"
  )[];
  readonly createdAt: string;
  readonly memberInitiated: true;
}

export interface ResearchStudy {
  readonly studyId: Id;
  readonly title: string;
  readonly researchQuestion: string;
  readonly state:
    | "draft"
    | "under_review"
    | "open_for_opt_in"
    | "active"
    | "closed_to_new_participation"
    | "retention_expired"
    | "destroyed";
  readonly requestedDataClasses: readonly (
    | "member_voluntary_survey_response"
    | "member_voluntary_usability_feedback"
    | "aggregate_accessibility_path_result"
    | "aggregate_policy_comprehension_result"
    | "aggregate_control_discoverability_result"
    | "aggregate_revocation_propagation_result"
  )[];
  readonly consentVersion: string;
  readonly reviewRefs: readonly Id[];
  readonly retention: {
    readonly destroyBy: string;
    readonly operationalReuseProhibited: true;
  };
  readonly withdrawalPolicy:
    | "future_collection_stops_immediately"
    | "future_collection_and_unpublished_data_removal_where_feasible";
  readonly createdAt: string;
  readonly reviewBy: string;
}

export interface ComponentCompositionContract {
  readonly contractId: Id;
  readonly producer: string;
  readonly consumer: string;
  readonly purpose: string;
  readonly inputSchemaRef: Id;
  readonly outputSchemaRef: Id;
  readonly allowedFields: readonly string[];
  readonly forbiddenFields: readonly string[];
  readonly authorizationRequirement:
    | "member_owned_read"
    | "current_capability_grant"
    | "policy_authorized_service"
    | "human_review_authorization"
    | "aggregate_governance_authorization";
  readonly consentRequirement:
    | "none"
    | "member_selected_input"
    | "current_capability_grant"
    | "separate_research_opt_in";
  readonly retentionClass:
    | "ephemeral_operational"
    | "member_controlled"
    | "content_minimized_accountability"
    | "purpose_limited_governance"
    | "isolated_research";
  readonly revocationBehavior:
    | "not_applicable"
    | "deny_future_reads"
    | "invalidate_tokens_and_caches"
    | "cancel_queued_actions_and_end_active_session";
  readonly failureMode:
    | "fail_closed"
    | "omit_optional_feature"
    | "require_human_review";
  readonly policyVersion: string;
  readonly state:
    | "draft"
    | "under_review"
    | "approved"
    | "deprecated"
    | "revoked";
}
