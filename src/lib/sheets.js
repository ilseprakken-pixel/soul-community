const SHEET_ID = process.env.REACT_APP_SHEET_ID;
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const SCRIPT_URL = process.env.REACT_APP_SCRIPT_URL;

async function getRange(range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheets read error: ${res.status}`);
  const data = await res.json();
  return data.values || [];
}

async function callScript(action, payload) {
  const params = new URLSearchParams({ action, ...payload });
  const url = SCRIPT_URL + '?' + params.toString();
  await fetch(url, { redirect: 'follow', mode: 'no-cors' });
  return { ok: true };
}

export async function getLidByToken(token) {
  const rows = await getRange('Leden!A2:F200');
  const row = rows.find(r => r[5] === token);
  if (!row) return null;
  return {
    id: row[0], naam: row[1], email: row[2],
    rol: row[3], isReservist: row[4] === 'TRUE', token: row[5],
  };
}

export async function getLessen() {
  const rows = await getRange('Lessen!A2:E100');
  const nu = new Date();
  return rows
    .filter(r => r[4] === 'TRUE')
    .map(r => ({ id: r[0], naam: r[1], tijd: r[2], datum: r[3], actief: true }))
    .filter(les => new Date(les.datum) >= new Date(nu.toDateString()))
    .sort((a, b) => new Date(a.datum) - new Date(b.datum));
}

export async function getEvents() {
  try {
    const rows = await getRange('Events!A2:H100');
    const nu = new Date();
    return rows
      .filter(r => r[8] === 'TRUE')
      .map(r => ({
        id: r[0], naam: r[1], datum: r[2], tijd: r[3],
        locatie: r[4], beschrijving: r[5], prijs: r[6], fotoUrl: r[8] || null, actief: true,
        type: 'event'
      }))
      .filter(e => new Date(e.datum) >= new Date(nu.toDateString()))
      .sort((a, b) => new Date(a.datum) - new Date(b.datum));
  } catch {
    return [];
  }
}

export async function getAanmeldingen(lesId) {
  const rows = await getRange('Aanmeldingen!A2:F500');
  return rows
    .filter(r => r[1] === lesId)
    .map(r => ({
      id: r[0], lesId: r[1], lidId: r[2],
      naam: r[3], rol: r[4], status: r[5],
    }));
}

export async function getMijnAanmeldingen(lidId) {
  const rows = await getRange('Aanmeldingen!A2:F500');
  return rows
    .filter(r => r[2] === lidId)
    .map(r => ({ lesId: r[1], rol: r[4], status: r[5] }));
}

export async function aanmelden(lidId, lesId, rol, status = 'bevestigd') {
  return callScript('aanmelden', { lidId, lesId, rol, status });
}

export async function afmelden(lidId, lesId) {
  return callScript('afmelden', { lidId, lesId });
}

export function isGesloten(datum) {
  const sluiting = new Date(`${datum}T17:00:00`);
  return new Date() >= sluiting;
}

export function groeperPerDatum(lessen, events) {
  const alles = [
    ...lessen.map(l => ({ ...l, type: 'les' })),
    ...events.map(e => ({ ...e, type: 'event' })),
  ].sort((a, b) => {
    if (a.datum !== b.datum) return new Date(a.datum) - new Date(b.datum);
    return (a.tijd || '').localeCompare(b.tijd || '');
  });

  const groepen = {};
  alles.forEach(item => {
    if (!groepen[item.datum]) groepen[item.datum] = [];
    groepen[item.datum].push(item);
  });
  return groepen;
}

export function formatDatum(datum) {
  const d = new Date(datum + 'T12:00:00');
  return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
}
