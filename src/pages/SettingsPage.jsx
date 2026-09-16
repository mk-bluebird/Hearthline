import React, { useState } from 'react';
import SectionHeading from '../components/SectionHeading.jsx';
import NoticeCard from '../components/NoticeCard.jsx';
import ToggleRow from '../components/ToggleRow.jsx';
import { INTENT_OPTIONS, INTEREST_OPTIONS, PACE_OPTIONS, BROAD_AREAS } from '../data/demoProfiles.js';

export default function SettingsPage({ account, updateAccount, setCurrentPage, resetAll, getExportPreview, addAuditEvent }) {
  const [showResetModal, setShowResetModal] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exportData, setExportData] = useState(null);

  function handleExport() {
    const data = getExportPreview();
    setExportData(data);
    setShowExport(true);
    addAuditEvent('EXPORT_PREVIEWED');
  }

  function handleReset() {
    resetAll();
    setShowResetModal(false);
    setCurrentPage('welcome');
  }

  function handleSupportToggle(field, value) {
    updateAccount({
      supportContact: { ...account.supportContact, [field]: value }
    });
  }

  return (
    <div>
      <SectionHeading title="Settings" subtitle="Your profile and preferences." />

      <div className="card">
        <SectionHeading title="Profile" />
        
        <div className="form-group">
          <label className="form-label" htmlFor="settings-name">Display name</label>
          <input
            className="form-input"
            id="settings-name"
            type="text"
            value={account.displayName}
            onChange={e => updateAccount({ displayName: e.target.value })}
            maxLength={30}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="settings-area">Broad area</label>
          <select
            className="form-select"
            id="settings-area"
            value={account.broadArea}
            onChange={e => updateAccount({ broadArea: e.target.value })}
          >
            <option value="">Select an area</option>
            {BROAD_AREAS.map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Intents</label>
          <div className="multi-select">
            {INTENT_OPTIONS.map(intent => (
              <button
                key={intent}
                type="button"
                className={`multi-select__option ${account.intents.includes(intent) ? 'multi-select__option--selected' : ''}`}
                onClick={() => {
                  const newIntents = account.intents.includes(intent)
                    ? account.intents.filter(i => i !== intent)
                    : [...account.intents, intent];
                  updateAccount({ intents: newIntents });
                }}
              >
                {intent}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Interests</label>
          <div className="multi-select">
            {INTEREST_OPTIONS.map(interest => (
              <button
                key={interest}
                type="button"
                className={`multi-select__option ${account.interests.includes(interest) ? 'multi-select__option--selected' : ''}`}
                onClick={() => {
                  const newInterests = account.interests.includes(interest)
                    ? account.interests.filter(i => i !== interest)
                    : [...account.interests, interest];
                  updateAccount({ interests: newInterests });
                }}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Pace</label>
          <div className="pace-options">
            {PACE_OPTIONS.map(option => (
              <div
                key={option.value}
                className={`pace-option ${account.pace === option.value ? 'pace-option--selected' : ''}`}
                onClick={() => { updateAccount({ pace: option.value }); addAuditEvent('PACE_CHANGED'); }}
                role="radio"
                aria-checked={account.pace === option.value}
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { updateAccount({ pace: option.value }); addAuditEvent('PACE_CHANGED'); } }}
              >
                <div className="pace-option__title">{option.label}</div>
                <div className="pace-option__desc">{option.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <SectionHeading title="Preferences" />
        <ToggleRow
          label="Manual candidate review"
          description="Review each person before they appear."
          checked={account.manualCandidateReview}
          onChange={v => updateAccount({ manualCandidateReview: v })}
        />
        <ToggleRow
          label="Low-energy mode"
          description="One profile at a time."
          checked={account.lowEnergyMode}
          onChange={v => { updateAccount({ lowEnergyMode: v }); addAuditEvent('LOW_ENERGY_TOGGLED'); }}
        />
        <ToggleRow
          label="Neutral reminder language"
          description="Calm, non-urgent wording."
          checked={account.neutralReminderLanguage}
          onChange={v => updateAccount({ neutralReminderLanguage: v })}
        />
        <ToggleRow
          label="Privacy review before expansion"
          description="Review choices before expanding a connection."
          checked={account.privacyReviewBeforeExpansion}
          onChange={v => updateAccount({ privacyReviewBeforeExpansion: v })}
        />
      </div>

      <div className="card">
        <SectionHeading title="Optional account-support contact" subtitle="Fully optional. Off by default." />
        
        <ToggleRow
          label="Enable support contact"
          description="Configure a local continuity contact."
          checked={account.supportContact.enabled}
          onChange={v => handleSupportToggle('enabled', v)}
        />

        {account.supportContact.enabled && (
          <div style={{ marginTop: '12px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="support-label">Contact label</label>
              <input
                className="form-input"
                id="support-label"
                type="text"
                value={account.supportContact.label}
                onChange={e => handleSupportToggle('label', e.target.value)}
                placeholder="e.g. Trusted friend"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="support-notice">Continuity-event notice</label>
              <select
                className="form-select"
                id="support-notice"
                value={account.supportContact.noticePreference}
                onChange={e => handleSupportToggle('noticePreference', e.target.value)}
              >
                <option value="none">None</option>
                <option value="generic">Generic notice</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="support-checkin">Check-in reminder</label>
              <select
                className="form-select"
                id="support-checkin"
                value={account.supportContact.checkInPreference}
                onChange={e => handleSupportToggle('checkInPreference', e.target.value)}
              >
                <option value="none">None</option>
                <option value="generic">Generic reminder</option>
              </select>
            </div>
          </div>
        )}

        <NoticeCard variant="info">
          An optional account-support contact cannot view your profile, conversations,
          matches, private settings, recovery information, or credentials.
        </NoticeCard>
      </div>

      <div className="card">
        <SectionHeading title="Data management" />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn--secondary" onClick={handleExport}>
            Export local demo summary
          </button>
          <button className="btn btn--danger" onClick={() => setShowResetModal(true)}>
            Reset local demo data
          </button>
        </div>
      </div>

      {/* History link */}
      <div className="card">
        <button className="btn btn--ghost" onClick={() => setCurrentPage('history')}>
          View privacy and security history →
        </button>
      </div>

      {/* Export Preview Modal */}
      {showExport && exportData && (
        <div className="modal-overlay" onClick={() => setShowExport(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__title">Export Preview</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-muted-ink)', marginBottom: '12px' }}>
              This preview contains no message text, draft text, protected-field names, recipient mapping, or persona linkage.
            </p>
            <div className="export-preview">
              {JSON.stringify(exportData, null, 2)}
            </div>
            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={() => setShowExport(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__title">Reset all local data?</div>
            <p>This will clear your profile, connections, history, and all settings. This cannot be undone.</p>
            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={() => setShowResetModal(false)}>Cancel</button>
              <button className="btn btn--danger" onClick={handleReset}>Reset everything</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
