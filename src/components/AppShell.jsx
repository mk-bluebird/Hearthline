import React from 'react';

export default function AppShell({ children, currentPage, setCurrentPage }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <div className="app-header__title">Hearthline</div>
          <div className="app-header__subtitle">Connection at your pace</div>
        </div>
      </header>
      <main className="app-main">
        {children}
      </main>
    </div>
  );
}
