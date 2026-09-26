CREATE TYPE adult_platform_eligibility_state AS ENUM (
  'unknown',
  'eligible',
  'ineligible',
  'verification_required',
  'verification_expired',
  'suspended_by_policy'
);

CREATE TYPE consent_state AS ENUM (
  'unknown',
  'granted',
  'withdrawn',
  'expired'
);

CREATE TYPE consent_capability AS ENUM (
  'receive_discovery_presentation',
  'express_activity_interest',
  'open_reciprocal_interest_window',
  'open_direct_conversation',
  'discuss_sexual_topics',
  'share_media',
  'view_shared_media',
  'start_voice_call',
  'start_video_call',
  'discuss_named_public_venue',
  'create_public_first_meeting_plan',
  'share_trusted_contact_plan',
  'enable_ar_camera',
  'enable_ar_microphone',
  'enable_ar_spatial_mapping',
  'record_ar_or_call_session'
);

CREATE TYPE consent_purpose AS ENUM (
  'discovery',
  'conversation',
  'media',
  'call',
  'meeting_planning',
  'trusted_contact',
  'ar_experience'
);

CREATE TYPE recipient_scope_kind AS ENUM (
  'self_only',
  'specific_member',
  'specific_trusted_contact',
  'specific_session'
);

CREATE TYPE preference_domain AS ENUM (
  'connection_intent',
  'activity',
  'atmosphere',
  'communication_pace',
  'conversation_style',
  'language',
  'broad_area',
  'availability_window',
  'discovery_display_order'
);

CREATE TYPE preference_visibility AS ENUM (
  'private',
  'eligible_discovery_only',
  'reciprocal_interest_only',
  'specific_member_only'
);

CREATE TYPE boundary_answer AS ENUM (
  'yes',
  'no',
  'ask_first',
  'not_discussing'
);

CREATE TABLE adult_platform_eligibility (
  member_id UUID PRIMARY KEY,
  minimum_age_policy SMALLINT NOT NULL CHECK (minimum_age_policy = 30),
  state adult_platform_eligibility_state NOT NULL,
  verification_method TEXT NOT NULL CHECK (
    verification_method IN (
      'age_over_threshold_attestation',
      'privacy_preserving_age_credential',
      'reviewed_identity_provider_assertion',
      'manual_support_review'
    )
  ),
  assessed_at TIMESTAMPTZ NOT NULL,
  review_by TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  policy_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (review_by > assessed_at)
);

CREATE TABLE consent_grant (
  grant_id UUID PRIMARY KEY,
  grantor_member_id UUID NOT NULL,
  state consent_state NOT NULL,
  capability consent_capability NOT NULL,
  purpose consent_purpose NOT NULL,
  recipient_scope_kind recipient_scope_kind NOT NULL,
  recipient_ref UUID,
  granted_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  policy_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (
    (recipient_scope_kind = 'self_only' AND recipient_ref IS NULL)
    OR
    (recipient_scope_kind <> 'self_only' AND recipient_ref IS NOT NULL)
  ),

  CHECK (
    (state = 'granted' AND granted_at IS NOT NULL AND expires_at IS NOT NULL)
    OR
    (state <> 'granted')
  ),

  CHECK (
    (state = 'withdrawn' AND withdrawn_at IS NOT NULL)
    OR
    (state <> 'withdrawn')
  ),

  CHECK (
    expires_at IS NULL OR granted_at IS NULL OR expires_at > granted_at
  )
);

CREATE INDEX consent_grant_active_scope_idx
  ON consent_grant (
    grantor_member_id,
    capability,
    recipient_scope_kind,
    recipient_ref,
    expires_at
  )
  WHERE state = 'granted';

CREATE TABLE preference_facet (
  facet_id UUID PRIMARY KEY,
  member_id UUID NOT NULL,
  domain preference_domain NOT NULL,
  value TEXT NOT NULL CHECK (char_length(value) BETWEEN 1 AND 96),
  member_selected BOOLEAN NOT NULL DEFAULT true CHECK (member_selected = true),
  visibility preference_visibility NOT NULL,
  display_weight SMALLINT CHECK (
    display_weight IS NULL OR display_weight BETWEEN 0 AND 100
  ),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX preference_facet_member_domain_idx
  ON preference_facet (member_id, domain);

CREATE TABLE boundary_ledger (
  member_id UUID PRIMARY KEY,
  public_first_meeting boundary_answer NOT NULL,
  location_sharing boundary_answer NOT NULL,
  photo_sharing boundary_answer NOT NULL,
  recording boundary_answer NOT NULL,
  sexual_topics boundary_answer NOT NULL,
  money_or_material_exchange boundary_answer NOT NULL DEFAULT 'no'
    CHECK (money_or_material_exchange = 'no'),
  transport_conditioned_on_intimacy boundary_answer NOT NULL DEFAULT 'no'
    CHECK (transport_conditioned_on_intimacy = 'no'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE adult_platform_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_grant ENABLE ROW LEVEL SECURITY;
ALTER TABLE preference_facet ENABLE ROW LEVEL SECURITY;
ALTER TABLE boundary_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY adult_platform_eligibility_owner_read
  ON adult_platform_eligibility
  FOR SELECT
  USING (member_id = current_setting('app.member_id', true)::uuid);

CREATE POLICY consent_grant_owner_read
  ON consent_grant
  FOR SELECT
  USING (grantor_member_id = current_setting('app.member_id', true)::uuid);

CREATE POLICY preference_facet_owner_read
  ON preference_facet
  FOR SELECT
  USING (member_id = current_setting('app.member_id', true)::uuid);

CREATE POLICY boundary_ledger_owner_read
  ON boundary_ledger
  FOR SELECT
  USING (member_id = current_setting('app.member_id', true)::uuid);
