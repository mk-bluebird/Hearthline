import React from 'react';
import SectionHeading from '../components/SectionHeading.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { formatTimestamp } from '../lib/date.js';

export default function HistoryPage({ auditLog }) {
  return (
    <div>
      <SectionHeading title="History" subtitle="Content-free privacy and security events." />

      {auditLog.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No events yet"
          description="Privacy and security events will appear here as you use Hearthline."
        />
      ) : (
        <div className="card">
          <ul className="history-list">
            {auditLog.map((event, idx) => (
              <li key={event.eventRef || idx} className="history-item">
                <div>{event.description}</div>
                <div className="history-item__time">{formatTimestamp(event.occurredAt)}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
