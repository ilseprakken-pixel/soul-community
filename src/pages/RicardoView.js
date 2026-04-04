import React, { useEffect, useState, useCallback } from 'react';
import { getLessen, getAanmeldingen, afmelden } from '../lib/sheets';

const BEHEER_TOKEN = process.env.REACT_APP_BEHEER_TOKEN;

function initials(naam) {
  const parts = naam.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return naam.substring(0, 2).toUpperCase();
}

function Toast({ msg }) {
  return <div className={`toast ${msg ? 'show' : ''}`}>{msg}</div>;
}

export default function RicardoView() {
  const [toegang, setToegang] = useState(false);
  const [wachtwoord, setWachtwoord] = useState('');
  const [lessen, setLessen] = useState([]);
  const [loading, setLoading] = useState(false);
  const [geselecteerdeLes, setGeselecteerdeLes] = useState(null);
  const [aanmeldingenMap, setAanmeldingenMap] = useState({});
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const laadLessen = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLessen();
      const actief = data.filter(l => l.actief);
      setLessen(actief);
      // Laad aanmeldingen voor alle lessen parallel
      const entries = await Promise.all(
        actief.map(async (les) => {
          const a = await getAanmeldingen(les.id);
          return [les.id, a];
        })
      );
      setAanmeldingenMap(Object.fromEntries(entries));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (toegang) laadLessen();
  }, [toegang, laadLessen]);

  const login = () => {
    if (wachtwoord === BEHEER_TOKEN) setToegang(true);
    else alert('Onjuist wachtwoord');
  };

  const openLes = (les) => setGeselecteerdeLes(les);
  const sluit = () => setGeselecteerdeLes(null);

  const handleVerwijder = async (lidId, naam) => {
    if (!window.confirm(`${naam} afmelden?`)) return;
    try {
      await afmelden(lidId, geselecteerdeLes.id);
      const data = await getAanmeldingen(geselecteerdeLes.id);
      setAanmeldingenMap(prev => ({ ...prev, [geselecteerdeLes.id]: data }));
      showToast(`${naam} afgemeld`);
    } catch {
      showToast('Er ging iets mis');
    }
  };

  // ── Login scherm ─────────────────────────────────────────────────────────

  if (!toegang) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="logo">Soul <span>Community</span></div>
          <div className="page-sub">Beheerder</div>
        </div>
        <div className="section">
          <div className="card" style={{ padding: 20 }}>
            <p style={{ fontSize: 14, color: 'var(--grijs)', marginBottom: 12 }}>
              Voer het beheerderswachtwoord in
            </p>
            <input
              type="password"
              value={wachtwoord}
              onChange={e => setWachtwoord(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
              placeholder="Wachtwoord"
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid var(--rand)',
                borderRadius: 8, fontSize: 15, fontFamily: 'var(--font-body)',
                background: 'var(--wit)', marginBottom: 10
              }}
            />
            <button className="btn btn-aanmeld" onClick={login}>Inloggen</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Detailview les ───────────────────────────────────────────────────────

  if (geselecteerdeLes) {
    const les = geselecteerdeLes;
    const alle = aanmeldingenMap[les.id] || [];
    const leiders = alle.filter(a => a.rol === 'leider' && a.status === 'bevestigd');
    const volgers = alle.filter(a => a.rol === 'volger' && a.status === 'bevestigd');
    const reservisten = alle.filter(a => a.status === 'reservist');
    const aantalL = leiders.length;
    const aantalV = volgers.length;

    return (
      <div className="page">
        <div className="detail-header">
          <button className="back-btn" onClick={sluit}>← Overzicht</button>
          <div className="detail-naam">{les.naam}</div>
          <div className="detail-tijd">Woensdag {les.datum} · {les.tijd}</div>
        </div>

        {aantalL !== aantalV && (
          <div className="banner banner-warning">
            {Math.abs(aantalL - aantalV)} {aantalL < aantalV ? 'leider' : 'volger'}(s) tekort
            {reservisten.length > 0 ? ` · ${reservisten.length} reservist(en) beschikbaar` : ''}
          </div>
        )}

        <div className="stats-row">
          <div className="stat-box">
            <div className="stat-num leider">{aantalL}</div>
            <div className="stat-lbl">Leiders</div>
          </div>
          <div className="stat-box">
            <div className="stat-num volger">{aantalV}</div>
            <div className="stat-lbl">Volgers</div>
          </div>
        </div>

        <div className="sectie-label">Leiders ({aantalL})</div>
        {leiders.map(a => (
          <div key={a.id} className="deelnemer-rij">
            <div className="avatar av-l">{initials(a.naam)}</div>
            <div className="deelnemer-naam">{a.naam}</div>
            <button
              onClick={() => handleVerwijder(a.lidId, a.naam)}
              style={{ fontSize: 11, color: 'var(--grijs)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Afmelden
            </button>
          </div>
        ))}

        <div className="sectie-label">Volgers ({aantalV})</div>
        {volgers.map(a => (
          <div key={a.id} className="deelnemer-rij">
            <div className="avatar av-v">{initials(a.naam)}</div>
            <div className="deelnemer-naam">{a.naam}</div>
            <button
              onClick={() => handleVerwijder(a.lidId, a.naam)}
              style={{ fontSize: 11, color: 'var(--grijs)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Afmelden
            </button>
          </div>
        ))}

        {reservisten.length > 0 && (
          <>
            <div className="sectie-label">Reservisten ({reservisten.length})</div>
            {reservisten.map(a => (
              <div key={a.id} className="deelnemer-rij">
                <div className="avatar av-r">{initials(a.naam)}</div>
                <div className="deelnemer-naam">{a.naam}</div>
                <div className="rol-pill rp-r" style={{ marginRight: 8 }}>wacht</div>
                <button
                  onClick={() => handleVerwijder(a.lidId, a.naam)}
                  style={{ fontSize: 11, color: 'var(--grijs)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Verwijder
                </button>
              </div>
            ))}
          </>
        )}

        <Toast msg={toast} />
      </div>
    );
  }

  // ── Overzichtslijst ──────────────────────────────────────────────────────

  return (
    <div className="page">
      <div className="admin-header">
        <div>
          <div className="logo">Soul <span>Community</span></div>
          <div className="page-sub" style={{ marginTop: 2 }}>Beheerder · Ricardo</div>
        </div>
        <div className="admin-badge">Beheer</div>
      </div>

      <div className="legend">
        <div className="legend-item"><div className="legend-dot" style={{ background: '#378ADD' }} /> Leiders</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#D4537E' }} /> Volgers</div>
      </div>

      <div className="section">
        {loading && (
          <div className="loading">
            <span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" />
          </div>
        )}
        {lessen.map(les => {
          const alle = aanmeldingenMap[les.id] || [];
          const aantalL = alle.filter(a => a.rol === 'leider' && a.status === 'bevestigd').length;
          const aantalV = alle.filter(a => a.rol === 'volger' && a.status === 'bevestigd').length;
          const aantalR = alle.filter(a => a.status === 'reservist').length;
          const totaal = aantalL + aantalV || 1;
          const onbalans = aantalL !== aantalV;

          return (
            <button key={les.id} className="les-card" onClick={() => openLes(les)}>
              <div className="les-tijd">{les.tijd}</div>
              <div className="les-naam">{les.naam}</div>
              <div className="balans-row">
                <div className="balans-bar">
                  <div className="bar-l" style={{ width: `${Math.round(aantalL / totaal * 100)}%` }} />
                  <div className="bar-v" style={{ width: `${Math.round(aantalV / totaal * 100)}%` }} />
                </div>
                <div className="balans-tekst">{aantalL}L · {aantalV}V</div>
              </div>
              {onbalans
                ? <span className="badge badge-tekort">{Math.abs(aantalL - aantalV)} {aantalL < aantalV ? 'leider' : 'volger'}(s) tekort{aantalR > 0 ? ` · ${aantalR} reservist` : ''}</span>
                : <span className="badge badge-ok">In balans</span>
              }
            </button>
          );
        })}
      </div>

      <Toast msg={toast} />
    </div>
  );
}
