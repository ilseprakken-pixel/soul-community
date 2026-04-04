// Google Sheets API helper
// Sheet ID comes from environment variable
const SHEET_ID = process.env.REACT_APP_SHEET_ID;
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const SCRIPT_URL = process.env.REACT_APP_SCRIPT_URL; // Apps Script Web App URL

// ── Read from Sheets (public read via API key) ──────────────────────────────

async function getRange(range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheets read error: ${res.status}`);
  const data = await res.json();
  return data.values || [];
}

// ── Write via Apps Script (handles auth server-side) ────────────────────────

async function callScript(action, payload) {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) throw new Error(`Script error: ${res.status}`);
  return res.json();
}

// ── Data helpers ─────────────────────────────────────────────────────────────

export async function getLidByToken(token) {
  const rows = await getRange('Leden!A2:F200');
  const row = rows.find(r => r[5] === token);
  if (!row) return null;
  return {
    id: row[0],
    naam: row[1],
    email: row[2],
    rol: row[3],       // 'leider' | 'volger'
    isReservist: row[4] === 'TRUE',
    token: row[5],
  };
}

export async function getLessen() {
  const rows = await getRange('Lessen!A2:E20');
  return rows.map(r => ({
    id: r[0],
    naam: r[1],
    tijd: r[2],
    datum: r[3],
    actief: r[4] === 'TRUE',
  }));
}

export async function getAanmeldingen(lesId) {
  const rows = await getRange('Aanmeldingen!A2:F500');
  return rows
    .filter(r => r[1] === lesId)
    .map(r => ({
      id: r[0],
      lesId: r[1],
      lidId: r[2],
      naam: r[3],
      rol: r[4],           // 'leider' | 'volger' | 'reservist'
      status: r[5],        // 'bevestigd' | 'reservist'
    }));
}

export async function getMijnAanmeldingen(lidId) {
  const rows = await getRange('Aanmeldingen!A2:F500');
  return rows
    .filter(r => r[2] === lidId)
    .map(r => ({
      lesId: r[1],
      rol: r[4],
      status: r[5],
    }));
}

// ── Mutations via Apps Script ────────────────────────────────────────────────

export async function aanmelden(lidId, lesId, rol, status = 'bevestigd') {
  return callScript('aanmelden', { lidId, lesId, rol, status });
}

export async function afmelden(lidId, lesId) {
  return callScript('afmelden', { lidId, lesId });
}

export async function isGesloten(datum, tijd) {
  const [h, m] = tijd.split(':').map(Number);
  const sluitingStr = `${datum}T17:00:00`;
  const sluiting = new Date(sluitingStr);
  const nu = new Date();
  return nu >= sluiting;
}
