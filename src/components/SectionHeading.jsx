import React from 'react';

export default function SectionHeading({ title, subtitle }) {
  return (
    <div className="section-heading">
      <h2 className="section-heading__title">{title}</h2>
      {subtitle && <p className="section-heading__subtitle">{subtitle}</p>}
    </div>
  );
}
