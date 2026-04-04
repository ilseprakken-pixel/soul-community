import React from 'react';

export default function NotFound() {
  return (
    <div className="not-found">
      <div className="logo" style={{ fontSize: 28, marginBottom: 24 }}>
        Soul <span style={{ color: 'var(--goud)', fontStyle: 'italic' }}>Community</span>
      </div>
      <div className="not-found-titel">Oeps</div>
      <p className="not-found-sub">
        Deze link werkt niet. Gebruik de persoonlijke link die je van Ricardo hebt ontvangen.
      </p>
    </div>
  );
}
