# voip-bridge

Servizio Node.js che collega Asterisk (AMI) al backend esistente del CRM (`/api/data` su Netlify) e serve le registrazioni delle chiamate via HTTPS. Gira **sul VPS**, non su Netlify — non fa parte del deploy del sito.

Nessuna dipendenza esterna: usa solo moduli nativi di Node (`net`, `https`, `fs`).

## Cosa fa

- **`ami-listener.js`**: si collega ad Asterisk (AMI, solo `127.0.0.1`) e resta in ascolto di due eventi:
  - `Hangup` → azzera `active` sul CRM (stesso comportamento difensivo del vecchio `call-ended.js` di Twilio)
  - `UserEvent` con nome `RecordingReady` (emesso dal dialplan a fine chiamata, vedi sotto) → aggiorna l'entry corrispondente in `calls` con `recordingSid`/`recordingDuration`
- **`recording-server.js`**: espone `GET /recordings/:id` in HTTPS, protetto da un token (`Authorization: Bearer <secret>`), che serve il file `.wav` registrato da Asterisk (`MixMonitor`)

## Variabili d'ambiente richieste

| Nome | Descrizione |
|---|---|
| `AMI_PORT` | Porta AMI di Asterisk (default `5038`) |
| `AMI_USER` | Utente AMI a permessi minimi (creato in FreePBX) |
| `AMI_PASSWORD` | Password dell'utente AMI |
| `CRM_API_BASE` | URL base del sito Netlify (es. `https://crm-tim.netlify.app`) |
| `MONITOR_DIR` | Cartella registrazioni Asterisk (default `/var/spool/asterisk/monitor`) |
| `RECORDING_SECRET` | Token segreto condiviso con la function Netlify `recording.js` |
| `RECORDING_PORT` | Porta HTTPS del recording server (default `8443`) |
| `CERT_PATH` / `KEY_PATH` | Percorsi del certificato/chiave TLS (Let's Encrypt) |

Per test in locale: crea un file `.env` in questa cartella con `CHIAVE=valore` per riga — viene caricato automaticamente da `env.js`. **Non committare mai `.env`** (già escluso in `.gitignore`).

## Avvio manuale (test)

```bash
node index.js
```

## Deploy come servizio (systemd)

Crea `/etc/systemd/system/voip-bridge.service` sul VPS:

```ini
[Unit]
Description=VoIP Bridge (Asterisk AMI -> CRM)
After=network.target asterisk.service

[Service]
Type=simple
User=<utente-non-root>
WorkingDirectory=/opt/voip-bridge
EnvironmentFile=/opt/voip-bridge/.env
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Poi:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now voip-bridge
sudo systemctl status voip-bridge
sudo journalctl -u voip-bridge -f   # log in tempo reale
sudo systemctl restart voip-bridge  # dopo una modifica
```

## Dialplan richiesto (Asterisk, `extensions_custom.conf`)

Perché `ami-listener.js` riceva `CallId` e `Duration`, il dialplan deve:
1. Leggere l'header SIP `X-Call-Id` inviato dal browser (JsSIP `extraHeaders`) in una variabile di canale
2. Nominare il file `MixMonitor` con quell'id (es. `MixMonitor(${CALLID}.wav)`)
3. Alla fine della chiamata (hangup handler), emettere: `UserEvent(RecordingReady,CallId: ${CALLID},Duration: ${CDR(billsec)})`

Questa parte verrà scritta durante la configurazione del VPS (Fase 4-5 del piano), quando Asterisk/FreePBX saranno effettivamente installati.
