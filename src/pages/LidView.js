import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  getLidByToken, getLessen, getEvents, getAanmeldingen,
  getMijnAanmeldingen, aanmelden, afmelden, isGesloten,
  groeperPerDatum, formatDatum
} from '../lib/sheets';

const LOGO = '/logo.png';
const RICARDO = '/ricardo.png';
const WHATSAPP = 'https://wa.me/31624185031';

function initials(naam) {
  const p = naam.trim().split(' ');
  return p.length >= 2 ? (p[0][0] + p[p.length-1][0]).toUpperCase() : naam.substring(0,2).toUpperCase();
}

function Toast({ msg }) {
  return <div className={`sc-toast${msg ? ' show' : ''}`}>{msg}</div>;
}

function Loading() {
  return (
    <div className="sc-loading">
      <div style={{ marginBottom: 16 }}>
        <span className="sc-dot-anim"/><span className="sc-dot-anim"/><span className="sc-dot-anim"/>
      </div>
      Laden
    </div>
  );
}

function BottomNav({ tab, setTab }) {
  return (
    <div className="sc-bottom-nav">
      <button className={`sc-nav-btn${tab==='lessen'?' active':''}`} onClick={() => setTab('lessen')}>Lessen</button>
      <button className={`sc-nav-btn${tab==='events'?' active':''}`} onClick={() => setTab('events')}>Events</button>
      <button className={`sc-nav-btn${tab==='profiel'?' active':''}`} onClick={() => setTab('profiel')}>Profiel</button>
    </div>
  );
}

function ProfielTab({ lid, mijnAanmeldingen, lessen }) {
  const aantalLessen = mijnAanmeldingen.filter(a => a.status === 'bevestigd').length;
  const aantalReservist = mijnAanmeldingen.filter(a => a.status === 'reservist').length;

  const badges = [
    { id: 1, icon: '🎯', naam: 'Eerste les', desc: 'Aangemeld voor de eerste les', behaald: aantalLessen >= 1 },
    { id: 2, icon: '🔥', naam: '5 lessen', desc: '5 lessen bijgewoond', behaald: aantalLessen >= 5 },
    { id: 3, icon: '⭐', naam: '10 lessen', desc: '10 lessen bijgewoond', behaald: aantalLessen >= 10 },
    { id: 4, icon: '🦸', naam: 'Reservist', desc: 'Ooit ingevallen als reservist', behaald: aantalReservist >= 1 },
  ];

  return (
    <div>
      <div className="sc-profiel-header">
        <div className="sc-profiel-avatar">{initials(lid.naam)}</div>
        <div className="sc-profiel-naam">{lid.naam}</div>
        <div className="sc-profiel-rol">{lid.rol}{lid.isReservist ? ' · reservist' : ''}</div>
      </div>

      <div className="sc-stat-kaart">
        <div className="sc-stat-kaart-num">{aantalLessen}</div>
        <div className="sc-stat-kaart-info">
          <div className="sc-stat-kaart-label">Lessen bijgewoond</div>
          <div className="sc-stat-kaart-sub">Totaal aanmeldingen</div>
        </div>
      </div>

      {aantalReservist > 0 && (
        <div className="sc-stat-kaart">
          <div className="sc-stat-kaart-num">{aantalReservist}</div>
          <div className="sc-stat-kaart-info">
            <div className="sc-stat-kaart-label">Keer ingevallen</div>
            <div className="sc-stat-kaart-sub">Als reservist</div>
          </div>
        </div>
      )}

      <div className="sc-sectie" style={{ borderTop: 'none', paddingTop: 20 }}>Badges</div>
      <div className="sc-badges-grid">
        {badges.map(b => (
          <div key={b.id} className={`sc-badge-card${b.behaald ? ' behaald' : ''}`}>
            <div className="sc-badge-icon" style={{ opacity: b.behaald ? 1 : 0.25 }}>{b.icon}</div>
            <div className={`sc-badge-naam${b.behaald ? ' behaald' : ''}`}>{b.naam}</div>
            <div className="sc-badge-desc">{b.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ margin: '8px 16px 0', padding: '14px 16px', background: 'var(--zwart3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--wit08)', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--wit35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Contact</div>
        <a href={`${WHATSAPP}?text=Hoi Ricardo!`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src={RICARDO} alt="Ricardo" className="sc-ricardo-avatar"/>
          <div>
            <div style={{ fontSize: 14, color: 'var(--wit80)', fontWeight: 500 }}>Ricardo</div>
            <div style={{ fontSize: 12, color: 'var(--paars-licht)' }}>Stuur een WhatsApp bericht</div>
          </div>
        </a>
      </div>
    </div>
  );
}

export default function LidView() {
  const { token } = useParams();
  const [lid, setLid] = useState(null);
  const [lessen, setLessen] = useState([]);
  const [events, setEvents] = useState([]);
  const [mijnAanmeldingen, setMijnAanmeldingen] = useState([]);
  const [aanmeldingenPerLes, setAanmeldingenPerLes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('lessen');
  const [geselecteerd, setGeselecteerd] = useState(null);
  const [bezig, setBezig] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  const laadData = useCallback(async () => {
    try {
      const l = await getLidByToken(token);
      if (!l) { setError('Ongeldige link. Neem contact op met Ricardo.'); setLoading(false); return; }
      setLid(l);
      const [lessenData, eventsData, mijnData] = await Promise.all([
        getLessen(), getEvents(), getMijnAanmeldingen(l.id)
      ]);
      setLessen(lessenData);
      setEvents(eventsData);
      setMijnAanmeldingen(mijnData);
      const aanmMap = {};
      await Promise.all(lessenData.map(async les => {
        aanmMap[les.id] = await getAanmeldingen(les.id);
      }));
      setAanmeldingenPerLes(aanmMap);
    } catch { setError('Kon data niet laden. Probeer opnieuw.'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { laadData(); }, [laadData]);

  const openItem = async (item) => {
    setGeselecteerd(item);
    if (item.type === 'les') {
      const data = await getAanmeldingen(item.id);
      setAanmeldingenPerLes(prev => ({ ...prev, [item.id]: data }));
    }
  };

  const sluit = () => setGeselecteerd(null);

  const handleAanmelden = async (rol, status = 'bevestigd') => {
    if (bezig) return;
    const mijn = mijnAanmeldingen.find(a => a.lesId === geselecteerd.id);
    if (mijn) { showToast('Je bent al ingeschreven voor deze les'); return; }
    setBezig(true);
    try {
      await aanmelden(lid.id, geselecteerd.id, rol, status);
      await new Promise(r => setTimeout(r, 900));
      const [data, mijn2] = await Promise.all([getAanmeldingen(geselecteerd.id), getMijnAanmeldingen(lid.id)]);
      setAanmeldingenPerLes(prev => ({ ...prev, [geselecteerd.id]: data }));
      setMijnAanmeldingen(mijn2);
      showToast(status === 'reservist' ? 'Ingeschreven als reservist' : `Aangemeld als ${rol}`);
    } catch { showToast('Er ging iets mis. Probeer opnieuw.'); }
    finally { setBezig(false); }
  };

  const handleAfmelden = async () => {
    if (bezig) return;
    setBezig(true);
    try {
      await afmelden(lid.id, geselecteerd.id);
      await new Promise(r => setTimeout(r, 900));
      const [data, mijn] = await Promise.all([getAanmeldingen(geselecteerd.id), getMijnAanmeldingen(lid.id)]);
      setAanmeldingenPerLes(prev => ({ ...prev, [geselecteerd.id]: data }));
      setMijnAanmeldingen(mijn);
      showToast('Je bent afgemeld');
    } catch { showToast('Er ging iets mis. Probeer opnieuw.'); }
    finally { setBezig(false); }
  };

  if (loading) return <div className="page"><Loading/></div>;
  if (error) return (
    <div className="page">
      <div className="sc-header">
        <div className="sc-logo">
          <img className="sc-logo-img" src={LOGO} alt="Soul Community" onError={e => e.target.style.display='none'}/>
          <div className="sc-logo-tekst"><div className="sc-logo-naam">Soul Community</div></div>
        </div>
      </div>
      <div className="sc-error">{error}</div>
    </div>
  );

  if (geselecteerd && geselecteerd.type === 'les') {
    const les = geselecteerd;
    const gesloten = isGesloten(les.datum);
    const alle = aanmeldingenPerLes[les.id] || [];
    const leiders = alle.filter(a => a.rol==='leider' && a.status==='bevestigd');
    const volgers = alle.filter(a => a.rol==='volger' && a.status==='bevestigd');
    const reservisten = alle.filter(a => a.status==='reservist');
    const aantalL = leiders.length;
    const aantalV = volgers.length;
    const tekort = aantalL < aantalV ? 'leider' : aantalL > aantalV ? 'volger' : null;
    const tekortAantal = Math.abs(aantalL - aantalV);
    const mijn = mijnAanmeldingen.find(a => a.lesId === les.id);
    const ingeschreven = !!mijn && mijn.status === 'bevestigd';
    const alsReservist = !!mijn && mijn.status === 'reservist';
    const kanReservist = lid.isReservist && tekort && tekort !== lid.rol && !ingeschreven && gesloten;
    const reservistVol = reservisten.filter(r => r.rol === tekort).length >= tekortAantal;
    const totaal = aantalL + aantalV || 1;

    return (
      <div className="page">
        <div className="sc-header">
          <div className="sc-logo">
            <img className="sc-logo-img" src={LOGO} alt="Soul Community" onError={e => e.target.style.display='none'}/>
            <div className="sc-logo-tekst"><div className="sc-logo-naam">Soul Community</div></div>
          </div>
        </div>
        <button className="sc-back" onClick={sluit}>← Terug</button>
        <div className="sc-detail-naam">{les.naam}</div>
        <div className="sc-detail-tijd">{formatDatum(les.datum)} · {les.tijd}</div>

        {tekort && !gesloten && <div className="sc-banner sc-banner-warning">{tekortAantal} {tekort}(s) tekort — reservisten kunnen invallen</div>}
        {gesloten && <div className="sc-banner sc-banner-gesloten">Aanmeldingen gesloten om 17:00.</div>}

        <div className="sc-stats">
          <div className="sc-stat"><div className="sc-stat-num leider">{aantalL}</div><div className="sc-stat-lbl">Leiders</div></div>
          <div className="sc-stat"><div className="sc-stat-num volger">{aantalV}</div><div className="sc-stat-lbl">Volgers</div></div>
        </div>

        <div className="sc-btn-wrap">
          {!gesloten && <>
            {ingeschreven ? (
              <button className="sc-btn sc-btn-afmeld" onClick={handleAfmelden} disabled={bezig}>Afmelden</button>
            ) : alsReservist ? (
              <button className="sc-btn sc-btn-reservist-af" onClick={handleAfmelden} disabled={bezig}>Afmelden als reservist</button>
            ) : (
              <button className="sc-btn sc-btn-aanmeld" onClick={() => handleAanmelden(lid.rol)} disabled={bezig}>Aanmelden als {lid.rol}</button>
            )}
            {kanReservist && !alsReservist && !reservistVol && (
              <button className="sc-btn sc-btn-reservist" onClick={() => handleAanmelden(tekort, 'reservist')} disabled={bezig}>Aanmelden als reservist ({tekort})</button>
            )}
          </>}
          <a href={`${WHATSAPP}?text=Hoi Ricardo, ik wil me ${gesloten ? 'afmelden' : 'iets vragen'} voor ${les.naam} op ${formatDatum(les.datum)}`}
            className="sc-btn sc-btn-contact" style={{ textDecoration: 'none' }}>
            <img src={RICARDO} alt="Ricardo" className="sc-ricardo-avatar"/>
            Contact Ricardo
          </a>
        </div>

        <div className="sc-sectie">Leiders ({aantalL})</div>
        {leiders.map(a => (
          <div key={a.id} className="sc-deelnemer">
            <div className="sc-avatar av-l">{initials(a.naam)}</div>
            <div className={`sc-deelnemer-naam${a.lidId===lid.id?' jij':''}`}>{a.naam}{a.lidId===lid.id?' (jij)':''}</div>
            <div className="sc-rol-pill rp-l">Leider</div>
          </div>
        ))}
        <div className="sc-sectie">Volgers ({aantalV})</div>
        {volgers.map(a => (
          <div key={a.id} className="sc-deelnemer">
            <div className="sc-avatar av-v">{initials(a.naam)}</div>
            <div className={`sc-deelnemer-naam${a.lidId===lid.id?' jij':''}`}>{a.naam}{a.lidId===lid.id?' (jij)':''}</div>
            <div className="sc-rol-pill rp-v">Volger</div>
          </div>
        ))}
        {reservisten.length > 0 && <>
          <div className="sc-sectie">Reservisten ({reservisten.length})</div>
          {reservisten.map(a => (
            <div key={a.id} className="sc-deelnemer">
              <div className="sc-avatar av-r">{initials(a.naam)}</div>
              <div className={`sc-deelnemer-naam${a.lidId===lid.id?' jij':''}`}>{a.naam}{a.lidId===lid.id?' (jij)':''}</div>
              <div className="sc-rol-pill rp-r">Reservist</div>
            </div>
          ))}
        </>}
        <Toast msg={toast}/>
      </div>
    );
  }

  if (geselecteerd && geselecteerd.type === 'event') {
    const ev = geselecteerd;
    return (
      <div className="page">
        <div className="sc-header">
          <div className="sc-logo">
            <img className="sc-logo-img" src={LOGO} alt="Soul Community" onError={e => e.target.style.display='none'}/>
            <div className="sc-logo-tekst"><div className="sc-logo-naam">Soul Community</div></div>
          </div>
        </div>
        <button className="sc-back" onClick={sluit}>← Terug</button>
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
        <div className="sc-btn-wrap">
          <a href={`${WHATSAPP}?text=Hoi Ricardo, ik wil me aanmelden voor ${ev.naam} op ${formatDatum(ev.datum)}!`}
            className="sc-btn sc-btn-aanmeld" style={{ textDecoration: 'none' }}>
            <img src={RICARDO} alt="Ricardo" className="sc-ricardo-avatar"/>
            Aanmelden via WhatsApp
          </a>
        </div>
        <Toast msg={toast}/>
      </div>
    );
  }

  const itemsVoorTab = tab === 'lessen' ? lessen : tab === 'events' ? events : [];
  const eventsVoorLessen = tab === 'lessen' ? events : [];
  const groepen = groeperPerDatum(tab === 'lessen' ? lessen : [], tab === 'lessen' ? eventsVoorLessen : tab === 'events' ? events : []);
  const datums = Object.keys(groepen).sort();

  return (
    <div className="page">
      <div style={{
        position: 'relative',
        height: 220,
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        <img src="/hero.png" alt="Soul Community" style={{
          width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%',
          display: 'block',
        }}/>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(10,8,9,0.3) 0%, rgba(10,8,9,0.5) 50%, rgba(10,8,9,0.95) 100%)',
        }}/>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '16px 20px',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src={LOGO} alt="Soul Community" style={{ width: 56, height: 56, objectFit: 'contain', filter: 'invert(1)' }} onError={e => e.target.style.display='none'}/>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: '0.08em', color: '#fff', lineHeight: 1 }}>Soul Community</div>
              <div style={{ fontSize: 9, color: 'var(--goud)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 3 }}>Be the best you can be</div>
            </div>
          </div>
          <div className="sc-lid-pill">{lid.naam.split(' ')[0]}</div>
        </div>
      </div>

      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(10,8,9,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--wit08)' }}>
        <div className="sc-bottom-nav" style={{ position: 'relative', transform: 'none', left: 'auto', bottom: 'auto', maxWidth: 'none', padding: '8px 16px 8px' }}>
          <button className={`sc-nav-btn${tab==='lessen'?' active':''}`} onClick={() => setTab('lessen')}>Lessen</button>
          <button className={`sc-nav-btn${tab==='events'?' active':''}`} onClick={() => setTab('events')}>Events</button>
          <button className={`sc-nav-btn${tab==='profiel'?' active':''}`} onClick={() => setTab('profiel')}>Profiel</button>
        </div>
      </div>

      {tab === 'profiel' ? (
        <ProfielTab lid={lid} mijnAanmeldingen={mijnAanmeldingen} lessen={lessen}/>
      ) : (
        <>
          <div className="sc-greeting">Hallo {lid.naam.split(' ')[0]} · {lid.rol}</div>
          {tab === 'lessen' && (
            <div className="sc-legend">
              <div className="sc-legend-item"><div className="sc-dot" style={{ background: 'var(--blauw)' }}/> Leiders</div>
              <div className="sc-legend-item"><div className="sc-dot" style={{ background: 'var(--paars-licht)' }}/> Volgers</div>
            </div>
          )}
          {datums.length === 0 && (
            <div style={{ padding: '40px 20px', color: 'var(--wit35)', fontSize: 14 }}>
              {tab === 'lessen' ? 'Geen lessen gepland.' : 'Geen events gepland.'}
            </div>
          )}
          {datums.map((datum, i) => (
            <div key={datum}>
              <div className={`sc-datum${i===0?' eerste':''}`}>{formatDatum(datum)}</div>
              {groepen[datum].map(item => {
                if (item.type === 'les') {
                  const alle = aanmeldingenPerLes[item.id] || [];
                  const aantalL = alle.filter(a => a.rol==='leider' && a.status==='bevestigd').length;
                  const aantalV = alle.filter(a => a.rol==='volger' && a.status==='bevestigd').length;
                  const totaal = aantalL + aantalV || 1;
                  const mijn = mijnAanmeldingen.find(a => a.lesId === item.id);
                  const ingeschreven = !!mijn && mijn.status === 'bevestigd';
                  const alsReservist = !!mijn && mijn.status === 'reservist';
                  const tekort = aantalL < aantalV ? 'leider' : aantalL > aantalV ? 'volger' : null;
                  return (
                    <button key={item.id} className={`sc-les-card${ingeschreven?' aangemeld':tekort?' tekort':''}`} onClick={() => openItem(item)}>
                      <div className="sc-les-tijd">{item.tijd}</div>
                      <div className="sc-les-naam">{item.naam}</div>
                      <div className="sc-balans-row">
                        <div className="sc-balans-bar">
                          <div className="bar-l" style={{ width: `${Math.round(aantalL/totaal*100)}%` }}/>
                          <div className="bar-v" style={{ width: `${Math.round(aantalV/totaal*100)}%` }}/>
                        </div>
                        <div className="sc-balans-tekst">{aantalL}L · {aantalV}V</div>
                      </div>
                      {ingeschreven && <span className="sc-badge sc-b-aangemeld">Aangemeld als {lid.rol}</span>}
                      {alsReservist && <span className="sc-badge sc-b-reservist">Reservist</span>}
                      {!ingeschreven && !alsReservist && tekort && <span className="sc-badge sc-b-tekort">{Math.abs(aantalL-aantalV)} {tekort}(s) tekort</span>}
                      {!ingeschreven && !alsReservist && !tekort && <span className="sc-badge sc-b-nee">Niet aangemeld</span>}
                    </button>
                  );
                }
                if (item.type === 'event') {
                  return (
                    <button key={item.id} className="sc-event-card" onClick={() => openItem(item)}>
                      {item.fotoUrl && <img src={item.fotoUrl} alt={item.naam} className="sc-event-foto"/>}
                      <div className="sc-event-body">
                        <div className="sc-event-tag">Event</div>
                        <div className="sc-event-naam">{item.naam}</div>
                        <div className="sc-event-sub">{item.tijd} · {item.locatie} · {item.prijs || 'Gratis'}</div>
                      </div>
                    </button>
                  );
                }
                return null;
              })}
            </div>
          ))}
        </>
      )}

      <Toast msg={toast}/>
    </div>
  );
}
