import React from 'react';
import SectionHeading from '../components/SectionHeading.jsx';
import NoticeCard from '../components/NoticeCard.jsx';
import ToggleRow from '../components/ToggleRow.jsx';
import { PACE_OPTIONS } from '../data/demoProfiles.js';

export default function PacePage({ account, updateAccount, addAuditEvent }) {
  function handlePaceChange(newPace) {
    updateAccount({ pace: newPace });
    addAuditEvent('PACE_CHANGED');
  }

  function handleLowEnergyToggle() {
    updateAccount({ lowEnergyMode: !account.lowEnergyMode });
    addAuditEvent('LOW_ENERGY_TOGGLED');
  }

  function handlePauseToggle() {
    updateAccount({ paused: !account.paused });
    addAuditEvent(account.paused ? 'CONNECTION_RESUMED' : 'CONNECTION_PAUSED');
  }

  function handleVisibilityUpdate(field, value) {
    updateAccount({
      visibilityWindow: { ...account.visibilityWindow, [field]: value }
    });
  }

  function toggleDay(day) {
    const days = account.visibilityWindow.activeDays;
    const newDays = days.includes(day) ? days.filter(d => d !== day) : [...days, day];
    handleVisibilityUpdate('activeDays', newDays);
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      <SectionHeading title="Pace" subtitle="Control how and when you interact." />

      {account.paused && (
        <NoticeCard variant="warning">
          Connection activity is paused. Nothing is lost, and no response penalty applies.
        </NoticeCard>
      )}

      <div className="card">
        <SectionHeading title="Conversation pace" />
        <div className="pace-options">
          {PACE_OPTIONS.map(option => (
            <div
              key={option.value}
              className={`pace-option ${account.pace === option.value ? 'pace-option--selected' : ''}`}
              onClick={() => handlePaceChange(option.value)}
              role="radio"
              aria-checked={account.pace === option.value}
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handlePaceChange(option.value); }}
            >
              <div className="pace-option__title">{option.label}</div>
              <div className="pace-option__desc">{option.description}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <SectionHeading title="Comfort settings" />
        <ToggleRow
          label="Low-energy mode"
          description="Show one profile at a time, reduce secondary information."
          checked={account.lowEnergyMode}
          onChange={handleLowEnergyToggle}
        />
        <ToggleRow
          label="Pause connection activity"
          description="Hold all interactions. Nothing is lost."
          checked={account.paused}
          onChange={handlePauseToggle}
        />
      </div>

      <div className="card">
        <SectionHeading title="Visibility window" subtitle="Choose when Hearthline is active for you." />
        
        <div className="form-group">
          <label className="form-label">Active days</label>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {dayNames.map((name, idx) => (
              <button
                key={idx}
                className={`multi-select__option ${account.visibilityWindow.activeDays.includes(idx) ? 'multi-select__option--selected' : ''}`}
                onClick={() => toggleDay(idx)}
                style={{ minWidth: '44px' }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label" htmlFor="vis-start">Start time</label>
            <input
              className="form-input"
              id="vis-start"
              type="time"
              value={account.visibilityWindow.startTime}
              onChange={e => handleVisibilityUpdate('startTime', e.target.value)}
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label" htmlFor="vis-end">End time</label>
            <input
              className="form-input"
              id="vis-end"
              type="time"
              value={account.visibilityWindow.endTime}
              onChange={e => handleVisibilityUpdate('endTime', e.target.value)}
            />
          </div>
        </div>

        <ToggleRow
          label="Candidate presentation"
          description="Show new people during active hours."
          checked={account.visibilityWindow.candidatePresentation}
          onChange={v => handleVisibilityUpdate('candidatePresentation', v)}
        />
        <ToggleRow
          label="Existing conversations"
          description="Allow conversation access during active hours."
          checked={account.visibilityWindow.existingConversations}
          onChange={v => handleVisibilityUpdate('existingConversations', v)}
        />
        <ToggleRow
          label="Digest notification"
          description="Receive a summary outside active hours."
          checked={account.visibilityWindow.digestNotification}
          onChange={v => handleVisibilityUpdate('digestNotification', v)}
        />
      </div>

      <NoticeCard variant="info">
        This interaction is held until your selected time. Nothing is lost, and no response penalty applies.
      </NoticeCard>
    </div>
  );
}
