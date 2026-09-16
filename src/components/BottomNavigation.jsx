import React from 'react';

const NAV_ITEMS = [
  { id: 'explore', label: 'Explore', icon: '🔍' },
  { id: 'connections', label: 'Connections', icon: '💬' },
  { id: 'pace', label: 'Pace', icon: '🕊️' },
  { id: 'privacy', label: 'Privacy', icon: '🔒' },
  { id: 'security', label: 'Security', icon: '🛡️' },
  { id: 'settings', label: 'Settings', icon: '⚙️' }
];

export default function BottomNavigation({ currentPage, setCurrentPage }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {NAV_ITEMS.map(item => (
        <button
          key={item.id}
          className={`bottom-nav__item ${currentPage === item.id ? 'bottom-nav__item--active' : ''}`}
          onClick={() => setCurrentPage(item.id)}
          aria-current={currentPage === item.id ? 'page' : undefined}
        >
          <span className="bottom-nav__icon" aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
