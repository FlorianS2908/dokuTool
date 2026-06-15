# IHK DokuTool

Lokales Web-Tool zur Vorprüfung einer IHK-Projektdokumentation gegen formale und inhaltliche Kriterien. Das Tool kombiniert regelbasierte Prüfung mit optionaler OpenAI-KI-Zusatzprüfung.

## Was das Tool prüft

- Inhaltsverzeichnis vorhanden und plausibel vollständig
- Abbildungsverzeichnis, wenn Abbildungen genutzt werden
- Tabellenverzeichnis, wenn Tabellen genutzt werden
- Abkürzungsverzeichnis
- Fremdwortverzeichnis / Glossar
- Literatur- oder Quellenverzeichnis
- Listingverzeichnis, wenn Code/Listings genutzt werden
- Anhangsverzeichnis, wenn Anhänge genutzt werden
- Deckblatt mit Name, Firma/Betrieb, Projekttitel, Ausbilder und Projektbetreuer
- Kopfzeile mit Projekttitel und Firmenlogo
- Fußzeile mit Seitenzahl und Name des Dokumentationserstellers
- UML-Diagramme in Analyse, Planung, Entwurf und Implementierung
- Testphase / Qualitätssicherung
- Soll-/Ist-Vergleich
- Fazit
- Projektantrag ↔ Dokumentation-Abgleich, wenn der Antrag hochgeladen wird

## Wichtige Einschränkung

Für die beste Formatprüfung bitte die Word-Datei als `.docx` hochladen. PDF wird unterstützt, aber Kopf-/Fußzeilen, Logo, Schriftart, Zeilenabstand und Seitenränder sind in PDF nur eingeschränkt bzw. heuristisch prüfbar.

## Installation unter Windows

### 1. Node.js installieren

Installiere Node.js LTS, mindestens Version 20.

Prüfen in PowerShell oder Eingabeaufforderung:

```bash
node -v
npm -v
```

Wenn beide Befehle eine Versionsnummer ausgeben, ist Node.js korrekt installiert.

### 2. ZIP entpacken

Entpacke `florian-ai-tool.zip`, zum Beispiel nach:

```text
C:\Users\DEIN_NAME\Desktop\ihk-dokutool
```

Öffne danach den entpackten Ordner in PowerShell oder CMD.

### 3. Abhängigkeiten installieren

Im Projektordner ausführen:

```bash
npm install
```

Dabei werden Express, OpenAI SDK, DOCX/PDF-Parser und Excel-Export installiert.

### 4. `.env` anlegen

Kopiere die Datei `.env.example` und benenne die Kopie in `.env` um.

Inhalt der `.env`:

```env
OPENAI_API_KEY=dein_api_key_hier
OPENAI_MODEL=gpt-5.5
PORT=8080
MAX_OUTPUT_TOKENS=1800
UPLOAD_LIMIT_MB=30
```

Der API-Key ist nur für die KI-Zusatzprüfung und den Chat nötig. Die regelbasierte Doku-Prüfung funktioniert auch ohne gültigen Key, dann aber ohne semantische KI-Bewertung.

### 5. Tool starten

```bash
npm start
```

Danach im Browser öffnen:

```text
http://localhost:8080
```

Alternativ kannst du unter Windows die Datei `start-windows.bat` doppelklicken. Beim ersten Start muss trotzdem vorher `npm install` ausgeführt worden sein.

## Benutzung

1. Reiter **Doku-Prüfung** öffnen.
2. Projektdokumentation hochladen, am besten als `.docx`.
3. Optional den Projektantrag hochladen.
4. Projekttitel, Ersteller und Firma eintragen. Diese Angaben helfen bei der Prüfung von Deckblatt, Kopfzeile und Fußzeile.
5. Optional KI-Zusatzprüfung aktiv lassen, wenn ein API-Key hinterlegt ist.
6. **Prüfung starten** klicken.
7. Bericht im Browser prüfen.
8. Über **Excel-Bericht** einen `.xlsx`-Prüfbericht herunterladen.

## Ergebnisstatus

| Status | Bedeutung |
| ------ | --------- |
| Grün | vorhanden und plausibel |
| Gelb | vorhanden, aber unvollständig oder unklar |
| Rot | fehlt oder passt nicht |
| Grau | nicht sicher automatisch prüfbar |

## Projektstruktur

```text
florian-ai-tool/
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── server.js
├── package.json
├── .env.example
├── start-windows.bat
├── Dockerfile
└── README.md
```

## Technische Hinweise

- Backend: Node.js + Express
- Datei-Parsing: Mammoth für DOCX, pdf-parse für PDF, JSZip für DOCX-Struktur
- Excel-Export: ExcelJS
- KI-Anbindung: OpenAI Responses API über das OpenAI SDK
- API-Key bleibt im Backend und wird nicht im Browser gespeichert

## Docker optional

```bash
docker build -t ihk-dokutool .
docker run --env-file .env -p 3000:3000 ihk-dokutool
```

Dann öffnen:

```text
http://localhost:8080
```
