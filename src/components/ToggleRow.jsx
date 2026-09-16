import React from 'react';

export default function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="toggle-row">
      <div>
        <div className="toggle-row__label">{label}</div>
        {description && <div className="toggle-row__desc">{description}</div>}
      </div>
      <button
        className={`toggle-switch ${checked ? 'toggle-switch--active' : ''}`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        aria-label={label}
      />
    </div>
  );
}
