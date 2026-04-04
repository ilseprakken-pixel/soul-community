# Soul Community — Installatiegids
Stap-voor-stap, geen technische voorkennis vereist.

---

## Stap 1 — Google Spreadsheet aanmaken

1. Ga naar **sheets.google.com** en maak een nieuw spreadsheet aan
2. Noem het: `Soul Community`
3. Maak 3 tabbladen aan (klik op + onderaan):

### Tabblad 1: `Leden`
Maak deze kolommen in rij 1:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| id | naam | email | rol | isReservist | token |

Vul leden in vanaf rij 2. Voorbeeld:
```
lid_001  |  Jan Klaassen     |  jan@email.nl    |  leider  |  FALSE  |  abc123xyz
lid_002  |  Ilse Prakken     |  ilse@email.nl   |  volger  |  TRUE   |  def456uvw
lid_003  |  Anna Linde       |  anna@email.nl   |  volger  |  FALSE  |  ghi789rst
```

**Let op:**
- `id` = verzin zelf iets unieks per lid (bijv. lid_001, lid_002)
- `rol` = precies `leider` of `volger` (kleine letters)
- `isReservist` = `TRUE` of `FALSE`
- `token` = een willekeurige reeks letters/cijfers, dit wordt de persoonlijke link
  - Tip: gebruik een wachtwoordgenerator voor tokens (bijv. Id)

### Tabblad 2: `Lessen`
Kolommen in rij 1:

| A | B | C | D | E |
|---|---|---|---|---|
| id | naam | tijd | datum | actief |

Vul in (pas datum aan naar de eerstvolgende woensdag):
```
les_bachata   |  Bachata          |  19:00  |  2026-04-09  |  TRUE
les_salsa     |  Salsa            |  20:00  |  2026-04-09  |  TRUE
les_advance   |  Advance / Rueda  |  21:00  |  2026-04-09  |  TRUE
```

**Tip:** Elke week pas je de `datum` aan naar de juiste woensdag.
Later kunnen we dit automatiseren, maar voor de MVP is handmatig prima.

### Tabblad 3: `Aanmeldingen`
Kolommen in rij 1:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| id | lesId | lidId | naam | rol | status |

Dit tabblad vul je niet zelf in — de app doet dit automatisch.

---

## Stap 2 — Sheet ID kopiëren

Open je spreadsheet. Kijk naar de URL:
```
https://docs.google.com/spreadsheets/d/HIER_STAAT_HET_ID/edit
```
Kopieer het deel tussen `/d/` en `/edit` — dat is je **Sheet ID**. Bewaar dit.

---

## Stap 3 — Google API Key aanmaken (voor lezen)

1. Ga naar **console.cloud.google.com**
2. Maak een nieuw project aan: klik op het project-dropdown bovenaan → "New Project" → naam: `Soul Community`
3. Ga naar **APIs & Services → Library**
4. Zoek op "Google Sheets API" → klik → **Enable**
5. Ga naar **APIs & Services → Credentials**
6. Klik **+ Create Credentials → API Key**
7. Kopieer de key die verschijnt
8. Klik op de key → **API restrictions → Restrict key** → kies "Google Sheets API"
9. Sla op

Bewaar deze **API Key**.

---

## Stap 4 — Google Apps Script instellen

1. Open je spreadsheet
2. Klik op **Uitbreidingen → Apps Script**
3. Verwijder de code die er al staat
4. Plak de volledige inhoud van het bestand `Code.gs` (uit dit project)
5. Pas bovenaan het script aan:
   ```javascript
   const RICARDO_EMAIL = 'ricardos-email@gmail.com'; // Ricardos e-mailadres
   const WHATSAPP_RICARDO = '316XXXXXXXX'; // Ricardos nummer
   ```
6. Klik op **Deploy → New Deployment**
7. Kies type: **Web App**
8. Vul in:
   - Execute as: **Me**
   - Who has access: **Anyone**
9. Klik **Deploy** → geef toestemming als gevraagd
10. Kopieer de **Web App URL** die verschijnt (begint met `https://script.google.com/macros/s/...`)

Bewaar deze **Script URL**.

### Reminder-trigger instellen
1. In Apps Script, klik op het klokje-icoon links (Triggers)
2. Klik **+ Add Trigger**
3. Kies:
   - Function: `stuurReminders`
   - Event source: **Time-driven**
   - Type: **Day timer**
   - Time: **4pm to 5pm**
4. Sla op

Dit stuurt elke dag om ~16:00 reminders — het script checkt zelf of het woensdag is.

---

## Stap 5 — App deployen op Vercel

### 5a. GitHub repository aanmaken
1. Ga naar **github.com** → maak een gratis account als je die nog niet hebt
2. Klik **+ New repository**
3. Naam: `soul-community`
4. Kies **Private**
5. Klik **Create repository**

### 5b. Code uploaden
Op je computer:
1. Installeer **Node.js** als je dat nog niet hebt: nodejs.org (kies LTS versie)
2. Open Terminal (Mac) of Command Prompt (Windows)
3. Navigeer naar de projectmap:
   ```bash
   cd pad/naar/soul-community
   ```
4. Voer uit:
   ```bash
   git init
   git add .
   git commit -m "Soul Community v1"
   git branch -M main
   git remote add origin https://github.com/JOUWGEBRUIKERSNAAM/soul-community.git
   git push -u origin main
   ```

### 5c. Vercel verbinden
1. Ga naar **vercel.com** → maak gratis account aan (log in met GitHub)
2. Klik **Add New Project**
3. Kies je `soul-community` repository
4. Klik **Import**
5. Bij **Environment Variables** voeg je toe (klik "Add" voor elk):

   | Naam | Waarde |
   |------|--------|
   | `REACT_APP_SHEET_ID` | jouw Sheet ID (stap 2) |
   | `REACT_APP_GOOGLE_API_KEY` | jouw API Key (stap 3) |
   | `REACT_APP_SCRIPT_URL` | jouw Script URL (stap 4) |
   | `REACT_APP_BEHEER_TOKEN` | een wachtwoord voor Ricardo (verzin zelf) |

6. Klik **Deploy**

Na een minuutje krijg je een URL zoals `soul-community.vercel.app`. 

---

## Stap 6 — Persoonlijke links versturen

Elke leden-URL ziet er zo uit:
```
https://soul-community.vercel.app/lid/TOKEN
```

Waarbij `TOKEN` het token is uit kolom F van je Leden-tabblad.

Ricardo's beheerpagina:
```
https://soul-community.vercel.app/beheer
```
(wachtwoord = wat je bij `REACT_APP_BEHEER_TOKEN` hebt ingevuld)

---

## Stap 7 — Apps Script URL bijwerken

Open `Code.gs` in Apps Script en zoek deze regel in `stuurReminders`:
```javascript
const appUrl = `https://jouw-app.vercel.app/lid/${lid.token}`;
```
Vervang `jouw-app` door je echte Vercel URL. Klik daarna op **Deploy → Manage Deployments → maak nieuwe versie**.

---

## Wekelijks onderhoud (5 minuten)

Elke week moet je de lesdatum bijwerken in het `Lessen`-tabblad:
1. Open de spreadsheet
2. Pas de `datum`-kolom aan naar de eerstvolgende woensdag (formaat: `2026-04-16`)
3. Klaar

---

## Leden toevoegen

1. Open de spreadsheet → tabblad `Leden`
2. Voeg een nieuwe rij toe met een uniek `id` en `token`
3. Stuur de link `https://soul-community.vercel.app/lid/HUNTOKEN` naar het nieuwe lid

---

## Hulp nodig?

Stuur gewoon een bericht aan Claude met je vraag — ik help je verder.
