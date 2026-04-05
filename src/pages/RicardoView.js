import React, { useEffect, useState, useCallback } from 'react';
import { getLessen, getEvents, getAanmeldingen, afmelden, formatDatum, groeperPerDatum } from '../lib/sheets';

const BEHEER_TOKEN = process.env.REACT_APP_BEHEER_TOKEN;
const SCRIPT_URL = process.env.REACT_APP_SCRIPT_URL;
const RICARDO = '/ricardo.png';

function initials(naam) {
  const p = naam.trim().split(' ');
  return p.length >= 2 ? (p[0][0] + p[p.length-1][0]).toUpperCase() : naam.substring(0,2).toUpperCase();
}

function Toast({ msg }) {
  return <div className={`sc-toast${msg ? ' show' : ''}`}>{msg}</div>;
}

function HeroHeader({ rechts }) {
  return (
    <div style={{ position: 'relative', height: 180, overflow: 'hidden', flexShrink: 0 }}>
      <img src="/hero.png" alt="Soul Community" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%', display: 'block' }}/>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,8,9,0.1) 0%, rgba(10,8,9,0.8) 100%)' }}/>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 20px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '0.08em', color: '#fff', lineHeight: 1, textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>Soul Community</div>
          <div style={{ fontSize: 9, color: 'var(--goud)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 3 }}>Be the best you can be</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={RICARDO} alt="Ricardo" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: '2px solid var(--paars-rand)' }}/>
          <div className="sc-admin-badge">Beheer</div>
        </div>
      </div>
    </div>
  );
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
  const [handmatigNaam, setHandmatigNaam] = useState('');
  const [handmatigRol, setHandmatigRol] = useState('leider');

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
      const params = new URLSearchParams({ action: 'afmelden', lidId, lesId: geselecteerd.id });
      await fetch(SCRIPT_URL + '?' + params.toString(), { redirect: 'follow', mode: 'no-cors' });
      await new Promise(r => setTimeout(r, 900));
      const data = await getAanmeldingen(geselecteerd.id);
      setAanmeldingenMap(prev => ({ ...prev, [geselecteerd.id]: data }));
      showToast(`${naam} afgemeld`);
    } catch { showToast('Er ging iets mis'); }
  };

  const handleReservistenOproep = async (les) => {
    if (!window.confirm(`Reservistenoproep sturen voor ${les.naam}?`)) return;
    const params = new URLSearchParams({ action: 'reservistenOproep', lesId: les.id, lesNaam: les.naam, datum: les.datum, tijd: les.tijd });
    await fetch(SCRIPT_URL + '?' + params.toString(), { redirect: 'follow', mode: 'no-cors' });
    showToast('Oproep verstuurd naar reservisten!');
  };

  const handleHandmatigAanmelden = async (les) => {
    if (!handmatigNaam.trim()) { showToast('Vul een naam in'); return; }
    const params = new URLSearchParams({ action: 'aanmelden', lidId: 'handmatig_' + Date.now(), lesId: les.id, rol: handmatigRol, status: 'bevestigd' });
    await fetch(SCRIPT_URL + '?' + params.toString(), { redirect: 'follow', mode: 'no-cors' });
    await new Promise(r => setTimeout(r, 900));
    const data = await getAanmeldingen(les.id);
    setAanmeldingenMap(prev => ({ ...prev, [les.id]: data }));
    setHandmatigNaam('');
    showToast(`${handmatigNaam} aangemeld als ${handmatigRol}`);
  };

  if (!toegang) return (
    <div className="page">
      <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
        <img src="/hero.png" alt="Soul Community" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }}/>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,8,9,0.1) 0%, rgba(10,8,9,0.8) 100%)' }}/>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: '0.08em', color: '#fff', lineHeight: 1 }}>Soul Community</div>
          <div style={{ fontSize: 9, color: 'var(--goud)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 3 }}>Beheerderspaneel</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 20px 24px' }}>
        <img src={RICARDO} alt="Ricardo" style={{ width: 110, height: 110, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: '3px solid var(--paars-rand)', marginBottom: 16, boxShadow: '0 0 40px rgba(124,63,168,0.4)' }}/>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '0.06em', color: 'var(--wit)', marginBottom: 4 }}>Welkom terug</div>
        <div style={{ fontSize: 13, color: 'var(--wit35)' }}>Soul Community beheer</div>
      </div>
      <div className="sc-login-card">
        <div style={{ fontSize: 13, color: 'var(--wit35)', marginBottom: 16 }}>Voer je wachtwoord in</div>
        <input type="password" className="sc-input" value={wachtwoord}
          onChange={e => setWachtwoord(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          placeholder="Wachtwoord"/>
        <button className="sc-btn sc-btn-aanmeld" onClick={login}>Inloggen</button>
      </div>
    </div>
  );

  // Event detail
  if (geselecteerd && geselecteerd.type === 'event') {
    const ev = geselecteerd;
    return (
      <div className="page">
        <HeroHeader/>
        <button className="sc-back" onClick={() => setGeselecteerd(null)}>← Overzicht</button>
        {ev.fotoUrl && <img src={ev.fotoUrl} alt={ev.naam} style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}/>}
        <div style={{ padding: '16px 20px 4px' }}>
          <div className="sc-event-tag">Event</div>
        </div>
        <div className="sc-detail-naam">{ev.naam}</div>
        <div className="sc-detail-tijd">{formatDatum(ev.datum)} · {ev.tijd}</div>
        <div className="sc-stats">
          <div className="sc-stat" style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 11, color: 'var(--wit35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Locatie</div>
            <div style={{ fontSize: 14, color: 'var(--wit80)' }}>{ev.locatie || '—'}</div>
          </div>
          <div className="sc-stat" style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 11, color: 'var(--wit35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Prijs</div>
            <div style={{ fontSize: 14, color: 'var(--wit80)' }}>{ev.prijs || 'Gratis'}</div>
          </div>
        </div>
        {ev.beschrijving && (
          <div style={{ margin: '0 20px 16px', padding: '14px', background: 'var(--zwart3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--wit08)', fontSize: 14, color: 'var(--wit60)', lineHeight: 1.6, position: 'relative', zIndex: 1 }}>
            {ev.beschrijving}
          </div>
        )}
        <Toast msg={toast}/>
      </div>
    );
  }

  // Les detail
  if (geselecteerd && geselecteerd.type === 'les') {
    const les = geselecteerd;
    const alle = aanmeldingenMap[les.id] || [];
    const leiders = alle.filter(a => a.rol==='leider' && a.status==='bevestigd');
    const volgers = alle.filter(a => a.rol==='volger' && a.status==='bevestigd');
    const reservisten = alle.filter(a => a.status==='reservist');
    const aantalL = leiders.length;
    const aantalV = volgers.length;
    const onbalans = aantalL !== aantalV;

    return (
      <div className="page">
        <HeroHeader/>
        <button className="sc-back" onClick={() => setGeselecteerd(null)}>← Overzicht</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px 4px', position: 'relative', zIndex: 1 }}>
          <img src={RICARDO} alt="Ricardo" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: '2px solid var(--paars-rand)', flexShrink: 0 }}/>
          <div>
            <div className="sc-detail-naam" style={{ padding: 0 }}>{les.naam}</div>
            <div className="sc-detail-tijd" style={{ padding: 0 }}>{formatDatum(les.datum)} · {les.tijd}</div>
          </div>
        </div>

        {onbalans && (
          <div className="sc-banner sc-banner-warning">
            {Math.abs(aantalL-aantalV)} {aantalL<aantalV?'leider':'volger'}(s) tekort
            {reservisten.length > 0 ? ` · ${reservisten.length} reservist(en) beschikbaar` : ''}
          </div>
        )}

        <div className="sc-stats">
          <div className="sc-stat"><div className="sc-stat-num leider">{aantalL}</div><div className="sc-stat-lbl">Leiders</div></div>
          <div className="sc-stat"><div className="sc-stat-num volger">{aantalV}</div><div className="sc-stat-lbl">Volgers</div></div>
        </div>

        {onbalans && (
          <div className="sc-btn-wrap">
            <button className="sc-btn sc-btn-aanmeld" onClick={() => handleReservistenOproep(les)}>
              Stuur reservistenoproep
            </button>
          </div>
        )}

        <div style={{ margin: '0 20px 16px', padding: 14, background: 'var(--zwart3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--wit08)', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--wit35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Handmatig aanmelden</div>
          <input className="sc-input" style={{ marginBottom: 8 }} placeholder="Naam lid" value={handmatigNaam} onChange={e => setHandmatigNaam(e.target.value)}/>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button onClick={() => setHandmatigRol('leider')} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid var(--paars-rand)', background: handmatigRol==='leider' ? 'var(--blauw)' : 'var(--zwart2)', color: 'var(--wit)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Leider</button>
            <button onClick={() => setHandmatigRol('volger')} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid var(--paars-rand)', background: handmatigRol==='volger' ? 'var(--paars)' : 'var(--zwart2)', color: 'var(--wit)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Volger</button>
          </div>
          <button style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--blauw)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-body)', cursor: 'pointer' }} onClick={() => handleHandmatigAanmelden(les)}>Aanmelden</button>
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

  // Overzicht
  const groepen = groeperPerDatum(tab==='lessen' ? lessen : [], tab==='events' ? events : []);
  const datums = Object.keys(groepen).sort();

  return (
    <div className="page">
      <HeroHeader/>

      <div className="sc-bottom-nav">
        <button className={`sc-nav-btn${tab==='lessen'?' active':''}`} onClick={() => setTab('lessen')}>Lessen</button>
        <button className={`sc-nav-btn${tab==='events'?' active':''}`} onClick={() => setTab('events')}>Events</button>
      </div>

      {loading && <div className="sc-loading"><span className="sc-dot-anim"/><span className="sc-dot-anim"/><span className="sc-dot-anim"/></div>}

      {datums.map((datum, i) => {
        const itemsOpDag = groepen[datum].filter(item => item.type === 'les');
        const totaalL = itemsOpDag.reduce((sum, les) => sum + (aanmeldingenMap[les.id] || []).filter(a => a.rol==='leider' && a.status==='bevestigd').length, 0);
        const totaalV = itemsOpDag.reduce((sum, les) => sum + (aanmeldingenMap[les.id] || []).filter(a => a.rol==='volger' && a.status==='bevestigd').length, 0);

        return (
          <div key={datum}>
            <div className={`sc-datum${i===0?' eerste':''}`} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', paddingRight: 20 }}>
              <span>{formatDatum(datum)}</span>
              {tab === 'lessen' && <span style={{ fontSize: 14, color: 'var(--wit35)', fontFamily: 'var(--font-body)', fontWeight: 400 }}>{totaalL}L · {totaalV}V</span>}
            </div>
            {groepen[datum].map(item => {
              if (item.type === 'les') {
                const alle = aanmeldingenMap[item.id] || [];
                const aantalL = alle.filter(a => a.rol==='leider' && a.status==='bevestigd').length;
                const aantalV = alle.filter(a => a.rol==='volger' && a.status==='bevestigd').length;
                const aantalR = alle.filter(a => a.status==='reservist').length;
                const totaal = aantalL + aantalV || 1;
                const onbalans = aantalL !== aantalV;
                return (
                  <button key={item.id} className={`sc-les-card${onbalans?' tekort':''}`} onClick={() => setGeselecteerd({ ...item, type: 'les' })} style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div>
                        <div className="sc-les-tijd">{item.tijd}</div>
                        <div className="sc-les-naam" style={{ fontSize: 20, marginBottom: 0 }}>{item.naam}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 20, fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
                          <span style={{ color: 'var(--blauw)' }}>{aantalL}L</span>
                          <span style={{ color: 'var(--wit35)', margin: '0 4px' }}>·</span>
                          <span style={{ color: 'var(--paars-licht)' }}>{aantalV}V</span>
                        </div>
                        {aantalR > 0 && <div style={{ fontSize: 11, color: 'var(--goud)' }}>{aantalR} reservist</div>}
                      </div>
                    </div>
                    <div className="sc-balans-bar">
                      <div className="bar-l" style={{ width: `${Math.round(aantalL/totaal*100)}%` }}/>
                      <div className="bar-v" style={{ width: `${Math.round(aantalV/totaal*100)}%` }}/>
                    </div>
                    {onbalans && <span className="sc-badge sc-b-tekort" style={{ marginTop: 8 }}>{Math.abs(aantalL-aantalV)} {aantalL<aantalV?'leider':'volger'}(s) tekort{aantalR>0?` · ${aantalR} reservist`:''}</span>}
                  </button>
                );
              }
              if (item.type === 'event') {
                return (
                  <button key={item.id} className="sc-event-card" onClick={() => setGeselecteerd({ ...item, type: 'event' })}>
                    {item.fotoUrl && <img src={item.fotoUrl} alt={item.naam} className="sc-event-foto"/>}
                    <div className="sc-event-body">
                      <div className="sc-event-tag">Event</div>
                      <div className="sc-event-naam">{item.naam}</div>
                      <div className="sc-event-sub">{item.tijd} · {item.locatie}</div>
                    </div>
                  </button>
                );
              }
              return null;
            })}
          </div>
        );
      })}
      <Toast msg={toast}/>
    </div>
  );
}
