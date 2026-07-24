
---

## Google Calendar – Setup (5 minuti)

### A. Crea progetto Google Cloud
1. Vai su **console.cloud.google.com**
2. "Nuovo progetto" → chiama lo "TIM CRM"
3. Menu → "API e servizi" → "Libreria"
4. Cerca "Google Calendar API" → Abilita

### B. Crea Service Account
1. Menu → "API e servizi" → "Credenziali"
2. "Crea credenziali" → "Account di servizio"
3. Nome: "tim-crm-calendar" → Crea
4. Clicca sull'account creato → tab "Chiavi"
5. "Aggiungi chiave" → "JSON" → Scarica il file

### C. Condividi il tuo calendario
1. Apri **Google Calendar**
2. A sinistra, clicca i 3 puntini accanto al tuo calendario → "Impostazioni e condivisione"
3. Sezione "Condividi con persone specifiche" → Aggiungi l'email del service account (la trovi nel file JSON scaricato, campo `client_email`)
4. Permesso: "Apportare modifiche agli eventi"

### D. Aggiungi variabili su Netlify
| Variabile | Valore |
|---|---|
| GOOGLE_SERVICE_ACCOUNT_KEY | copia **tutto il contenuto** del file JSON scaricato |
| GOOGLE_CALENDAR_ID | `primary` (o l'ID del calendario specifico) |

### Come funziona
Quando la ragazza fissa un "Appuntamento" nel Call Center:
1. ✅ Viene salvato nel database condiviso
2. ✅ Appare automaticamente nella tab "🗓 Appuntamenti" del CRM
3. ✅ Viene creato un evento nel tuo Google Calendar con nome azienda, telefono e note
