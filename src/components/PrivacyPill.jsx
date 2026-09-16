import React from 'react';

export default function PrivacyPill({ state }) {
  const variants = {
    GRANTED: { className: 'privacy-pill--granted', label: 'Shared' },
    NO_GRANT: { className: 'privacy-pill--pending', label: 'Not shared' },
    REVOKED: { className: 'privacy-pill--revoked', label: 'Revoked' },
    EXPIRED: { className: 'privacy-pill--revoked', label: 'Expired' }
  };

  const variant = variants[state] || variants.NO_GRANT;

  return (
    <span className={`privacy-pill ${variant.className}`}>
      {variant.label}
    </span>
  );
}
