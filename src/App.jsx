import React from 'react';
import './styles/global.css';
import './styles/components.css';
import AppShell from './components/AppShell.jsx';
import BottomNavigation from './components/BottomNavigation.jsx';
import WelcomePage from './pages/WelcomePage.jsx';
import ExplorePage from './pages/ExplorePage.jsx';
import ConnectionPage from './pages/ConnectionPage.jsx';
import PacePage from './pages/PacePage.jsx';
import PrivacyPage from './pages/PrivacyPage.jsx';
import SecurityPage from './pages/SecurityPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import { useHearthlineStore } from './hooks/useHearthlineStore.js';

export default function App() {
  const store = useHearthlineStore();

  function renderPage() {
    switch (store.currentPage) {
      case 'welcome':
        return (
          <WelcomePage
            account={store.account}
            updateAccount={store.updateAccount}
            setCurrentPage={store.setCurrentPage}
            addAuditEvent={store.addAuditEvent}
          />
        );
      case 'explore':
        return (
          <ExplorePage
            account={store.account}
            connections={store.connections}
            addConnection={store.addConnection}
            updateConnection={store.updateConnection}
            setCurrentPage={store.setCurrentPage}
            addAuditEvent={store.addAuditEvent}
          />
        );
      case 'connections':
        return (
          <ConnectionPage
            account={store.account}
            connections={store.connections}
            updateConnection={store.updateConnection}
            addAuditEvent={store.addAuditEvent}
          />
        );
      case 'pace':
        return (
          <PacePage
            account={store.account}
            updateAccount={store.updateAccount}
            addAuditEvent={store.addAuditEvent}
          />
        );
      case 'privacy':
        return (
          <PrivacyPage
            account={store.account}
            updateAccount={store.updateAccount}
            addAuditEvent={store.addAuditEvent}
            setCurrentPage={store.setCurrentPage}
          />
        );
      case 'security':
        return (
          <SecurityPage
            account={store.account}
            updateAccount={store.updateAccount}
            addAuditEvent={store.addAuditEvent}
          />
        );
      case 'history':
        return (
          <HistoryPage
            auditLog={store.auditLog}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            account={store.account}
            updateAccount={store.updateAccount}
            setCurrentPage={store.setCurrentPage}
            resetAll={store.resetAll}
            getExportPreview={store.getExportPreview}
            addAuditEvent={store.addAuditEvent}
          />
        );
      default:
        return (
          <WelcomePage
            account={store.account}
            updateAccount={store.updateAccount}
            setCurrentPage={store.setCurrentPage}
            addAuditEvent={store.addAuditEvent}
          />
        );
    }
  }

  const showNav = store.account.onboardingComplete && store.currentPage !== 'welcome';

  return (
    <AppShell currentPage={store.currentPage} setCurrentPage={store.setCurrentPage}>
      {renderPage()}
      {showNav && (
        <BottomNavigation
          currentPage={store.currentPage}
          setCurrentPage={store.setCurrentPage}
        />
      )}
    </AppShell>
  );
}
