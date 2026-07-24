# CLAUDE.md — TIM Business CRM + Call Center

## Descrizione rapida
Sistema web composto da due SPA React (no build step, Babel standalone):
- `/index.html` → CRM per clienti TIM Business (solo utente master)
- `/callcenter.html` → Call Center (master = manager, agente = operatrice)

Deploy su **Netlify**. Backend: **Netlify Functions v1** (Node.js, `exports.handler`).
Storage: **Google Sheets** (JSON in cella A1 per ogni tab).
VoIP: **Twilio** (Programmable Voice + Client SDK v1.13).
Calendario: **Google Calendar API** via Service Account.

---

## Stack tecnico
| Componente | Tecnologia |
|---|---|
| Frontend | React 18 (CDN), Babel Standalone, no bundler |
| Stile | Inline styles, nessun CSS framework |
| Backend | Netlify Functions v1 (`exports.handler`) |
| Storage | Google Sheets API v4 |
| VoIP | Twilio Client SDK v1.13 (CDN) + Programmable Voice |
| Calendario | Google Calendar API v3 |
| Excel import | SheetJS (xlsx, CDN) |
| Auth | Username/password via `/api/login`, sessione in localStorage |

---

## Struttura file
```
/
├── index.html              # CRM (React SPA)
├── callcenter.html         # Call Center (React SPA)
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (offline)
├── icon.svg
├── package.json            # Root deps: twilio, googleapis, @netlify/blobs (legacy)
├── netlify.toml            # Build config + redirects
└── netlify/functions/
    ├── _sheets.js          # Helper Google Sheets (sheetsRead/sheetsWrite)
    ├── login.js            # POST /api/login → verifica credenziali
    ├── token.js            # GET  /api/token → Twilio Access Token
    ├── voice.js            # POST /api/voice → TwiML webhook Twilio
    ├── data.js             # GET/POST /api/data → CRUD Google Sheets
    ├── appointment.js      # POST /api/appointment → salva + Google Calendar
    ├── call-ended.js       # POST /api/call-ended → aggiorna durata chiamata
    ├── recording-ready.js  # POST /api/recording-ready → aggiorna SID registrazione
    └── recording.js        # GET  /api/recording → proxy audio Twilio
```

---

## Autenticazione
- Sessione salvata in `localStorage` con chiave `tim_session` come `{role, name}`
- `role` può essere `'master'` o `'agent'`
- `index.html`: se role=agent → redirect a `/callcenter.html`; se role=master → mostra CRM
- `callcenter.html`: se role=master → Manager view; se role=agent → Agent view; se no sessione → Login screen
- Logout: cancella localStorage e mostra login

---

## Google Sheets — struttura dati
Un singolo foglio Google con 4 tab. Ogni tab ha il JSON in **cella A1**:

| Tab | Contenuto | Tipo |
|---|---|---|
| `contacts` | Array di oggetti contatto | `Contact[]` |
| `calls` | Array di oggetti chiamata | `Call[]` |
| `appointments` | Array di oggetti appuntamento | `Appointment[]` |
| `active` | Oggetto chiamata live (o `null`) | `ActiveCall \| null` |

Helper: `sheetsRead(tabName)` → stringa JSON o null; `sheetsWrite(tabName, jsonString)` → void.

---

## API endpoints
| Endpoint | Funzione | Note |
|---|---|---|
| POST /api/login | login.js | body: `{username, password}` → `{ok, role, name}` |
| GET /api/token | token.js | → `{token}` Twilio JWT |
| POST /api/voice | voice.js | TwiML webhook, body URLencoded da Twilio |
| GET /api/data?type=X | data.js | legge tab X da Sheets |
| POST /api/data | data.js | body: `{type, data}` → scrive tab X |
| POST /api/appointment | appointment.js | body: `{company,contactName,phone,date,time,notes}` |
| POST /api/call-ended | call-ended.js | webhook Twilio URLencoded |
| POST /api/recording-ready | recording-ready.js | webhook Twilio URLencoded |
| GET /api/recording?sid=X | recording.js | proxy audio MP3 da Twilio |

---

## Variabili ambiente Netlify (nomi, senza valori)
```
MASTER_USER          # username master
MASTER_PASSWORD      # password master
AGENT_USER           # username agente
AGENT_PASSWORD       # password agente
TWILIO_ACCOUNT_SID   # AC...
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER  # +39...
TWILIO_API_KEY       # SK... (DA CONFIGURARE)
TWILIO_API_SECRET    # (DA CONFIGURARE)
TWILIO_TWIML_APP_SID # AP... (DA CONFIGURARE)
GOOGLE_SERVICE_ACCOUNT_KEY  # JSON completo del service account
GOOGLE_CALENDAR_ID   # ID calendario Google
GOOGLE_SPREADSHEET_ID       # ID foglio Google Sheets
URL                  # https://nome-sito.netlify.app
```

---

## Cosa funziona ✅
- Login con username/password (master + agente)
- CRM: dashboard, lista clienti, filtri, scadenze, form aggiunta/modifica
- Call Center Manager: live monitor, storico, import Excel (Atoka), contatti
- Call Center Agent: coda contatti, form esito chiamata
- Salvataggio dati su Google Sheets
- Appuntamenti su Google Calendar
- Tab Appuntamenti nel CRM (legge da Sheets)
- Modal "Nuovo Appuntamento" in CRM e Call Center Manager
- Import Excel con auto-mapping colonne Atoka

## Cosa NON funziona / incompleto ⚠️
- **Twilio non completamente configurato**: mancano API Key, API Secret, TwiML App SID → le chiamate browser non partono
- **Clienti CRM salvati in localStorage**: se si cambia browser/PC i dati si perdono → DA MIGRARE su Sheets tab `contacts`
- **Bottone "← CRM"** in callcenter.html: a volte non ricarica la sessione correttamente (DA VERIFICARE)
- **Export Excel**: non implementato
- **Registrazioni audio**: funzionano solo se Twilio è configurato

## Bug conosciuti
- La sessione condivisa via localStorage può creare loop di redirect in certi browser/contesti (risolto in v10+ ma DA VERIFICARE in produzione)
- Se Google Sheets API restituisce errore, il frontend mostra solo il codice HTTP senza dettaglio

## Prossime modifiche richieste
1. Migrare clienti CRM da localStorage a Google Sheets (tab `contacts`)
2. Aggiungere export Excel per clienti e chiamate
3. Completare setup Twilio (guidare utente su API Key + TwiML App)
4. Verificare e testare flusso completo chiamata → esito → Google Calendar
