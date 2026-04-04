import React from 'react';

export default function NotFound() {
  return (
    <div className="sc-not-found">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: '0.08em', color: '#fff' }}>Soul Community</div>
        <div style={{ fontSize: 9, color: '#e8a020', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 2 }}>Be the best you can be</div>
      </div>
      <div className="sc-not-found-titel">Oeps</div>
      <p className="sc-not-found-sub">
        Deze link werkt niet. Gebruik de persoonlijke link die je van Ricardo hebt ontvangen.
      </p>
    </div>
  );
}
