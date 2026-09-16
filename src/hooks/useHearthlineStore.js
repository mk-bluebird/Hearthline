import { useLocalStorage } from './useLocalStorage.js';
import { createAuditEvent } from '../lib/audit.js';

const DEFAULT_ACCOUNT = {
  accountRef: 'local-account',
  displayName: '',
  age: 38,
  ageRange: [30, 55],
  broadArea: '',
  intents: [],
  interests: [],
  pace: 'SLOWER',
  lowEnergyMode: false,
  paused: false,
  adultConfirmed: false,
  onboardingComplete: false,
  manualCandidateReview: true,
  neutralReminderLanguage: true,
  privacyReviewBeforeExpansion: true,
  passkeyCapabilityChecked: false,
  passkeySupported: false,
  userVerificationAvailable: false,
  supportContact: {
    enabled: false,
    label: '',
    noticePreference: 'none',
    checkInPreference: 'none'
  },
  visibilityWindow: {
    activeDays: [1, 2, 3, 4, 5, 6, 0],
    startTime: '08:00',
    endTime: '22:00',
    candidatePresentation: true,
    existingConversations: true,
    digestNotification: false
  }
};

const INITIAL_CONNECTIONS = [];

export function useHearthlineStore() {
  const [account, setAccount] = useLocalStorage('hearthline-account', DEFAULT_ACCOUNT);
  const [connections, setConnections] = useLocalStorage('hearthline-connections', INITIAL_CONNECTIONS);
  const [auditLog, setAuditLog] = useLocalStorage('hearthline-audit', []);
  const [currentPage, setCurrentPage] = useLocalStorage('hearthline-page', 'welcome');

  function addAuditEvent(eventType) {
    const result = createAuditEvent({
      eventType,
      actorRole: 'local-user',
      occurredAt: new Date().toISOString()
    });
    if (result.created) {
      setAuditLog(prev => [result.event, ...prev].slice(0, 100));
    }
  }

  function updateAccount(updates) {
    setAccount(prev => ({ ...prev, ...updates }));
  }

  function addConnection(connection) {
    setConnections(prev => [...prev, connection]);
  }

  function updateConnection(connectionRef, updates) {
    setConnections(prev => prev.map(c =>
      c.connectionRef === connectionRef ? { ...c, ...updates } : c
    ));
  }

  function resetAll() {
    setAccount(DEFAULT_ACCOUNT);
    setConnections(INITIAL_CONNECTIONS);
    setAuditLog([]);
    setCurrentPage('welcome');
  }

  function getExportPreview() {
    return {
      settings: {
        displayName: account.displayName,
        broadArea: account.broadArea,
        intents: account.intents,
        interests: account.interests,
        pace: account.pace,
        lowEnergyMode: account.lowEnergyMode,
        paused: account.paused
      },
      paceConfiguration: {
        pace: account.pace,
        visibilityWindow: account.visibilityWindow
      },
      activityHistory: auditLog.map(e => ({
        type: e.eventType,
        description: e.description,
        at: e.occurredAt
      })),
      connectionCount: connections.length
    };
  }

  return {
    account,
    connections,
    auditLog,
    currentPage,
    setCurrentPage,
    updateAccount,
    addConnection,
    updateConnection,
    addAuditEvent,
    resetAll,
    getExportPreview
  };
}
