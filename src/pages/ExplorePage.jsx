import React, { useState, useMemo } from 'react';
import SectionHeading from '../components/SectionHeading.jsx';
import EmptyState from '../components/EmptyState.jsx';
import NoticeCard from '../components/NoticeCard.jsx';
import { demoProfiles } from '../data/demoProfiles.js';
import { evaluateCandidatePresentation } from '../lib/matching.js';

export default function ExplorePage({ account, connections, addConnection, updateConnection, setCurrentPage, addAuditEvent }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [passHistory, setPassHistory] = useState([]);

  const visibleProfiles = useMemo(() => {
    if (!account.onboardingComplete) return [];
    
    return demoProfiles
      .filter(profile => {
        // Don't show passed profiles
        if (passHistory.includes(profile.candidateRef)) return false;
        // Don't show already-connected profiles
        const existingConnection = connections.find(c => c.candidateRef === profile.candidateRef);
        if (existingConnection && existingConnection.state !== 'DISCOVERABLE') return false;
        return true;
      })
      .filter(profile => {
        // Apply presentation logic
        const result = evaluateCandidatePresentation({
          viewer: {
            adultConfirmed: account.adultConfirmed,
            age: account.age,
            ageRange: account.ageRange,
            intents: account.intents,
            interests: account.interests,
            pace: account.pace,
            broadArea: account.broadArea
          },
          candidate: profile,
          visibleFields: {}
        });
        return result.presented;
      });
  }, [account, connections, passHistory]);

  const maxShow = account.lowEnergyMode ? 1 : 3;
  const visibleSlice = visibleProfiles.slice(currentIndex, currentIndex + maxShow);

  function getPresentationForProfile(profile) {
    return evaluateCandidatePresentation({
      viewer: {
        adultConfirmed: account.adultConfirmed,
        age: account.age,
        ageRange: account.ageRange,
        intents: account.intents,
        interests: account.interests,
        pace: account.pace,
        broadArea: account.broadArea
      },
      candidate: profile,
      visibleFields: {}
    });
  }

  function handleInterest(profile) {
    const existingConnection = connections.find(c => c.candidateRef === profile.candidateRef);
    
    if (existingConnection) {
      // Update existing connection
      const newState = profile.candidateInterested ? 'MUTUAL_INTEREST' : 'DISCOVERABLE';
      updateConnection(existingConnection.connectionRef, {
        viewerInterested: true,
        state: newState
      });
    } else {
      // Create new connection
      const connection = {
        connectionRef: `connection-${profile.candidateRef}`,
        candidateRef: profile.candidateRef,
        state: profile.candidateInterested ? 'MUTUAL_INTEREST' : 'DISCOVERABLE',
        viewerInterested: true,
        candidateInterested: profile.candidateInterested,
        paused: false,
        recipientPersona: {
          displayName: account.displayName,
          broadAreaVisible: true,
          interestsVisible: true,
          preferenceVisible: false
        },
        consent: {
          displayName: { state: 'GRANTED' },
          broadArea: { state: 'GRANTED' },
          interests: { state: 'GRANTED' },
          alcoholFreePreference: { state: 'NO_GRANT' },
          phoneNumber: { state: 'NO_GRANT' }
        },
        draft: {
          text: '',
          protectedFields: [],
          state: 'RENDER_REQUIRES_CURRENT_CONSENT'
        },
        integrity: {
          state: 'NORMAL',
          actionAttempts: []
        }
      };
      addConnection(connection);
    }

    if (profile.candidateInterested) {
      addAuditEvent('CONSENT_GRANTED');
    }
  }

  function handlePass(profile) {
    setPassHistory(prev => [...prev, profile.candidateRef]);
  }

  if (!account.onboardingComplete) {
    return (
      <EmptyState
        icon="🌱"
        title="Welcome to Hearthline"
        description="Complete the onboarding to start exploring connections."
      />
    );
  }

  if (account.paused) {
    return (
      <div>
        <SectionHeading title="Explore" subtitle="Connection activity is paused." />
        <NoticeCard variant="info">
          Your connections are on hold. Nothing is lost. You can resume anytime from the Pace page.
        </NoticeCard>
      </div>
    );
  }

  if (visibleSlice.length === 0) {
    return (
      <div>
        <SectionHeading title="Explore" subtitle="People you might connect with." />
        <EmptyState
          icon="✨"
          title="You've seen everyone"
          description="Check back later or adjust your preferences in Settings."
        />
      </div>
    );
  }

  return (
    <div>
      <SectionHeading title="Explore" subtitle="People you might connect with." />
      
      {account.lowEnergyMode && (
        <NoticeCard variant="info">
          Low-energy mode: showing one profile at a time.
        </NoticeCard>
      )}

      {visibleSlice.map(profile => {
        const presentation = getPresentationForProfile(profile);
        return (
          <div key={profile.candidateRef} className="profile-card">
            <div className={`profile-card__photo profile-card__photo--${profile.photoGradient}`}>
              {profile.displayName[0]}
            </div>
            <div className="profile-card__body">
              <div className="profile-card__name">{profile.displayName}, {profile.age}</div>
              <div className="profile-card__meta">{profile.broadArea} · {profile.pace.toLowerCase()} pace</div>
              <p className="profile-card__about">"{profile.about}"</p>
              <div className="profile-card__interests">
                {profile.interests.map(i => (
                  <span key={i} className="interest-tag">{i}</span>
                ))}
              </div>

              {presentation.explanations.length > 0 && (
                <div className="overlap-box">
                  <div className="overlap-box__title">Shown because:</div>
                  <ul className="overlap-box__list">
                    {presentation.explanations.map((exp, idx) => (
                      <li key={idx}>{exp}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button
                  className="btn btn--primary"
                  onClick={() => handleInterest(profile)}
                >
                  Interested
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={() => handlePass(profile)}
                >
                  Pass for now
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
