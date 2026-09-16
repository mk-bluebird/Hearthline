import React from 'react';

export default function EmptyState({ icon, title, description }) {
  return (
    <div className="empty-state" role="status">
      <div className="empty-state__icon" aria-hidden="true">{icon || '🌿'}</div>
      <h3>{title || 'Nothing here yet'}</h3>
      {description && <p style={{ marginTop: '8px', color: 'var(--color-muted-ink)' }}>{description}</p>}
    </div>
  );
}
