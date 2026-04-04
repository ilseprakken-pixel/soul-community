import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  getLidByToken, getLessen, getAanmeldingen,
  getMijnAanmeldingen, aanmelden, afmelden, isGesloten
} from '../lib/sheets';

function initials(naam) {
  const parts = naam.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return naam.substring(0, 2).toUpperCase();
}

function Toast({ msg }) {
  return <div className={`toast ${msg ? 'show' : ''}`}>{msg}</div>;
}

export default function LidView() {
  const { token } = useParams();
  const [lid, setLid] = useState(null);
  const [lessen, setLessen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [geselecteerdeLes, setGeselecteerdeLes] = useState(null);
  const [aanmeldingen, setAanmeldingen] = useState([]);
  const [mijnAanmeldingen, setMijnAanmeldingen] = useState([]);
  const [bezig, setBezig] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const laadData = useCallback(async () => {
    try {
      const l = await getLidByToken(token);
      if (!l) { setError('Ongeldige link. Neem contact op met Ricardo.'); setLoading(false); return; }
      setLid(l);
      const [lessenData, mijnData] = await Promise.all([
        getLessen(),
        getMijnAanmeldingen(l.id),
      ]);
      setLessen(lessenData.filter(les => les.actief));
      setMijnAanmeldingen(mijnData);
    } catch (e) {
      setError('Kon data niet laden. Probeer opnieuw.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { laadData(); }, [laadData]);

  const openLes = async (les) => {
    setGeselecteerdeLes(les);
    try {
      const data = await getAanmeldingen(les.id);
      setAanmeldingen(data);
    } catch (e) {
      setAanmeldingen([]);
    }
  };

  const sluit = () => { setGeselecteerdeLes(null); setAanmeldingen([]); };

  const handleAanmelden = async (rol, status = 'bevestigd') => {
    if (bezig) return;
    setBezig(true);
    try {
      await aanmelden(lid.id, geselecteerdeLes.id, rol, status);
      const [data, mijn] = await Promise.all([
        getAanmeldingen(geselecteerdeLes.id),
        getMijnAanmeldingen(lid.id),
      ]);
      setAanmeldingen(data);
      setMijnAanmeldingen(mijn);
      showToast(status === 'reservist' ? 'Ingeschreven als reservist' : `Aangemeld als ${rol}`);
    } catch {
      showToast('Er ging iets mis. Probeer opnieuw.');
    } finally {
      setBezig(false);
    }
  };

  const handleAfmelden = async () => {
    if (bezig) return;
    setBezig(true);
    try {
      await afmelden(lid.id, geselecteerdeLes.id);
      const [data, mijn] = await Promise.all([
        getAanmeldingen(geselecteerdeLes.id),
        getMijnAanmeldingen(lid.id),
      ]);
      setAanmeldingen(data);
      setMijnAanmeldingen(mijn);
      showToast('Je bent afgemeld');
    } catch {
      showToast('Er ging iets mis. Probeer opnieuw.');
    } finally {
      setBezig(false);
    }
  };

  if (loading) return (
    <div className="page">
      <div className="loading">
        <div style={{ marginBottom: 16 }}>
          <span className="loading-dot" />
          <span className="loading-dot" />
          <span className="loading-dot" />
        </div>
        Lessen laden…
      </div>
    </div>
  );

  if (error) return (
    <div className="page">
      <div className="page-header"><div className="logo">Soul <span>Community</span></div></div>
      <div className="error-msg">{error}</div>
    </div>
  );

  // ── Detailview ───────────────────────────────────────────────────────────

  if (geselecteerdeLes) {
    const les = geselecteerdeLes;
    const gesloten = isGesloten(les.datum, les.tijd) instanceof Promise
      ? false
      : (() => {
          const sluiting = new Date(`${les.datum}T17:00:00`);
          return new Date() >= sluiting;
        })();

    const leiders = aanmeldingen.filter(a => a.rol === 'leider' && a.status === 'bevestigd');
    const volgers = aanmeldingen.filter(a => a.rol === 'volger' && a.status === 'bevestigd');
    const reservisten = aanmeldingen.filter(a => a.status === 'reservist');

    const mijn = mijnAanmeldingen.find(a => a.lesId === les.id);
    const ingeschreven = !!mijn && mijn.status === 'bevestigd';
    const alsReservist = !!mijn && mijn.status === 'reservist';

    const aantalL = leiders.length;
    const aantalV = volgers.length;
    const totaal = aantalL + aantalV || 1;
    const tekort = aantalL < aantalV ? 'leider' : aantalL > aantalV ? 'volger' : null;
    const tekortAantal = Math.abs(aantalL - aantalV);

    const kanReservist = lid.isReservist && tekort && tekort !== lid.rol && !ingeschreven && !gesloten;
    const reservistBezetAantal = reservisten.filter(r => r.rol === tekort).length;
    const reservistPlaatsenVol = reservistBezetAantal >= tekortAantal;

    return (
      <div className="page">
        <div className="detail-header">
          <button className="back-btn" onClick={sluit}>← Terug</button>
          <div className="detail-naam">{les.naam}</div>
          <div className="detail-tijd">Woensdag {les.datum} · {les.tijd}</div>
        </div>

        {tekort && !gesloten && (
          <div className="banner banner-warning">
            {tekortAantal} {tekort}(s) tekort — reservisten kunnen invallen
          </div>
        )}

        {gesloten && (
          <div className="banner banner-gesloten">
            Aanmeldingen gesloten om 17:00. Afmelden? Stuur Ricardo een bericht.
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

        {/* Knoppen */}
        {!gesloten && (
          <div className="btn-wrap">
            {ingeschreven ? (
              <button className="btn btn-afmeld" onClick={handleAfmelden} disabled={bezig}>
                Afmelden
              </button>
            ) : alsReservist ? (
              <button className="btn btn-reservist-af" onClick={handleAfmelden} disabled={bezig}>
                Afmelden als reservist
              </button>
            ) : (
              <button className="btn btn-aanmeld" onClick={() => handleAanmelden(lid.rol)} disabled={bezig}>
                Aanmelden als {lid.rol}
              </button>
            )}

            {kanReservist && !alsReservist && !reservistPlaatsenVol && (
              <button className="btn btn-reservist" onClick={() => handleAanmelden(tekort, 'reservist')} disabled={bezig}>
                Aanmelden als reservist ({tekort})
              </button>
            )}

            {kanReservist && reservistPlaatsenVol && (
              <div className="banner banner-info" style={{ margin: 0 }}>
                Alle reservistplekken zijn al vergeven voor deze les.
              </div>
            )}
          </div>
        )}

        {gesloten && (
          <div className="btn-wrap">
            <a
              href={`https://wa.me/31612345678?text=Hoi%20Ricardo%2C%20ik%20wil%20me%20afmelden%20voor%20${encodeURIComponent(les.naam)}%20van%20${les.tijd}`}
              className="btn btn-contact"
              style={{ textDecoration: 'none', textAlign: 'center', display: 'block' }}
            >
              Contact Ricardo via WhatsApp
            </a>
          </div>
        )}

        {/* Deelnemerslijst */}
        <div className="sectie-label">Leiders ({aantalL})</div>
        {leiders.map(a => (
          <div key={a.id} className="deelnemer-rij">
            <div className="avatar av-l">{initials(a.naam)}</div>
            <div className={`deelnemer-naam${a.lidId === lid.id ? ' jij' : ''}`}>
              {a.naam}{a.lidId === lid.id ? ' (jij)' : ''}
            </div>
            <div className="rol-pill rp-l">Leider</div>
          </div>
        ))}

        <div className="sectie-label">Volgers ({aantalV})</div>
        {volgers.map(a => (
          <div key={a.id} className="deelnemer-rij">
            <div className="avatar av-v">{initials(a.naam)}</div>
            <div className={`deelnemer-naam${a.lidId === lid.id ? ' jij' : ''}`}>
              {a.naam}{a.lidId === lid.id ? ' (jij)' : ''}
            </div>
            <div className="rol-pill rp-v">Volger</div>
          </div>
        ))}

        {reservisten.length > 0 && (
          <>
            <div className="sectie-label">Reservisten ({reservisten.length})</div>
            {reservisten.map(a => (
              <div key={a.id} className="deelnemer-rij">
                <div className="avatar av-r">{initials(a.naam)}</div>
                <div className={`deelnemer-naam${a.lidId === lid.id ? ' jij' : ''}`}>
                  {a.naam}{a.lidId === lid.id ? ' (jij)' : ''}
                </div>
                <div className="rol-pill rp-r">Reservist</div>
              </div>
            ))}
          </>
        )}

        <Toast msg={toast} />
      </div>
    );
  }

  // ── Lijstview ────────────────────────────────────────────────────────────

  return (
    <div className="page">
      <div className="page-header">
        <div className="logo">Soul <span>Community</span></div>
        <div className="page-sub">Hallo {lid.naam.split(' ')[0]} · {lid.rol}</div>
      </div>

      <div className="legend">
        <div className="legend-item"><div className="legend-dot" style={{ background: '#378ADD' }} /> Leiders</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#D4537E' }} /> Volgers</div>
      </div>

      <div className="section">
        {lessen.length === 0 && <div style={{ color: 'var(--grijs)', fontSize: 14 }}>Geen lessen gepland.</div>}
        {lessen.map(les => {
          const mijn = mijnAanmeldingen.find(a => a.lesId === les.id);
          const ingeschreven = !!mijn && mijn.status === 'bevestigd';
          const alsReservist = !!mijn && mijn.status === 'reservist';
          return (
            <button key={les.id} className="les-card" onClick={() => openLes(les)}>
              <div className="les-tijd">{les.tijd}</div>
              <div className="les-naam">{les.naam}</div>
              <div className="balans-row">
                <div className="balans-bar">
                  <div className="bar-l" style={{ width: '45%' }} />
                  <div className="bar-v" style={{ width: '45%' }} />
                </div>
                <div className="balans-tekst">Bekijk →</div>
              </div>
              {ingeschreven && <span className="badge badge-ingeschreven">Ingeschreven als {lid.rol}</span>}
              {alsReservist && <span className="badge badge-reservist">Ingeschreven als reservist</span>}
              {!ingeschreven && !alsReservist && <span className="badge badge-nee">Niet ingeschreven</span>}
            </button>
          );
        })}
      </div>

      <Toast msg={toast} />
    </div>
  );
}
