// ═══════════════════════════════════════════════════════════════════
// Soul Community — Google Apps Script
// Plak dit in script.google.com, koppel aan je spreadsheet,
// en deploy als Web App (toegang: iedereen)
// ═══════════════════════════════════════════════════════════════════

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const RICARDO_EMAIL = 'ilseprakken@gmail.com'; // pas aan naar Ricardos e-mail
const WHATSAPP_RICARDO = '31612345678'; // Ricardos nummer zonder + en zonder 0 vooraan

// ── Entry point voor POST requests van de webapp ─────────────────────────

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const { action } = payload;

    let result;
    if (action === 'aanmelden') result = handleAanmelden(payload);
    else if (action === 'afmelden') result = handleAfmelden(payload);
    else result = { ok: false, error: 'Onbekende actie' };

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Aanmelden ────────────────────────────────────────────────────────────

function handleAanmelden({ lidId, lesId, rol, status }) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Aanmeldingen');
  const lid = getLid(lidId);
  const les = getLes(lesId);

  if (!lid || !les) return { ok: false, error: 'Lid of les niet gevonden' };

  // Controleer of al ingeschreven
  const bestaand = zoekAanmelding(sheet, lidId, lesId);
  if (bestaand) {
    // Update status als dat verandert (bijv. reservist → bevestigd)
    sheet.getRange(bestaand.rij, 5).setValue(rol);
    sheet.getRange(bestaand.rij, 6).setValue(status);
  } else {
    // Nieuwe rij toevoegen
    const id = Utilities.getUuid();
    sheet.appendRow([id, lesId, lidId, lid.naam, rol, status]);
  }

  // Stuur bevestigingsmail
  const onderwerp = status === 'reservist'
    ? `Soul Community — reservist aangemeld: ${les.naam}`
    : `Soul Community — aangemeld: ${les.naam}`;
  const bericht = status === 'reservist'
    ? `Hoi ${lid.naam.split(' ')[0]},\n\nJe staat op de reservistenlijst voor ${les.naam} op woensdag ${les.datum} om ${les.tijd}.\n\nJe krijgt automatisch een plek als er een ${rol} tekort is en er nog een plek vrij is. Je hoeft niets te doen.\n\nTot dan!\nSoul Community`
    : `Hoi ${lid.naam.split(' ')[0]},\n\nJe bent aangemeld als ${rol} voor ${les.naam} op woensdag ${les.datum} om ${les.tijd}.\n\nTot dan!\nSoul Community`;

  GmailApp.sendEmail(lid.email, onderwerp, bericht);

  // Als reservist: check of balans hersteld is
  if (status === 'reservist') {
    checkEnBevestigReservisten(lesId, les, sheet);
  }

  return { ok: true };
}

// ── Reservistenlogica: eerste = plek ─────────────────────────────────────

function checkEnBevestigReservisten(lesId, les, sheet) {
  const alle = getAlleAanmeldingen(sheet, lesId);
  const leiders = alle.filter(a => a.rol === 'leider' && a.status === 'bevestigd').length;
  const volgers = alle.filter(a => a.rol === 'volger' && a.status === 'bevestigd').length;
  const reservisten = alle.filter(a => a.status === 'reservist');

  if (leiders === volgers) return; // in balans, niets te doen

  const tekort = leiders < volgers ? 'leider' : 'volger';
  const aantalTekort = Math.abs(leiders - volgers);

  // Reservisten die de vacante rol kunnen vullen, op volgorde van aanmelding
  const kandidaten = reservisten.filter(a => a.rol === tekort);
  const teBevestigen = kandidaten.slice(0, aantalTekort);

  teBevestigen.forEach(kandidaat => {
    // Zet status op bevestigd in de sheet
    sheet.getRange(kandidaat.rij, 6).setValue('bevestigd');
    // Stuur bevestigingsmail aan reservist
    const lid = getLid(kandidaat.lidId);
    if (lid) {
      GmailApp.sendEmail(
        lid.email,
        `Soul Community — jij mag invallen! ${les.naam}`,
        `Hoi ${lid.naam.split(' ')[0]},\n\nGoed nieuws! Je bent bevestigd als invaller (${tekort}) voor ${les.naam} op woensdag ${les.datum} om ${les.tijd}.\n\nJe deelname is gratis. Tot dan!\nSoul Community`
      );
    }
  });

  // Stuur bericht naar Ricardo als er nog steeds tekort is
  const nogTekort = aantalTekort - teBevestigen.length;
  if (nogTekort > 0) {
    GmailApp.sendEmail(
      RICARDO_EMAIL,
      `Soul Community — nog ${nogTekort} ${tekort}(s) tekort: ${les.naam}`,
      `Hoi Ricardo,\n\nNa de reservistenronde is er nog ${nogTekort} ${tekort} tekort voor ${les.naam} op woensdag ${les.datum} om ${les.tijd}.\n\nHuidige stand:\n- Leiders: ${leiders}\n- Volgers: ${volgers}\n- Reservisten beschikbaar: ${kandidaten.length}\n\nCheck de beheerderspagina voor meer details.\n\nSoul Community`
    );
  }
}

// ── Afmelden ─────────────────────────────────────────────────────────────

function handleAfmelden({ lidId, lesId }) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Aanmeldingen');
  const lid = getLid(lidId);
  const les = getLes(lesId);

  if (!lid || !les) return { ok: false, error: 'Lid of les niet gevonden' };

  const bestaand = zoekAanmelding(sheet, lidId, lesId);
  if (!bestaand) return { ok: false, error: 'Aanmelding niet gevonden' };

  // Verwijder rij
  sheet.deleteRow(bestaand.rij);

  // Bevestigingsmail afmelding
  GmailApp.sendEmail(
    lid.email,
    `Soul Community — afgemeld: ${les.naam}`,
    `Hoi ${lid.naam.split(' ')[0]},\n\nJe bent afgemeld voor ${les.naam} op woensdag ${les.datum} om ${les.tijd}.\n\nTot de volgende keer!\nSoul Community`
  );

  // Check of er nu onbalans is en reservisten nodig zijn
  checkEnBevestigReservisten(lesId, les, sheet);

  return { ok: true };
}

// ── Geplande taak: 16:00 reminder ────────────────────────────────────────
// Stel in via Apps Script > Triggers > dagelijks om 16:00

function stuurReminders() {
  const dag = new Date();
  const dagNaam = ['Zondag','Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag'][dag.getDay()];
  if (dagNaam !== 'Woensdag') return; // alleen op woensdag

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const lessenSheet = ss.getSheetByName('Lessen');
  const aanmSheet = ss.getSheetByName('Aanmeldingen');
  const ledenSheet = ss.getSheetByName('Leden');

  const lessen = lessenSheet.getDataRange().getValues().slice(1)
    .filter(r => r[4] === true) // actief
    .map(r => ({ id: r[0], naam: r[1], tijd: r[2], datum: r[3] }));

  if (lessen.length === 0) return;

  const leden = ledenSheet.getDataRange().getValues().slice(1)
    .map(r => ({ id: r[0], naam: r[1], email: r[2], token: r[5] }));

  const aanmeldingen = aanmSheet.getDataRange().getValues().slice(1)
    .map(r => ({ lesId: r[1], lidId: r[2] }));

  // Stuur reminder naar iedereen die NIET ingeschreven is voor welke les dan ook
  leden.forEach(lid => {
    const ingeschreven = aanmeldingen.some(a => a.lidId === lid.id);
    if (!ingeschreven) {
      const lessenLijst = lessen.map(l => `• ${l.tijd} — ${l.naam}`).join('\n');
      const appUrl = `https://jouw-app.vercel.app/lid/${lid.token}`; // vervang met jouw URL
      GmailApp.sendEmail(
        lid.email,
        'Soul Community — vergeet je niet aan te melden?',
        `Hoi ${lid.naam.split(' ')[0]},\n\nVanavond zijn er lessen en je staat nog nergens ingeschreven.\n\nLessen:\n${lessenLijst}\n\nMeld je aan vóór 17:00:\n${appUrl}\n\nTot vanavond!\nSoul Community`
      );
    }
  });
}

// ── Hulpfuncties ─────────────────────────────────────────────────────────

function getLid(lidId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Leden');
  const rows = sheet.getDataRange().getValues().slice(1);
  const row = rows.find(r => r[0] === lidId);
  if (!row) return null;
  return { id: row[0], naam: row[1], email: row[2], rol: row[3], isReservist: row[4] === true, token: row[5] };
}

function getLes(lesId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Lessen');
  const rows = sheet.getDataRange().getValues().slice(1);
  const row = rows.find(r => r[0] === lesId);
  if (!row) return null;
  return { id: row[0], naam: row[1], tijd: row[2], datum: row[3], actief: row[4] };
}

function zoekAanmelding(sheet, lidId, lesId) {
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][2] === lidId && rows[i][1] === lesId) {
      return { rij: i + 1, lidId: rows[i][2], rol: rows[i][4], status: rows[i][5] };
    }
  }
  return null;
}

function getAlleAanmeldingen(sheet, lesId) {
  const rows = sheet.getDataRange().getValues().slice(1);
  return rows
    .map((r, i) => ({ rij: i + 2, lesId: r[1], lidId: r[2], naam: r[3], rol: r[4], status: r[5] }))
    .filter(a => a.lesId === lesId);
}
