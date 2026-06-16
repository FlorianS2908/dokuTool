# IHK DokuTool

Lokales Web-Tool zur Vorpruefung einer IHK-Projektdokumentation gegen formale und inhaltliche Kriterien. Das Tool kombiniert regelbasierte Pruefung mit optionaler OpenAI-KI-Zusatzpruefung, Benutzerkonten, Profilen und Bericht-History.

## Was das Tool prueft

- Inhaltsverzeichnis vorhanden und plausibel vollstaendig
- Abbildungsverzeichnis, wenn Abbildungen genutzt werden
- Tabellenverzeichnis, wenn Tabellen genutzt werden
- Abkuerzungsverzeichnis
- Fremdwortverzeichnis / Glossar
- Literatur- oder Quellenverzeichnis
- Listingverzeichnis, wenn Code/Listings genutzt werden
- Anhangsverzeichnis, wenn Anhaenge genutzt werden
- Deckblatt mit Name, Firma/Betrieb, Projekttitel, Ausbilder und Projektbetreuer
- Kopfzeile mit Projekttitel und Firmenlogo
- Fusszeile mit Seitenzahl und Name des Dokumentationserstellers
- UML-Diagramme in Analyse, Planung, Entwurf und Implementierung
- Testphase / Qualitaetssicherung
- Soll-/Ist-Vergleich
- Fazit
- Projektantrag -> Dokumentation-Abgleich, wenn der Antrag hochgeladen wird

## Installation unter Windows

### 1. Node.js installieren

Installiere Node.js LTS, mindestens Version 20.

```bash
node -v
npm -v
```

### 2. Abhaengigkeiten installieren

Im Projektordner ausfuehren:

```bash
npm install
```

### 3. Lokale `.env` anlegen

Lege im Projektordner eine lokale Datei `.env` an. Diese Datei darf nicht nach GitHub hochgeladen werden.

Minimaler Inhalt:

```env
OPENAI_API_KEY=dein_api_key_hier
OPENAI_MODEL=gpt-5.5
PORT=8080
MAX_OUTPUT_TOKENS=1800
UPLOAD_LIMIT_MB=30
```

Der API-Key ist fuer KI-Zusatzpruefung und Chat noetig. Die regelbasierte Doku-Pruefung funktioniert auch ohne gueltigen Key.

## Auth, Profile und Firestore

Benutzer koennen sich mit E-Mail und Passwort registrieren. Passwoerter werden serverseitig gehasht gespeichert. Zu jedem Benutzer gibt es ein Profil mit Anzeigenamen, Profilfoto und Bericht-History.

Ohne Firestore-Konfiguration nutzt das Tool lokal `.data/store.json`. Fuer Firestore werden spaeter diese Variablen in `.env` ergaenzt:

```env
FIRESTORE_ENABLED=true
FIRESTORE_PROJECT_ID=dein-firebase-projekt
FIREBASE_SERVICE_ACCOUNT_BASE64=base64-service-account-json
AUTH_SESSION_SECRET=langes-zufaelliges-secret
PROFILE_PHOTO_LIMIT_MB=0.5
```

Die Firestore-Struktur ist vorbereitet:

- `users/{userId}` fuer Profil, Login-Daten und Profilfoto
- `users/{userId}/reports/{reportId}` fuer gespeicherte Pruefberichte

## Tool starten

```bash
npm start
```

Danach im Browser oeffnen:

```text
http://localhost:8080
```

Alternativ unter Windows `start-windows.bat` doppelklicken.

## Benutzung

1. Registrieren oder einloggen.
2. Reiter **Doku-Pruefung** oeffnen.
3. Projektdokumentation hochladen, am besten als `.docx`.
4. Optional den Projektantrag hochladen.
5. Projekttitel, Ersteller und Firma eintragen.
6. Optional KI-Zusatzpruefung aktiv lassen, wenn ein API-Key hinterlegt ist.
7. **Pruefung starten** klicken.
8. Bericht im Browser pruefen. Der Bericht wird automatisch in der History des eingeloggten Nutzers gespeichert.
9. Ueber **Excel-Bericht** einen `.xlsx`-Pruefbericht herunterladen.

## Ergebnisstatus

| Status | Bedeutung |
| ------ | --------- |
| Gruen | vorhanden und plausibel |
| Gelb | vorhanden, aber unvollstaendig oder unklar |
| Rot | fehlt oder passt nicht |
| Grau | nicht sicher automatisch pruefbar |

## Projektstruktur

```text
florian-ai-tool/
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── data-store.js
├── server.js
├── package.json
├── start-windows.bat
├── Dockerfile
└── README.md
```

## Technische Hinweise

- Backend: Node.js + Express
- Auth: HttpOnly Session-Cookie, PBKDF2 Passwort-Hashing
- Datenhaltung: lokaler JSON-Store oder Firestore via `firebase-admin`
- Datei-Parsing: Mammoth fuer DOCX, pdf-parse fuer PDF, JSZip fuer DOCX-Struktur
- Excel-Export: ExcelJS
- KI-Anbindung: OpenAI Responses API ueber das OpenAI SDK
- API-Key bleibt im Backend und wird nicht im Browser gespeichert

## Docker optional

```bash
docker build -t ihk-dokutool .
docker run --env-file .env -p 8080:8080 ihk-dokutool
```

Dann oeffnen:

```text
http://localhost:8080
```
