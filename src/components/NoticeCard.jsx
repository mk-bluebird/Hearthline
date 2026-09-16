import React from 'react';

export default function NoticeCard({ variant = 'info', children }) {
  return (
    <div className={`notice-card notice-card--${variant}`} role="note">
      {children}
    </div>
  );
}
