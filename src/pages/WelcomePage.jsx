import React, { useState } from 'react';
import SectionHeading from '../components/SectionHeading.jsx';
import NoticeCard from '../components/NoticeCard.jsx';
import { INTENT_OPTIONS, INTEREST_OPTIONS, PACE_OPTIONS, BROAD_AREAS } from '../data/demoProfiles.js';

export default function WelcomePage({ account, updateAccount, setCurrentPage, addAuditEvent }) {
  const [adultConfirmed, setAdultConfirmed] = useState(account.adultConfirmed || false);
  const [displayName, setDisplayName] = useState(account.displayName || '');
  const [broadArea, setBroadArea] = useState(account.broadArea || '');
  const [intents, setIntents] = useState(account.intents || []);
  const [interests, setInterests] = useState(account.interests || []);
  const [pace, setPace] = useState(account.pace || 'SLOWER');
  const [lowEnergyMode, setLowEnergyMode] = useState(account.lowEnergyMode || false);

  const canStart = adultConfirmed && displayName.trim().length > 0 && broadArea && intents.length > 0;

  function toggleInterest(interest) {
    setInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  }

  function toggleIntent(intent) {
    setIntents(prev =>
      prev.includes(intent) ? prev.filter(i => i !== intent) : [...prev, intent]
    );
  }

  function handleStart() {
    if (!canStart) return;
    updateAccount({
      adultConfirmed: true,
      displayName: displayName.trim(),
      broadArea,
      intents,
      interests,
      pace,
      lowEnergyMode,
      onboardingComplete: true
    });
    setCurrentPage('explore');
  }

  return (
    <div>
      <div className="welcome">
        <h1 className="welcome__title">Hearthline</h1>
        <p className="welcome__tagline">Connection at your pace.</p>
      </div>

      <div className="welcome__promise">
        <p>
          Hearthline helps you choose your pace, control what you share, and connect
          through mutual interest. It does not score your worth, diagnose you, or send
          messages for you.
        </p>
      </div>

      <NoticeCard variant="privacy">
        <strong>Privacy first.</strong> Everything in this demo stays in your browser.
        No data is sent anywhere. You can reset at any time.
      </NoticeCard>

      <div className="card">
        <SectionHeading title="Get started" subtitle="A few quick choices to begin." />

        <div className="form-group">
          <div className="form-checkbox-group">
            <input
              type="checkbox"
              id="adult-confirm"
              checked={adultConfirmed}
              onChange={e => setAdultConfirmed(e.target.checked)}
            />
            <label htmlFor="adult-confirm">
              I confirm that I am an adult and that I will use Hearthline respectfully.
            </label>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="display-name">Display name</label>
          <input
            className="form-input"
            id="display-name"
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Choose a name or pseudonym"
            maxLength={30}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="broad-area">Broad area</label>
          <select
            className="form-select"
            id="broad-area"
            value={broadArea}
            onChange={e => setBroadArea(e.target.value)}
          >
            <option value="">Select an area</option>
            {BROAD_AREAS.map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">What are you looking for?</label>
          <div className="multi-select">
            {INTENT_OPTIONS.map(intent => (
              <button
                key={intent}
                type="button"
                className={`multi-select__option ${intents.includes(intent) ? 'multi-select__option--selected' : ''}`}
                onClick={() => toggleIntent(intent)}
              >
                {intent}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Interests (optional)</label>
          <div className="multi-select">
            {INTEREST_OPTIONS.slice(0, 9).map(interest => (
              <button
                key={interest}
                type="button"
                className={`multi-select__option ${interests.includes(interest) ? 'multi-select__option--selected' : ''}`}
                onClick={() => toggleInterest(interest)}
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
                className={`pace-option ${pace === option.value ? 'pace-option--selected' : ''}`}
                onClick={() => setPace(option.value)}
                role="radio"
                aria-checked={pace === option.value}
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setPace(option.value); }}
              >
                <div className="pace-option__title">{option.label}</div>
                <div className="pace-option__desc">{option.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <div className="form-checkbox-group">
            <input
              type="checkbox"
              id="low-energy"
              checked={lowEnergyMode}
              onChange={e => setLowEnergyMode(e.target.checked)}
            />
            <label htmlFor="low-energy">Low-energy mode (show one profile at a time)</label>
          </div>
        </div>

        <button
          className="btn btn--primary btn--block"
          onClick={handleStart}
          disabled={!canStart}
          style={{ marginTop: '16px' }}
        >
          Start exploring
        </button>
      </div>
    </div>
  );
}
