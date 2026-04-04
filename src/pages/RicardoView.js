import React, { useEffect, useState, useCallback } from 'react';
import { getLessen, getEvents, getAanmeldingen, afmelden, formatDatum, groeperPerDatum } from '../lib/sheets';

const BEHEER_TOKEN = process.env.REACT_APP_BEHEER_TOKEN;
const LOGO = '/logo.png';

function initials(naam) {
  const p = naam.trim().split(' ');
  return p.length >= 2 ? (p[0][0] + p[p.length-1][0]).toUpperCase() : naam.substring(0,2).toUpperCase();
}

function Toast({ msg }) {
  return <div className={`sc-toast${msg ? ' show' : ''}`}>{msg}</div>;
}

export default function RicardoView() {
  const [toegang, setToegang] = useState(false);
  const [wachtwoord, setWachtwoord] = useState('');
  const [lessen, setLessen] = useState([]);
  const [events, setEvents] = useState([]);
  const [aanmeldingenMap, setAanmeldingenMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [geselecteerd, setGeselecteerd] = useState(null);
  const [tab, setTab] = useState('lessen');
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  const laadData = useCallback(async () => {
    setLoading(true);
    try {
      const [lessenData, eventsData] = await Promise.all([getLessen(), getEvents()]);
      setLessen(lessenData);
      setEvents(eventsData);
      const entries = await Promise.all(
        lessenData.map(async les => [les.id, await getAanmeldingen(les.id)])
      );
      setAanmeldingenMap(Object.fromEntries(entries));
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (toegang) laadData(); }, [toegang, laadData]);

  const login = () => {
    if (wachtwoord === BEHEER_TOKEN) setToegang(true);
    else alert('Onjuist wachtwoord');
  };

  const handleVerwijder = async (lidId, naam) => {
    if (!window.confirm(`${naam} afmelden?`)) return;
    try {
      await afmelden(lidId, geselecteerd.id);
      await new Promise(r => setTimeout(r, 800));
      const data = await getAanmeldingen(geselecteerd.id);
      setAanmeldingenMap(prev => ({ ...prev, [geselecteerd.id]: data }));
      showToast(`${naam} afgemeld`);
    } catch { showToast('Er ging iets mis'); }
  };

  if (!toegang) return (
    <div className="page">
      <div className="sc-header">
        <div className="sc-logo">
          <img className="sc-logo-img" src={LOGO} alt="Soul Community" onError={e => e.target.style.display='none'}/>
          <div className="sc-logo-tekst">
            <div className="sc-logo-naam">Soul Community</div>
            <div className="sc-logo-sub">Beheer</div>
          </div>
        </div>
      </div>
      <div className="sc-login-card">
        <div style={{ fontSize: 13, color: 'var(--wit35)', marginBottom: 16 }}>Beheerderstoegang</div>
        <input type="password" className="sc-input" value={wachtwoord}
          onChange={e => setWachtwoord(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          placeholder="Wachtwoord"/>
        <button className="sc-btn sc-btn-aanmeld" onClick={login}>Inloggen</button>
      </div>
    </div>
  );

  if (geselecteerd && geselecteerd.type === 'les') {
    const les = geselecteerd;
    const alle = aanmeldingenMap[les.id] || [];
    const leiders = alle.filter(a => a.rol==='leider' && a.status==='bevestigd');
    const volgers = alle.filter(a => a.rol==='volger' && a.status==='bevestigd');
    const reservisten = alle.filter(a => a.status==='reservist');
    const aantalL = leiders.length;
    const aantalV = volgers.length;

    return (
      <div className="page">
        <button className="sc-back" onClick={() => setGeselecteerd(null)}>← Overzicht</button>
        <div className="sc-detail-naam">{les.naam}</div>
        <div className="sc-detail-tijd">{formatDatum(les.datum)} · {les.tijd}</div>
        {aantalL !== aantalV && (
          <div className="sc-banner sc-banner-warning">
            {Math.abs(aantalL-aantalV)} {aantalL<aantalV?'leider':'volger'}(s) tekort
            {reservisten.length > 0 ? ` · ${reservisten.length} reservist(en) beschikbaar` : ''}
          </div>
        )}
        <div className="sc-stats">
          <div className="sc-stat"><div className="sc-stat-num leider">{aantalL}</div><div className="sc-stat-lbl">Leiders</div></div>
          <div className="sc-stat"><div className="sc-stat-num volger">{aantalV}</div><div className="sc-stat-lbl">Volgers</div></div>
        </div>
        <div className="sc-sectie">Leiders ({aantalL})</div>
        {leiders.map(a => (
          <div key={a.id} className="sc-deelnemer">
            <div className="sc-avatar av-l">{initials(a.naam)}</div>
            <div className="sc-deelnemer-naam">{a.naam}</div>
            <button className="sc-remove-btn" onClick={() => handleVerwijder(a.lidId, a.naam)}>Afmelden</button>
          </div>
        ))}
        <div className="sc-sectie">Volgers ({aantalV})</div>
        {volgers.map(a => (
          <div key={a.id} className="sc-deelnemer">
            <div className="sc-avatar av-v">{initials(a.naam)}</div>
            <div className="sc-deelnemer-naam">{a.naam}</div>
            <button className="sc-remove-btn" onClick={() => handleVerwijder(a.lidId, a.naam)}>Afmelden</button>
          </div>
        ))}
        {reservisten.length > 0 && <>
          <div className="sc-sectie">Reservisten ({reservisten.length})</div>
          {reservisten.map(a => (
            <div key={a.id} className="sc-deelnemer">
              <div className="sc-avatar av-r">{initials(a.naam)}</div>
              <div className="sc-deelnemer-naam">{a.naam}</div>
              <div className="sc-rol-pill rp-r" style={{ marginRight: 8 }}>Wacht</div>
              <button className="sc-remove-btn" onClick={() => handleVerwijder(a.lidId, a.naam)}>Verwijder</button>
            </div>
          ))}
        </>}
        <Toast msg={toast}/>
      </div>
    );
  }

  const groepen = groeperPerDatum(tab==='lessen' ? lessen : [], tab==='events' ? events : []);
  const datums = Object.keys(groepen).sort();

  return (
    <div className="page">
      <div className="sc-header">
        <div className="sc-logo">
          <img className="sc-logo-img" src={LOGO} alt="Soul Community" onError={e => e.target.style.display='none'}/>
          <div className="sc-logo-tekst">
            <div className="sc-logo-naam">Soul Community</div>
            <div className="sc-logo-sub">Be the best you can be</div>
          </div>
        </div>
        <div className="sc-admin-badge">Beheer</div>
      </div>

      <div className="sc-bottom-nav">
        <button className={`sc-nav-btn${tab==='lessen'?' active':''}`} onClick={() => setTab('lessen')}>Lessen</button>
        <button className={`sc-nav-btn${tab==='events'?' active':''}`} onClick={() => setTab('events')}>Events</button>
      </div>

      {loading && <div className="sc-loading"><span className="sc-dot-anim"/><span className="sc-dot-anim"/><span className="sc-dot-anim"/></div>}

      {datums.map((datum, i) => (
        <div key={datum}>
          <div className={`sc-datum${i===0?' eerste':''}`}>{formatDatum(datum)}</div>
          {groepen[datum].map(item => {
            if (item.type === 'les') {
              const alle = aanmeldingenMap[item.id] || [];
              const aantalL = alle.filter(a => a.rol==='leider' && a.status==='bevestigd').length;
              const aantalV = alle.filter(a => a.rol==='volger' && a.status==='bevestigd').length;
              const aantalR = alle.filter(a => a.status==='reservist').length;
              const totaal = aantalL + aantalV || 1;
              const onbalans = aantalL !== aantalV;
              return (
                <button key={item.id} className={`sc-les-card${onbalans?' tekort':''}`} onClick={() => setGeselecteerd({ ...item, type: 'les' })}>
                  <div className="sc-les-tijd">{item.tijd}</div>
                  <div className="sc-les-naam">{item.naam}</div>
                  <div className="sc-balans-row">
                    <div className="sc-balans-bar">
                      <div className="bar-l" style={{ width: `${Math.round(aantalL/totaal*100)}%` }}/>
                      <div className="bar-v" style={{ width: `${Math.round(aantalV/totaal*100)}%` }}/>
                    </div>
                    <div className="sc-balans-tekst">{aantalL}L · {aantalV}V</div>
                  </div>
                  {onbalans
                    ? <span className="sc-badge sc-b-tekort">{Math.abs(aantalL-aantalV)} {aantalL<aantalV?'leider':'volger'}(s) tekort{aantalR>0?` · ${aantalR} reservist`:''}</span>
                    : <span className="sc-badge sc-b-ok">In balans</span>}
                </button>
              );
            }
            if (item.type === 'event') {
              return (
                <div key={item.id} className="sc-event-card">
                  <div className="sc-event-tag">Event</div>
                  <div className="sc-event-naam">{item.naam}</div>
                  <div className="sc-event-sub">{item.tijd} · {item.locatie}</div>
                </div>
              );
            }
            return null;
          })}
        </div>
      ))}
      <Toast msg={toast}/>
    </div>
  );
}
