import React from 'react';
import SectionHeading from '../components/SectionHeading.jsx';
import NoticeCard from '../components/NoticeCard.jsx';
import ToggleRow from '../components/ToggleRow.jsx';

export default function PrivacyPage({ account, updateAccount, addAuditEvent, setCurrentPage }) {
  function handleToggle(field) {
    updateAccount({ [field]: !account[field] });
    addAuditEvent('PRIVACY_CHOICE_UPDATED');
  }

  return (
    <div>
      <SectionHeading title="Privacy" subtitle="Control what you share and how." />

      <NoticeCard variant="privacy">
        <strong>Privacy model:</strong> Hearthline defaults to minimum visible fields.
        You choose what each connection can see. Revoking a choice immediately hides
        that information and invalidates affected unsent drafts.
      </NoticeCard>

      <div className="card">
        <SectionHeading title="Default privacy settings" />
        
        <ToggleRow
          label="Manual candidate review"
          description="Review each person before they appear in your feed."
          checked={account.manualCandidateReview}
          onChange={() => handleToggle('manualCandidateReview')}
        />
        <ToggleRow
          label="Neutral reminder language"
          description="Use calm, non-urgent wording in all notifications."
          checked={account.neutralReminderLanguage}
          onChange={() => handleToggle('neutralReminderLanguage')}
        />
        <ToggleRow
          label="Privacy review before expansion"
          description="Review sharing choices before expanding a connection."
          checked={account.privacyReviewBeforeExpansion}
          onChange={() => handleToggle('privacyReviewBeforeExpansion')}
        />
      </div>

      <div className="card">
        <SectionHeading title="How consent works" />
        <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
          <li>Each connection has its own sharing choices.</li>
          <li>Display name, broad area, and interests can be shared or hidden.</li>
          <li>Alcohol-free preference and phone number start as not shared.</li>
          <li>Revoking a choice immediately hides that field.</li>
          <li>Revoking invalidates any unsent draft that referenced that field.</li>
          <li>Mutual interest does not automatically expand sharing.</li>
          <li>You can revoke any choice at any time.</li>
        </ul>
      </div>

      <div className="card">
        <SectionHeading title="Pseudonym policy" />
        <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
          <li>You can use a different display name for each connection.</li>
          <li>One connection cannot discover another connection's persona.</li>
          <li>Personas do not contain legal identity or health information.</li>
          <li>Using a pseudonym does not reduce your access or controls.</li>
        </ul>
      </div>

      <div className="card" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button className="btn btn--ghost" onClick={() => setCurrentPage('history')}>
          View history →
        </button>
        <button className="btn btn--ghost" onClick={() => setCurrentPage('security')}>
          Security →
        </button>
      </div>
    </div>
  );
}
