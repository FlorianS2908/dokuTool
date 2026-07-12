# IHK DokuTool

Lokales Web-Tool zur Vorpruefung einer IHK-Projektdokumentation gegen formale und inhaltliche Kriterien. Das Tool kombiniert regelbasierte Pruefung mit optionaler OpenAI-KI-Zusatzpruefung, Benutzerkonten, Profilen und Bericht-History.

## Pruefmodi

Das Tool trennt drei Pruefebenen:

- Regelbasierte Pruefung: laeuft lokal und nutzt die hinterlegten Rulesets ohne API-Kosten.
- Einfache KI-Zusatzpruefung: prueft semantische Punkte ergaenzend mit OpenAI, wenn ein API-Key vorhanden ist.
- Multi-KI-Konsenspruefung: vorbereitetes Konsensverfahren mit Primary Reviewer, Counter Reviewer, Revision, Konflikterkennung und Arbiter. Dieser Modus benoetigt mehr Zeit und verursacht mehr API-Kosten.

Die KI bewertet nicht frei. Jede KI-Bewertung muss an eine Regel-ID, Fundstelle, Begruendung und Empfehlung gebunden sein. Die KI generiert keine fertige IHK-Dokumentation, sondern prueft, erklaert und nennt konkrete To-dos.

Wichtig: Das Tool ist eine automatische Vorpruefung und keine rechtsverbindliche Bewertung durch IHK oder Pruefungsausschuss.

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

## Rulesets

Die fachliche Bewertungsbasis liegt unter `rulesets/`.

- `rulesets/Ruleset.txt`: fachliche Quelle fuer das aktuelle FIAE-Ruleset.
- `rulesets/fiae_ruleset_v2.json`: maschinenlesbare strukturierte Version mit Regel-ID, Kategorie, Phase, Schweregrad, Evidenzanforderungen, Statuslogik, Wording-Aliases und bedingter Gueltigkeit.
- `rulesets/ihk_abschlussprojekt_ruleset_v1.json`: bestehendes Abschlussprojekt-Ruleset.
- `rulesets/kosten_ressourcen_rules_v3.json`: erweiterte Kosten-/Ressourcen- und Gemeinkostenregeln.

Validierung:

```bash
npm run validate:rulesets
npm run test:review
```

## Lokale Referenzbibliothek

Das Tool kann private lokale Fachbuch-Referenzen als Metadatenbasis verwenden. Die Buchdateien selbst werden lokal unter `.data/references/books/` gespeichert und nicht nach GitHub uebertragen.

Unterstuetzte Formate:

- PDF
- EPUB

Neue Buecher hinzufuegen:

```bash
npm run references:import -- "PFAD_ZUM_BUCH"
```

Oder bereits abgelegte Dateien scannen:

```bash
npm run references:scan
```

Validierung:

```bash
npm run validate:references
```

Aktuell verwendet das Tool nur sichere Metadaten, Themen und Regelzuordnungen. Es speichert keine Buchtexte im Repository und gibt ueber die API keine Buchinhalte aus. Eine spaetere Ausbaustufe kann lokale Volltextindexierung, kurze Fundstellen und KI-Kontext vorbereiten, ohne Buchdateien oder lange Auszuege zu veroeffentlichen.

Rechtlicher Hinweis: Nur Buecher verwenden, fuer die du Nutzungsrechte besitzt. Keine Buchdateien und keine langen Auszuege veroeffentlichen.

## KI-Konfiguration

Das Tool unterstuetzt eine sichere Key-Reihenfolge:

1. Benutzer-Key aus dem Profil, wenn vorhanden und aktiv
2. `DEFAULT_OPENAI_API_KEY_FILE`, wenn gesetzt und lesbar
3. `API_KEY_DOKU_TOOL`, wenn gesetzt
4. `OPENAI_API_KEY`, wenn gesetzt
5. Keine KI verfuegbar

Standard-Key lokal per `.env` konfigurieren:

```env
PORT=8080
OPENAI_MODEL=gpt-5.5
AI_KEY_ENCRYPTION_SECRET=ein_langes_zufaelliges_secret

# Variante A:
OPENAI_API_KEY=dein_standard_key

# Variante B:
API_KEY_DOKU_TOOL=dein_standard_key

# Variante C:
DEFAULT_OPENAI_API_KEY_FILE=C:\Users\Florian.Schaffer\OneDrive - Amadeus Fire AG\Desktop\api_key_ContentFactory - Kopie.txt
```

Benutzer koennen im Profil/Setup einen eigenen OpenAI API-Key per Copy/Paste speichern. Dieser Key wird lokal verschluesselt gespeichert und nie vollstaendig an den Browser zurueckgegeben. Im Frontend wird nur eine Maske wie `sk-...abcd` angezeigt.

Wenn ein User-Key aktiv ist, hat er Vorrang vor dem Standard-Key. Wird er geloescht, nutzt das Tool wieder den lokal konfigurierten Standard-Key, falls vorhanden.

Sicherheit:

- `.env` nicht committen.
- `.data` nicht committen.
- API-Keys niemals in GitHub speichern.
- Fuer stabile Verschluesselung `AI_KEY_ENCRYPTION_SECRET` setzen.
- Reports, JSON-Exports und Excel-Exports enthalten keine API-Keys.

## Prompt-Assistent

Der Prompt-Assistent hilft, nach dem Upload einer Projektdokumentation gezielte KI-Prompts zu bauen, ohne dass der Nutzer Regel-IDs kennen muss.

Der Ablauf:

1. Die Doku wird strukturell ausgewertet.
2. Inhaltsverzeichnis, Kapitel und Unterkapitel werden heuristisch erkannt.
3. Kapitel werden mit passenden Regeln aus `fiae_ruleset_v2.json` verbunden.
4. Die Regeln werden in einfache Sprache uebersetzt.
5. Der Nutzer waehlt Kapitel, Regeln und Aufgabe aus.
6. Das Tool erzeugt daraus einen kompakten Prompt mit Kapitelbezug, Regelbezug, Fundstellen und Statuslogik.

Der Prompt-Assistent sendet keine komplette Doku blind an die KI. Prompts enthalten nur relevante Regeln, kurze Kapitelauszuege, Fundstellen und Referenzmetadaten. Der Assistent dient zum Pruefen und Nacharbeiten; er erstellt keine fertige IHK-Projektdokumentation.

Wenn ein API-Key verfuegbar ist, kann der erzeugte Prompt direkt ausgefuehrt werden. Ohne API-Key kann der Prompt weiterhin erzeugt und kopiert werden.

## Auswertung und Audit-Report

Nach einer Analyse erscheint im DokuTool der Tab **Auswertung**. Dieser Bereich zeigt transparent, was das Tool bei der Pruefung gemacht hat:

- erkannte Kapitel, Ueberschriften und Unterkapitel
- Kapitel-/Regel-Zuordnungen inklusive Confidence
- kurze Fundstellen und deren Qualitaet
- Ampelstatus pro Regel
- Referenzzuordnungen als Metadaten
- erzeugte Prompt-Kontexte
- KI-Reviews, Konsensdaten und Konflikte
- interne Testberichte

Der Audit-Report dient zur Qualitaetssicherung und Nachvollziehbarkeit. Er speichert keine API-Keys, keine Buchtexte und keine vollstaendige Projektdokumentation. Fundstellen werden nur als kurze Auszuege und Metadaten abgelegt.

Der Excel-Bericht enthaelt zusaetzliche Audit-Blaetter:

- `Audit Übersicht`
- `Analyse Schritte`
- `Kapitel Regel Matrix`
- `Prompt Kontexte`
- `KI Review Audit`
- `Funktionstests`, wenn ein Funktionstestbericht vorhanden ist

Validierung:

```bash
npm run test:audit-report
```

## Funktionstests

Die Funktionstests pruefen reale Tool-Ablaeufe statt nur einzelne Hilfsfunktionen. Geprueft werden Ruleset, Referenzen, Dokument-Outline, Kapitel-/Regel-Matrix, Prompt-Assistent, KI-Konfigurationsfallback, Multi-KI-Fallback, Audit-Report, Excel-Export und Timer-Quiz-Bundle.

Ausfuehrung per CLI:

```bash
npm run test:functional
```

Im Tab **Auswertung** koennen die Funktionstests auch direkt in der UI ausgefuehrt werden. Der Testbericht zeigt Erwartung, Ergebnis, Status, Dauer, Details und Empfehlung je Test. KI-Tests sind optional. Wenn kein effektiver API-Key vorhanden ist, wird der KI-Verbindungstest uebersprungen statt die Tests abbrechen zu lassen.

## Multi-KI-Konsenspruefung

Die Multi-KI-Pruefung nutzt das FIAE-Ruleset pro Regel als verbindlichen Kontext. Fuer kritische rote, gelbe oder hoch priorisierte Regeln wird ein kompakter Review-Kontext gebaut: Regel, Statuslogik, Basisergebnis, kurze Fundstellen, optionale Antrag-Auszuege und Referenzmetadaten.

Der Ablauf:

1. Primary Reviewer bewertet die Regel anhand der gelieferten Fundstellen.
2. Counter Reviewer prueft kritisch gegen.
3. Bei mittleren oder hohen Konflikten folgt eine Revision.
4. Bei offenen Konflikten entscheidet ein Arbiter vorsichtig oder fordert manuelle Pruefung.

Die KI darf keine Fundstellen erfinden und keine fertige Projektdokumentation schreiben. Wenn kein API-Key vorhanden ist oder eine KI-Antwort nicht valide als JSON auswertbar ist, erzeugt das Tool einen grauen Fallback mit manueller Pruefung, statt die Analyse abzubrechen.

Steuerung per `.env`:

```env
MULTI_AI_MAX_RULES=12
MULTI_AI_MAX_ROUNDS=3
```

## Datenschutz und lokale Verarbeitung

- API-Keys werden nie ins Repository geschrieben.
- User-Keys werden lokal verschluesselt gespeichert.
- `.env`, `.data`, Buchdateien und Secrets sind von Git ausgeschlossen.
- PDF-/EPUB-Buchdateien bleiben lokal unter `.data/references/books/`.
- Referenzen in Berichten enthalten nur Titel und Themen, keine Buchtexte.
- Prompts enthalten nur kurze Kapitel- und Fundstellenauszuege, nicht blind die komplette Doku.
- Das Tool ist eine Vorpruefung und keine verbindliche Bewertung durch IHK oder Pruefungsausschuss.

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
PORT=8080
OPENAI_MODEL=gpt-5.5
AI_KEY_ENCRYPTION_SECRET=ein_langes_zufaelliges_secret
OPENAI_API_KEY=dein_standard_key
MAX_OUTPUT_TOKENS=1800
UPLOAD_LIMIT_MB=30
```

Ein Standard-Key ist fuer KI-Zusatzpruefung und Chat noetig, wenn kein Benutzer-Key hinterlegt wurde. Die regelbasierte Doku-Pruefung funktioniert auch ohne gueltigen Key.

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
6. KI-Pruefmodus waehlen: deaktiviert, einfache KI-Zusatzpruefung oder Multi-KI-Konsenspruefung.
7. **Pruefung starten** klicken.
8. Bericht im Browser pruefen. Der Bericht wird automatisch in der History des eingeloggten Nutzers gespeichert.
9. Im Reiter **Auswertung** Audit-Timeline, Kapitel-/Regel-Matrix, Prompt-Kontexte und Funktionstests nachvollziehen.
10. Ueber **Excel-Bericht** einen `.xlsx`-Pruefbericht herunterladen.

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
- Multi-KI-Review: vorbereitet unter `src/server/review/`

## Docker optional

```bash
docker build -t ihk-dokutool .
docker run --env-file .env -p 8080:8080 ihk-dokutool
```

Dann oeffnen:

```text
http://localhost:8080
```
