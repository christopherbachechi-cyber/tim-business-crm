# PROJECT_SPEC.md — Specifica Completa TIM Business CRM + Call Center

---

## 1. Obiettivo Generale

Sistema web proprietario per Christopher, agente TIM Business, composto da:

1. **CRM** (`index.html`): gestione del portafoglio clienti TIM Business — contratti, scadenze, prodotti attivi, rischio churn, appuntamenti.
2. **Call Center** (`callcenter.html`): strumento per una collaboratrice (agente) che chiama liste di prospect da browser, con monitoraggio live per il manager (Christopher).

Il sistema è ospitato su Netlify (piano gratuito), usa Google Sheets come database persistente, Google Calendar per gli appuntamenti e Twilio per le chiamate VoIP da browser.

---

## 2. Tipologie di Utenti e Permessi

### Master (Christopher)
- Accesso completo al CRM: dashboard, clienti, scadenze, appuntamenti
- Accesso al Call Center in modalità **Manager**: live monitor, storico chiamate con registrazioni, lista contatti, import Excel
- Può aggiungere appuntamenti manualmente da entrambe le app
- Unico utente con accesso al CRM

### Agente (collaboratrice)
- Accesso **esclusivo** al Call Center in modalità **Agente**: coda contatti, interfaccia di chiamata, form esito
- Nessun accesso al CRM
- Se tenta di accedere a `/index.html`, viene reindirizzata a `/callcenter.html`

### Autenticazione
- Login con username + password via endpoint `/api/login`
- Sessione persistita in `localStorage` con chiave `tim_session`, formato `{role: 'master'|'agent', name: string}`
- Nessun token JWT — la sessione è lato client, il backend non verifica ogni richiesta
- Logout: cancella `tim_session` da localStorage

---

## 3. Pagine e Sezioni

### `/index.html` — CRM
Accessibile solo a utenti con `role === 'master'`. Contiene 4 tab navigabili + form aggiunta:

| Tab | Contenuto |
|---|---|
| 📊 Dashboard | Riepilogo: totale clienti, scadenze entro 60gg, rischio alto, appuntamenti oggi |
| 👥 Clienti | Lista con ricerca + 5 filtri, click per dettaglio, pulsante modifica |
| 📅 Scadenze | Lista ordinata per data scadenza con semaforo colori |
| 🗓 Appuntamenti | Lista appuntamenti da Google Sheets + modal "Nuovo Appuntamento" |
| Form | Aggiunta/modifica cliente (ragione sociale, referente, telefono, contratto, infrastruttura, prodotti, note) |

Header contiene: logo, nome utente, badge "Master", link "📞 Call Center" (apre `/callcenter.html`), pulsante Esci.

### `/callcenter.html` — Call Center

#### Vista Manager (role=master)
4 tab:
| Tab | Contenuto |
|---|---|
| 📊 Live | Chiamata in corso con timer real-time, stats del giorno, lista chiamate odierne |
| 📋 Storico | Tutte le chiamate con filtri, player audio registrazioni |
| 👥 Contatti | Lista contatti con filtri per stato e ricerca |
| 📥 Import | Caricamento file Excel/CSV da Atoka con mapping colonne automatico |

Header: "← CRM" link, tab nav, pulsante Esci.

#### Vista Agente (role=agent)
3 view sequenziali:
1. **Queue** — coda contatti ordinata, barra ricerca, stats giornaliere
2. **Calling** — interfaccia chiamata in corso con timer, muto, riattacca
3. **Outcome** — form post-chiamata (esito, note, data ricontatto, orario)

---

## 4. Funzionamento Dettagliato del CRM

### Dashboard
- Mostra 3 card: clienti totali, scadenze entro 60 giorni, clienti a rischio alto
- Se ci sono appuntamenti oggi: card viola in evidenza con lista
- Sezione "Azioni urgenti": contratti scaduti (rosso) e in scadenza entro 60gg (giallo)
- Clic su qualsiasi alert porta al dettaglio cliente

### Lista Clienti
Filtri disponibili (5 dropdown):
- **Attivo da**: tutti / <1 anno / 1-2 anni / 2-3 anni / >3 anni (calcolato da `contractStart`)
- **Reti fisse**: tutte / 0 / 1 / 2 / 3+
- **Reti mobili**: tutte / 0 / 1-3 / 4-9 / 10+
- **Centralino**: tutti / Sì / No
- **Trunk**: tutti / Sì / No

Ricerca testuale su `name` e `contact`.

Tabella colonne: Cliente (nome + referente), Stipula→Scadenza (con semaforo urgenza), Reti fisse, Reti mobili, Centralino, Trunk, Rischio churn, Pulsante modifica.

### Dettaglio Cliente
Mostra tutti i campi, prodotti attivi come badge blu, note, pulsanti Modifica ed Elimina.

### Form Cliente
Sezioni: Anagrafica (nome, referente, telefono, rischio churn), Contratto (data stipula, scadenza), Infrastruttura (reti fisse, reti mobili, centralino, trunk), Prodotti attivi (toggle), Note.

### Tab Appuntamenti
- Legge da Google Sheets tab `appointments` tramite `/api/data?type=appointments`
- Mostra: prossimi (ordinati per data crescente) e passati (ordinati per data decrescente)
- Badge "OGGI" per appuntamenti del giorno corrente
- Badge "✓ Google Cal" se l'appuntamento ha un `googleEventId`
- Pulsante "🔄 Aggiorna" per ricaricare manualmente
- Pulsante "➕ Nuovo Appuntamento" apre modal

### Modal Appuntamento (CRM)
Campi: Azienda*, Referente, Telefono, Data*, Orario, Note.
Al salvataggio: POST `/api/appointment` → salva su Sheets + crea evento Calendar.

---

## 5. Funzionamento del Call Center

### Import Contatti (Manager)
- Accetta file `.xlsx`, `.xls`, `.csv`
- Parsing con SheetJS
- Auto-mapping colonne Atoka:
  - `company` ← "ragione sociale", "denominazione", "azienda"
  - `phone` ← "telefono", "tel", "cellulare"
  - `contact` ← "referente", "contatto"
  - `email` ← "email", "e-mail"
  - `city` ← "comune", "città"
  - `province` ← "provincia", "prov"
  - `sector` ← "descrizione ateco", "settore", "attivita"
- Preview prime 5 righe con colonne mappate
- Import: POST `/api/data` con `{type: 'contacts', data: Contact[]}`
- Deduplicazione per `phone`

### Coda Contatti (Agente)
Ordinamento:
1. Richiamati **oggi** (callbackDate <= today) per primi
2. Poi `da_chiamare` (mai contattati)
3. Poi tutto il resto

Ricerca testuale su `company` e `phone`.

### Live Monitor (Manager)
- Polling `/api/data?type=active` ogni 5 secondi
- Mostra: nome azienda, telefono, timer che avanza in tempo reale
- Badge "🔴 LIVE" nell'header quando c'è una chiamata in corso
- Aggiornamento automatico lista chiamate del giorno ogni 10 secondi

---

## 6. Flusso Completo Chiamata

```
1. Agente clicca "📞 Chiama" su un contatto
2. Frontend chiama Twilio.Device.connect({ To: phone })
3. Twilio invia POST a /api/voice (TwiML webhook)
   → voice.js risponde con TwiML: dial verso numero + recording abilitato
4. Evento 'connect' su Twilio.Device:
   → setCallStart(timestamp)
   → timer si avvia
   → POST /api/data con {type: 'active', data: {contactName, phone, startTime, callSid}}
5. Durante chiamata:
   → agente può mutare microfono (Twilio.Device mute)
   → manager vede chiamata live (polling active)
6. Fine chiamata (agente clicca 📵 o cliente riattacca):
   → evento 'disconnect' su Twilio.Device
   → view cambia a 'outcome'
   → Twilio chiama POST /api/call-ended (webhook action del dial)
     → call-ended.js aggiorna duration in calls.json, svuota active.json
7. Form esito (agente):
   → seleziona esito
   → (opzionale) data + ora ricontatto
   → note libere
   → salva: POST /api/data {type: 'calls', data: updatedCalls}
              POST /api/data {type: 'contacts', data: updatedContacts}
   → se esito = 'appuntamento': POST /api/appointment
8. Registrazione (asincrono, dopo fine chiamata):
   → Twilio chiama POST /api/recording-ready
   → recording-ready.js aggiorna recordingSid nel record della chiamata
   → Manager può ascoltare da Storico tramite GET /api/recording?sid=XXXX
```

---

## 7. Integrazione Google Calendar

- Trigger: quando viene salvato un appuntamento (da Modal o da form esito con `outcome === 'appuntamento'`)
- Funzione: `appointment.js`
- Auth: Google Service Account con scope `https://www.googleapis.com/auth/calendar`
- Calendario target: `process.env.GOOGLE_CALENDAR_ID`
- Evento creato con:
  - Summary: `📞 TIM Business – {company}`
  - Description: azienda, contatto, telefono, note, firma CRM
  - Start/End: se `time` presente → `dateTime` (durata 1h); se assente → `date` (tutto il giorno)
  - Reminder: popup 30 minuti prima
- Se Calendar fallisce: errore non bloccante (il record viene comunque salvato su Sheets)
- `googleEventId` viene salvato nell'oggetto appuntamento su Sheets

---

## 8. Integrazione Google Sheets

### Setup
- Un singolo Google Spreadsheet con 4 tab: `contacts`, `calls`, `appointments`, `active`
- Condiviso con l'email del service account come Editor
- Helper `_sheets.js`:
  - `sheetsRead(tabName)` → legge cella A1, restituisce stringa JSON o null
  - `sheetsWrite(tabName, content)` → scrive stringa JSON in cella A1
- Auth: scope `https://www.googleapis.com/auth/spreadsheets`

### Limitazioni note
- Ogni tab tiene tutto il JSON in una singola cella (A1): approccio semplice ma non scalabile oltre qualche centinaio di record (limite cella Google Sheets: 50.000 caratteri)
- Nessuna gestione concorrenza: se due richieste scrivono simultaneamente può verificarsi sovrascrittura

### Cosa NON è su Sheets
- **Clienti CRM** (`index.html`): salvati in `localStorage` del browser con chiave `tim_crm_v2` — **DA MIGRARE**

---

## 9. Netlify Functions — Dettaglio

Tutte le funzioni sono formato v1 (`exports.handler`). Il file `_sheets.js` è un modulo interno (prefisso `_` = non esposto come endpoint).

### `_sheets.js`
Helper condiviso. Usa `googleapis` per leggere/scrivere celle Google Sheets. Legge credenziali da `GOOGLE_SERVICE_ACCOUNT_KEY` e foglio da `GOOGLE_SPREADSHEET_ID`.

### `login.js`
- POST `/api/login`
- Verifica `username` + `password` contro env vars
- Restituisce `{ok: true, role: 'master'|'agent', name: string}` o `{ok: false}`
- Default fallback: MASTER_USER=christopher, MASTER_PASSWORD=master1234, AGENT_USER=agente, AGENT_PASSWORD=agente1234

### `token.js`
- GET `/api/token`
- Genera Twilio Access Token JWT (scadenza 1h)
- Usa `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY`, `TWILIO_API_SECRET`
- VoiceGrant con `outgoingApplicationSid = TWILIO_TWIML_APP_SID`

### `voice.js`
- POST `/api/voice` (Twilio TwiML App Voice URL)
- Legge `To` dal body URLencoded
- Formatta numero italiano: se non inizia con `+` → aggiunge `+39`
- Dial con: `callerId = TWILIO_PHONE_NUMBER`, recording abilitato (`record-from-ringing-dual`)
- Callback recording → `/api/recording-ready`
- Action (fine chiamata) → `/api/call-ended`
- Timeout: 30 secondi

### `data.js`
- GET `/api/data?type={contacts|calls|appointments|active}`
- POST `/api/data` body `{type, data}`
- CRUD su Google Sheets via `_sheets.js`

### `appointment.js`
- POST `/api/appointment`
- Body: `{company, contactName, phone, date, time, notes, callSid?}`
- Salva su Sheets tab `appointments`
- Poi (opzionale) crea evento Google Calendar
- Restituisce `{ok: true, id, googleEventId}`

### `call-ended.js`
- POST `/api/call-ended` (Twilio action webhook)
- Aggiorna `duration` e `endTime` nel record della chiamata
- Svuota tab `active`
- Risponde con TwiML vuoto

### `recording-ready.js`
- POST `/api/recording-ready` (Twilio recording callback)
- Aggiorna `recordingSid` e `recordingDuration` nel record

### `recording.js`
- GET `/api/recording?sid={RecordingSid}`
- Proxy: scarica MP3 da Twilio con auth Basic (TWILIO_ACCOUNT_SID:TWILIO_AUTH_TOKEN)
- Restituisce audio come base64 con `Content-Type: audio/mpeg`

---

## 10. Struttura Dati

### Contact
```json
{
  "id": "string (uid o timestamp)",
  "company": "string (ragione sociale)",
  "contact": "string (referente)",
  "phone": "string",
  "email": "string",
  "city": "string",
  "province": "string",
  "sector": "string (desc. ATECO)",
  "products": ["string"],
  "contractStart": "YYYY-MM-DD",
  "contractEnd": "YYYY-MM-DD",
  "retiFisse": "number",
  "retiMobili": "number",
  "centralino": "boolean",
  "trunk": "boolean",
  "churnRisk": "basso|medio|alto",
  "status": "da_chiamare|interessato|non_interessato|richiamata|appuntamento|segreteria",
  "callbackDate": "YYYY-MM-DD|null",
  "notes": "string"
}
```

**Nota**: il campo `status` esiste su tutti i contatti ma viene usato principalmente per i contatti del call center. I clienti CRM usano `churnRisk` invece.

### Call
```json
{
  "id": "string",
  "callSid": "string (Twilio CallSid)",
  "contactId": "string",
  "contactName": "string",
  "phone": "string",
  "startTime": "ISO datetime",
  "endTime": "ISO datetime",
  "duration": "number (secondi)",
  "outcome": "interessato|non_interessato|richiamata|appuntamento|segreteria|null",
  "notes": "string",
  "status": "completata",
  "recordingSid": "string|null",
  "recordingDuration": "number|null"
}
```

### Appointment
```json
{
  "id": "string",
  "company": "string",
  "contactName": "string",
  "phone": "string",
  "date": "YYYY-MM-DD",
  "time": "HH:MM|''",
  "notes": "string",
  "callSid": "string|''",
  "createdAt": "ISO datetime",
  "googleEventId": "string|null"
}
```

### ActiveCall
```json
{
  "contactName": "string",
  "phone": "string",
  "startTime": "ISO datetime",
  "callSid": "string"
}
```
Oppure `null` / stringa `"null"` quando non c'è chiamata attiva.

---

## 11. Regole di Business

1. **Ordinamento coda agente**: callback scaduti oggi → `da_chiamare` → tutto il resto
2. **Deduplicazione import**: i contatti vengono filtrati per `phone` — non vengono importati se il numero esiste già
3. **Ricontatto**: se esito = `richiamata` o `appuntamento`, l'agente deve specificare data (e orario opzionale)
4. **Appuntamento**: se esito = `appuntamento` → POST automatico a `/api/appointment` → evento Google Calendar
5. **Scadenze**: contratto scaduto = rosso; entro 30gg = rosso/arancio; entro 60gg = giallo
6. **Churn risk**: basso = verde, medio = giallo, alto = rosso
7. **Stato contatto**: aggiornato automaticamente dopo ogni chiamata con l'esito selezionato
8. **Sessione**: condivisa tra `/index.html` e `/callcenter.html` via `localStorage` ('tim_session')
9. **Agente su CRM**: se role=agent tenta di aprire `/`, viene reindirizzato a `/callcenter.html`
10. **Recording**: avviene automaticamente su tutte le chiamate (Twilio `record-from-ringing-dual`)

---

## 12. Aspetto Grafico

### Palette colori
```
Navy (primary):   #0d1b4b
Blue (accent):    #3b82f6
Green (success):  #22c55e
Amber (warning):  #f59e0b
Red (danger):     #ef4444
Purple (appt):    #8b5cf6
Background:       #f4f6f9
```

### Tipografia
Font: `'DM Sans', 'Segoe UI', sans-serif` — caricato da Google Fonts in CRM, fallback in Call Center.

### Componenti UI
- Card: `background #fff, border-radius 12px, box-shadow 0 1px 4px rgba(0,0,0,.07)`
- Bottoni: `border-radius 8px, font-weight 700`
- Badge stato: pillola colorata (bg pastello + testo scuro)
- Header: sticky, `background #0d1b4b`, testo bianco
- Tutto in inline styles React (nessun file CSS separato)

### Comportamenti
- Toast notifications: verde (successo) o rosso (errore), centrate in basso, auto-dismiss 2.5-3s
- Call Center Calling view: animazione "ring" (pulse) sull'icona telefono mentre squilla
- Live timer: aggiornamento ogni secondo via `setInterval`
- Modal appuntamento: overlay scuro, card centrata, chiudibile con ✕ o "Annulla"

---

## 13. Funzioni Completate ✅

- [x] Login con username/password (master + agente)
- [x] CRM: dashboard con urgenze
- [x] CRM: lista clienti con 5 filtri + ricerca
- [x] CRM: dettaglio cliente (tutti i campi)
- [x] CRM: form aggiunta/modifica cliente
- [x] CRM: tab scadenze con semaforo
- [x] CRM: tab appuntamenti (legge da Sheets)
- [x] CRM: modal "Nuovo Appuntamento"
- [x] CRM: bottone "📞 Call Center" in header
- [x] Call Center: login autonomo con propria schermata
- [x] Call Center Manager: tab Live con timer real-time
- [x] Call Center Manager: tab Storico con filtri
- [x] Call Center Manager: tab Contatti
- [x] Call Center Manager: tab Import Excel (formato Atoka)
- [x] Call Center Manager: modal "Nuovo Appuntamento"
- [x] Call Center Agente: coda contatti ordinata
- [x] Call Center Agente: interfaccia chiamata (timer, muto, riattacca)
- [x] Call Center Agente: form esito con date/ora ricontatto
- [x] Salvataggio chiamate su Google Sheets
- [x] Salvataggio appuntamenti su Google Sheets
- [x] Creazione eventi Google Calendar
- [x] Polling live monitor (ogni 5s)
- [x] Service Worker (PWA offline)
- [x] Proxy registrazioni audio

---

## 14. Funzioni Parzialmente Completate ⚠️

- [ ] **Twilio VoIP**: funzioni backend complete, ma mancano le variabili `TWILIO_API_KEY`, `TWILIO_API_SECRET`, `TWILIO_TWIML_APP_SID` in Netlify → le chiamate browser non partono
- [ ] **Clienti CRM su Sheets**: la funzione `data.js` supporta già la tab `contacts`, ma `index.html` legge/scrive ancora in `localStorage` (`tim_crm_v2`) invece di fare fetch a `/api/data`
- [ ] **Recording playback**: `recording.js` è implementato, ma richiede Twilio configurato + che `recordingSid` sia presente nelle chiamate

---

## 15. Bug Conosciuti 🐛

1. **localStorage CRM**: se l'utente cambia browser o PC, i clienti del CRM scompaiono
2. **Concorrenza Sheets**: due write simultanee (raro ma possibile) possono sovrascriversi
3. **Sessione cross-tab**: in certi scenari il redirect agent → callcenter.html può non trovare la sessione se il browser blocca localStorage (DA VERIFICARE in produzione)
4. **Errori Sheets non dettagliati**: il frontend mostra solo il codice HTTP, non il messaggio dell'API
5. **active.json**: quando scritto come stringa `"null"` invece di valore null, il parsing frontend deve gestire entrambi i casi (DA VERIFICARE se gestito correttamente)

---

## 16. Modifiche Richieste Non Ancora Implementate 📋

### Priorità Alta
1. **Migrare clienti CRM da localStorage a Google Sheets** (`contacts` tab, già usato per i contatti call center — valutare se usare lo stesso array o separare in `crm_clients`)
2. **Completare setup Twilio**: guidare utente su creazione API Key + TwiML App su console Twilio
3. **Export Excel**: bottone per scaricare clienti/chiamate/appuntamenti in formato `.xlsx`

### Priorità Media
4. **Gestione errori migliorata**: mostrare il messaggio di errore Sheets/Calendar reale nel frontend
5. **Refresh automatico appuntamenti**: ora richiede click manuale su "Aggiorna"
6. **Validazione numero telefono**: normalizzare formato italiano prima di passare a Twilio

### Priorità Bassa
7. **Statistiche avanzate**: grafici settimanali/mensili chiamate e conversioni
8. **Notifiche push**: reminder per appuntamenti e richiami del giorno

---

## 17. Informazioni da Verificare nel Repository

Claude Code deve verificare direttamente nei file:

- [ ] `netlify.toml`: confermare che i redirect `/api/*` → `/.netlify/functions/:splat` siano presenti e corretti
- [ ] `netlify/functions/voice.js`: verificare che `action` e `recordingStatusCallback` puntino a URL corretti (`/.netlify/functions/call-ended` e `/.netlify/functions/recording-ready`)
- [ ] `index.html`: verificare che `getData('contacts')` e `setData('contacts', ...)` non siano ancora implementati (attuale: usa solo `localStorage`)
- [ ] `package.json` root: verificare versione di `googleapis` e se `@netlify/blobs` è ancora presente (potrebbe essere residuo)
- [ ] `_sheets.js`: verificare che `sheetsRead` restituisca stringa e non oggetto già parsato (rischio: googleapis potrebbe parsare il JSON automaticamente)
- [ ] Gestione valore `"null"` vs `null` per tab `active` in `data.js` e nel frontend

---

## 18. Variabili Ambiente Necessarie

```bash
# Autenticazione app
MASTER_USER=          # username dell'utente master
MASTER_PASSWORD=      # password dell'utente master
AGENT_USER=           # username dell'agente
AGENT_PASSWORD=       # password dell'agente

# Twilio VoIP
TWILIO_ACCOUNT_SID=   # Account SID (AC...)
TWILIO_AUTH_TOKEN=    # Auth Token
TWILIO_PHONE_NUMBER=  # Numero acquistato (+39...)
TWILIO_API_KEY=       # API Key (SK...) — DA CONFIGURARE
TWILIO_API_SECRET=    # API Secret — DA CONFIGURARE
TWILIO_TWIML_APP_SID= # TwiML Application SID (AP...) — DA CONFIGURARE

# Google
GOOGLE_SERVICE_ACCOUNT_KEY=  # Contenuto JSON completo del service account
GOOGLE_CALENDAR_ID=           # ID del calendario Google (es. abc@group.calendar.google.com)
GOOGLE_SPREADSHEET_ID=        # ID del Google Spreadsheet

# Netlify
URL=                  # URL pubblico del sito (https://nome.netlify.app)
```

### Scopes Google richiesti dal service account
- `https://www.googleapis.com/auth/spreadsheets` (lettura/scrittura Sheets)
- `https://www.googleapis.com/auth/calendar` (creazione eventi Calendar)

### Risorse Google da condividere con il service account (`client_email`)
- Il Google Spreadsheet "TIM Business CRM Data" → permesso **Editor**
- Il calendario Google target → permesso **"Apportare modifiche agli eventi"**

---

*Documento generato da Claude Sonnet 4.6 in data 2026-07-24. Basato sull'intera cronologia della conversazione di sviluppo.*
