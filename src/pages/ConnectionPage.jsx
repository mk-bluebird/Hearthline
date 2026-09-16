import React, { useState } from 'react';
import SectionHeading from '../components/SectionHeading.jsx';
import EmptyState from '../components/EmptyState.jsx';
import NoticeCard from '../components/NoticeCard.jsx';
import PrivacyPill from '../components/PrivacyPill.jsx';
import { demoProfiles } from '../data/demoProfiles.js';
import { createMessageSuggestion } from '../lib/messageAssistant.js';
import { invalidateDraftIfScopeChanged } from '../lib/consent.js';
import { evaluateMessagePreviewIntegrity } from '../lib/integrity.js';

export default function ConnectionPage({ account, connections, updateConnection, addAuditEvent }) {
  const [activeConnectionRef, setActiveConnectionRef] = useState(null);
  const [showPersonaEditor, setShowPersonaEditor] = useState(false);
  const [showMeetingChecklist, setShowMeetingChecklist] = useState(false);
  const [meetingChecks, setMeetingChecks] = useState({});
  const [suggestion, setSuggestion] = useState(null);

  const activeConnections = connections.filter(c =>
    c.state === 'MUTUAL_INTEREST' || c.state === 'CONSENT_REVIEWED' ||
    c.state === 'LIMITED_CONVERSATION' || c.state === 'USER_CONFIRMED_EXPANSION' ||
    c.state === 'OPTIONAL_MEETING_PLANNING'
  );

  const activeConnection = connections.find(c => c.connectionRef === activeConnectionRef);
  const activeProfile = activeConnection ? demoProfiles.find(p => p.candidateRef === activeConnection.candidateRef) : null;

  function getScopesMap() {
    const map = {};
    connections.forEach(c => {
      map[c.connectionRef] = c.consent;
    });
    return map;
  }

  function handleConsentToggle(field) {
    if (!activeConnection) return;
    const current = activeConnection.consent[field].state;
    const newState = current === 'GRANTED' ? 'NO_GRANT' : 'GRANTED';
    
    const updatedConsent = {
      ...activeConnection.consent,
      [field]: { state: newState }
    };

    // Invalidate draft if a protected field was revoked
    let updatedDraft = { ...activeConnection.draft };
    if (newState !== 'GRANTED' && updatedDraft.protectedFields.includes(field)) {
      updatedDraft = {
        text: 'A privacy choice changed, so this draft is no longer available. Create a new version using your current sharing choices.',
        protectedFields: [],
        state: 'INVALIDATED'
      };
      addAuditEvent('DRAFT_INVALIDATED');
    }

    updateConnection(activeConnectionRef, {
      consent: updatedConsent,
      draft: updatedDraft
    });
    addAuditEvent(newState === 'GRANTED' ? 'CONSENT_GRANTED' : 'CONSENT_REVOKED');
  }

  function handleDraftChange(text) {
    if (!activeConnection) return;
    updateConnection(activeConnectionRef, {
      draft: { ...activeConnection.draft, text, state: 'DRAFTING' }
    });
  }

  function handleSuggestion(intent) {
    if (!activeConnection || !activeProfile) return;
    
    const visiblePreferences = {
      recipientRef: activeConnection.connectionRef,
      broadArea: activeConnection.consent.broadArea.state === 'GRANTED',
      interests: activeConnection.consent.interests.state === 'GRANTED',
      alcoholFreePreference: activeConnection.consent.alcoholFreePreference.state === 'GRANTED'
    };

    const result = createMessageSuggestion({
      intent,
      recipientDisplayName: activeProfile.displayName,
      visiblePreferences,
      currentScopes: getScopesMap()
    });

    setSuggestion(result);
  }

  function handlePreviewSend() {
    if (!activeConnection) return;

    // Check integrity
    const integrityResult = evaluateMessagePreviewIntegrity({
      attempts: activeConnection.integrity.actionAttempts,
      now: new Date().toISOString()
    });

    if (integrityResult.state === 'RATE_LIMITED') {
      updateConnection(activeConnectionRef, {
        integrity: {
          ...activeConnection.integrity,
          state: 'RATE_LIMITED'
        }
      });
      addAuditEvent('ACTION_PAUSED');
      return;
    }

    // Record attempt
    const newAttempts = [...activeConnection.integrity.actionAttempts, new Date().toISOString()];
    const newIntegrity = evaluateMessagePreviewIntegrity({
      attempts: newAttempts,
      now: new Date().toISOString()
    });

    // Check draft validity
    const scopes = getScopesMap();
    const draftResult = invalidateDraftIfScopeChanged({
      draft: activeConnection.draft,
      recipientRef: activeConnection.connectionRef,
      scopes,
      now: new Date().toISOString()
    });

    if (draftResult.invalidated) {
      updateConnection(activeConnectionRef, {
        draft: { text: draftResult.text, protectedFields: [], state: 'INVALIDATED' },
        integrity: { ...activeConnection.integrity, actionAttempts: newAttempts, state: newIntegrity.state }
      });
      addAuditEvent('DRAFT_INVALIDATED');
      return;
    }

    updateConnection(activeConnectionRef, {
      integrity: { ...activeConnection.integrity, actionAttempts: newAttempts, state: newIntegrity.state }
    });

    if (activeConnection.state === 'MUTUAL_INTEREST' || activeConnection.state === 'CONSENT_REVIEWED') {
      updateConnection(activeConnectionRef, { state: 'LIMITED_CONVERSATION' });
    }
  }

  function handlePauseConnection() {
    if (!activeConnection) return;
    updateConnection(activeConnectionRef, { paused: !activeConnection.paused });
    addAuditEvent(activeConnection.paused ? 'CONNECTION_RESUMED' : 'CONNECTION_PAUSED');
  }

  function handleBlockConnection() {
    if (!activeConnection) return;
    updateConnection(activeConnectionRef, { state: 'BLOCKED', paused: true });
  }

  function handlePersonaUpdate(field, value) {
    if (!activeConnection) return;
    updateConnection(activeConnectionRef, {
      recipientPersona: { ...activeConnection.recipientPersona, [field]: value }
    });
    if (field === 'displayName') {
      addAuditEvent('RECIPIENT_DISPLAY_NAME_UPDATED');
    }
  }

  function handleExpandConsent() {
    if (!activeConnection) return;
    updateConnection(activeConnectionRef, { state: 'USER_CONFIRMED_EXPANSION' });
  }

  if (activeConnections.length === 0) {
    return (
      <div>
        <SectionHeading title="Connections" subtitle="Your mutual-interest connections." />
        <EmptyState
          icon="💬"
          title="No connections yet"
          description="When you and someone both express interest, you'll see them here."
        />
      </div>
    );
  }

  if (!activeConnection) {
    return (
      <div>
        <SectionHeading title="Connections" subtitle="Select a connection to view." />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {activeConnections.map(conn => {
            const profile = demoProfiles.find(p => p.candidateRef === conn.candidateRef);
            return (
              <button
                key={conn.connectionRef}
                className="card"
                style={{ textAlign: 'left', cursor: 'pointer', width: '100%' }}
                onClick={() => setActiveConnectionRef(conn.connectionRef)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{profile ? profile.displayName : 'Connection'}</strong>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-muted-ink)' }}>
                      {conn.state.replace(/_/g, ' ')}
                    </div>
                  </div>
                  <span className={`state-badge ${conn.state === 'MUTUAL_INTEREST' ? 'state-badge--mutual' : 'state-badge--active'}`}>
                    {conn.state === 'MUTUAL_INTEREST' ? 'Mutual interest' : 'Active'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        className="btn btn--ghost btn--small"
        onClick={() => setActiveConnectionRef(null)}
        style={{ marginBottom: '16px' }}
      >
        ← Back to connections
      </button>

      <SectionHeading
        title={activeProfile ? activeProfile.displayName : 'Connection'}
        subtitle={`State: ${activeConnection.state.replace(/_/g, ' ')}`}
      />

      {activeConnection.paused && (
        <NoticeCard variant="warning">
          This connection is paused. You can resume anytime.
        </NoticeCard>
      )}

      {activeConnection.integrity.state !== 'NORMAL' && (
        <div className="integrity-notice">
          {activeConnection.integrity.state === 'ELEVATED_SCRUTINY'
            ? 'Several attempts happened close together. Everything is fine — this is just a brief pause to keep things comfortable.'
            : 'This action is briefly paused because several attempts happened close together. Your account remains available, and your saved draft is still here.'}
        </div>
      )}

      {/* Persona Editor */}
      <div className="card">
        <SectionHeading title="What this person sees" subtitle="Your display settings for this connection." />
        
        {showPersonaEditor ? (
          <div>
            <div className="form-group">
              <label className="form-label" htmlFor="persona-name">Display name for this connection</label>
              <input
                className="form-input"
                id="persona-name"
                type="text"
                value={activeConnection.recipientPersona.displayName}
                onChange={e => handlePersonaUpdate('displayName', e.target.value)}
                maxLength={30}
              />
            </div>
            <div className="form-group">
              <div className="form-checkbox-group">
                <input
                  type="checkbox"
                  id="persona-area"
                  checked={activeConnection.recipientPersona.broadAreaVisible}
                  onChange={e => handlePersonaUpdate('broadAreaVisible', e.target.checked)}
                />
                <label htmlFor="persona-area">Show broad area</label>
              </div>
            </div>
            <div className="form-group">
              <div className="form-checkbox-group">
                <input
                  type="checkbox"
                  id="persona-interests"
                  checked={activeConnection.recipientPersona.interestsVisible}
                  onChange={e => handlePersonaUpdate('interestsVisible', e.target.checked)}
                />
                <label htmlFor="persona-interests">Show interests</label>
              </div>
            </div>
            <button className="btn btn--ghost btn--small" onClick={() => setShowPersonaEditor(false)}>
              Done
            </button>
          </div>
        ) : (
          <div>
            <p><strong>Name shown:</strong> {activeConnection.recipientPersona.displayName}</p>
            <p>Area visible: {activeConnection.recipientPersona.broadAreaVisible ? 'Yes' : 'No'}</p>
            <p>Interests visible: {activeConnection.recipientPersona.interestsVisible ? 'Yes' : 'No'}</p>
            <button
              className="btn btn--ghost btn--small"
              style={{ marginTop: '8px' }}
              onClick={() => setShowPersonaEditor(true)}
            >
              Edit what they see
            </button>
          </div>
        )}
      </div>

      {/* Consent Controls */}
      <div className="card">
        <SectionHeading title="Sharing choices" subtitle="Control what is visible in this connection." />
        <ul className="consent-list">
          {Object.entries(activeConnection.consent).map(([field, scope]) => (
            <li key={field} className="consent-item">
              <div>
                <strong>{field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-muted-ink)' }}>
                  {scope.state === 'GRANTED' ? 'Shared with this connection' : 'Not shared with this connection'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PrivacyPill state={scope.state} />
                <button
                  className="btn btn--ghost btn--small"
                  onClick={() => handleConsentToggle(field)}
                >
                  {scope.state === 'GRANTED' ? 'Revoke' : 'Share'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Message Composer */}
      {(activeConnection.state === 'MUTUAL_INTEREST' || activeConnection.state === 'CONSENT_REVIEWED' || activeConnection.state === 'LIMITED_CONVERSATION') && (
        <div className="composer">
          <SectionHeading title="Draft a message" subtitle="This stays local. Nothing is sent." />
          <textarea
            className="composer__textarea"
            value={activeConnection.draft.text}
            onChange={e => handleDraftChange(e.target.value)}
            placeholder="Write something..."
            aria-label="Message draft"
          />
          
          {activeConnection.draft.state === 'INVALIDATED' && (
            <NoticeCard variant="privacy">
              A privacy choice changed, so this draft is no longer available. Create a new version using your current sharing choices.
            </NoticeCard>
          )}

          <div className="composer__actions">
            <button className="btn btn--ghost btn--small" onClick={() => handleSuggestion('low-pressure-opening')}>
              Suggest opening
            </button>
            <button className="btn btn--ghost btn--small" onClick={() => handleSuggestion('warm-rephrase')}>
              Warm rephrase
            </button>
            <button className="btn btn--ghost btn--small" onClick={() => handleSuggestion('clear-rephrase')}>
              Clear rephrase
            </button>
            <button className="btn btn--ghost btn--small" onClick={() => handleSuggestion('boundary-statement')}>
              Boundary
            </button>
            <button className="btn btn--ghost btn--small" onClick={() => handleSuggestion('pause-statement')}>
              Pause message
            </button>
            {activeConnection.consent.alcoholFreePreference.state === 'GRANTED' && (
              <button className="btn btn--ghost btn--small" onClick={() => handleSuggestion('alcohol-free-wording')}>
                Alcohol-free wording
              </button>
            )}
          </div>

          {suggestion && suggestion.text && (
            <div className="composer__suggestion">
              <strong>Suggestion:</strong> {suggestion.text}
              <br />
              <button
                className="btn btn--ghost btn--small"
                style={{ marginTop: '4px' }}
                onClick={() => {
                  handleDraftChange(suggestion.text);
                  setSuggestion(null);
                }}
              >
                Use this
              </button>
            </div>
          )}

          {suggestion && suggestion.error && (
            <NoticeCard variant="warning">
              {suggestion.error}
            </NoticeCard>
          )}

          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <button className="btn btn--secondary" onClick={handlePreviewSend}>
              Send preview
            </button>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted-ink)', marginTop: '8px' }}>
            Demo preview only. Hearthline Starter does not send messages.
          </p>
        </div>
      )}

      {/* Expansion and Meeting */}
      {activeConnection.state === 'LIMITED_CONVERSATION' && (
        <div className="card">
          <button className="btn btn--secondary" onClick={handleExpandConsent}>
            Confirm expanded connection
          </button>
        </div>
      )}

      {activeConnection.state === 'USER_CONFIRMED_EXPANSION' && (
        <div className="card">
          <SectionHeading title="Optional meeting planning" subtitle="Only when you're both ready." />
          {!showMeetingChecklist ? (
            <button className="btn btn--secondary" onClick={() => { setShowMeetingChecklist(true); addAuditEvent('MEETING_PLANNING_OPENED'); }}>
              Open meeting-planning checklist
            </button>
          ) : (
            <ul className="checklist">
              {[
                'Choose a public place you are comfortable with',
                'Consider telling someone you trust if you want to',
                'Decide how you plan to get there and home',
                'Choose a personal time boundary',
                'Keep contact details private until you choose otherwise',
                'Use pause or block if something feels wrong'
              ].map((item, idx) => (
                <li key={idx} className="checklist__item">
                  <input
                    type="checkbox"
                    id={`meeting-${idx}`}
                    checked={meetingChecks[idx] || false}
                    onChange={e => setMeetingChecks(prev => ({ ...prev, [idx]: e.target.checked }))}
                  />
                  <label htmlFor={`meeting-${idx}`}>{item}</label>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Pause and Block */}
      <div className="card" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button className="btn btn--ghost" onClick={handlePauseConnection}>
          {activeConnection.paused ? 'Resume connection' : 'Pause connection'}
        </button>
        <button className="btn btn--danger" onClick={handleBlockConnection}>
          Block
        </button>
      </div>
    </div>
  );
}
