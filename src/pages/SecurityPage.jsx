import React, { useState, useEffect } from 'react';
import SectionHeading from '../components/SectionHeading.jsx';
import NoticeCard from '../components/NoticeCard.jsx';
import { inspectPasskeyCapability } from '../lib/webauthn.js';

export default function SecurityPage({ account, updateAccount, addAuditEvent }) {
  const [capability, setCapability] = useState(null);
  const [checking, setChecking] = useState(false);

  async function handleCheck() {
    setChecking(true);
    try {
      const result = await inspectPasskeyCapability();
      setCapability(result);
      updateAccount({
        passkeyCapabilityChecked: true,
        passkeySupported: result.webAuthnAvailable,
        userVerificationAvailable: result.userVerifyingPlatformAuthenticatorAvailable
      });
      addAuditEvent('PASSKEY_CHECKED');
    } catch {
      setCapability({
        webAuthnAvailable: false,
        credentialsApiAvailable: false,
        userVerifyingPlatformAuthenticatorAvailable: false,
        secureContext: false,
        checkedAt: new Date().toISOString()
      });
    }
    setChecking(false);
  }

  useEffect(() => {
    if (!account.passkeyCapabilityChecked) {
      handleCheck();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <SectionHeading title="Security" subtitle="Browser passkey readiness and secure sign-in." />

      <div className="card">
        <SectionHeading title="Passkey capability" />
        
        {checking && <p>Checking browser capabilities...</p>}
        
        {capability && !checking && (
          <div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                <span>WebAuthn available</span>
                <span style={{ color: capability.webAuthnAvailable ? 'var(--color-moss)' : 'var(--color-muted-ink)' }}>
                  {capability.webAuthnAvailable ? '✓ Available on this browser' : '✗ Not available on this browser'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                <span>Credentials API</span>
                <span style={{ color: capability.credentialsApiAvailable ? 'var(--color-moss)' : 'var(--color-muted-ink)' }}>
                  {capability.credentialsApiAvailable ? '✓ Available' : '✗ Not available'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                <span>User-verifying authenticator</span>
                <span style={{ color: capability.userVerifyingPlatformAuthenticatorAvailable ? 'var(--color-moss)' : 'var(--color-muted-ink)' }}>
                  {capability.userVerifyingPlatformAuthenticatorAvailable ? '✓ Available' : '✗ Not available'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span>Secure context</span>
                <span style={{ color: capability.secureContext ? 'var(--color-moss)' : 'var(--color-muted-ink)' }}>
                  {capability.secureContext ? '✓ Yes' : '✗ No'}
                </span>
              </div>
            </div>
            
            <button className="btn btn--ghost btn--small" onClick={handleCheck}>
              Re-check capability
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <SectionHeading title="Readiness checklist" />
        <ul style={{ paddingLeft: '20px', lineHeight: '2' }}>
          <li>✓ Secure sign-in capability checked</li>
          <li>✓ Backup access planning reminder available</li>
          <li>✓ Privacy controls reviewed</li>
          <li>✓ Pacing controls ready</li>
        </ul>
      </div>

      <NoticeCard variant="info">
        <strong>About this check:</strong> This demo checks browser capability only. A production
        service would complete server-verified passkey enrollment before creating an account credential.
        No credentials are created or stored in this demo.
      </NoticeCard>
    </div>
  );
}
