export const fixtureDocumentationText = `
1 Einleitung
Das Projekt entwickelt eine interne Webanwendung zur Auswertung von IHK-Pruefberichten.

1.1 Projektumfeld
Der Ausbildungsbetrieb arbeitet mit manuellen Excel-Listen und dezentralen Dokumenten.

1.2 Projektziel
Ziel ist eine sichere Webanwendung mit Rollen, Uploads, Historie und automatisierter Auswertung.

2 Analysephase
Die Analyse beschreibt Ist-Zustand, Soll-Zustand, Stakeholder und fachliche Anforderungen.

2.1 Ist-Zustand
Berichte werden manuell abgelegt. Es gibt keine zentrale Datenanalyse.

2.2 Soll-Zustand
Die Anwendung soll Berichte strukturiert speichern, vergleichen und auswerten.

2.3 Anforderungsanalyse
Funktionale Anforderungen, nichtfunktionale Anforderungen, Datenschutz und Rollen werden beschrieben.

3 Entwurfsphase
Die Architektur nutzt Frontend, Backend, REST API und eine Datenbank.

3.1 Architekturdesign
Das System wird modular mit Client, Server und Persistenzschicht aufgebaut.

3.2 Datenmodell
Das Datenmodell beschreibt Benutzer, Pruefberichte, Fragenpools und Beziehungen mit Primaerschluesseln und Fremdschluesseln.

4 Implementierung
Die Umsetzung beschreibt Quellcode-Struktur, Module, Validierung und Fehlerbehandlung.

5 Qualitaetssicherung
Es werden Testfaelle, manuelle Tests, automatisierte Tests, Abnahme und Qualitaetssicherung dokumentiert.

6 Fazit
Der Soll-Ist-Vergleich bewertet Zielerreichung, Abweichungen und Ausblick.
`;

export const fixtureApplicationText = `
Projekttitel: Entwicklung eines DokuTools fuer IHK-Projektdokumentationen.
Ziel: Dokumentationen strukturiert pruefen, Berichte historisieren und Ergebnisse vergleichen.
Zeitplanung: Analyse 10 h, Entwurf 12 h, Implementierung 40 h, Test 12 h, Dokumentation 6 h.
Technologien: Node.js, React, TypeScript, Firestore, OpenAI API, Excel Export.
`;

export const fixtureDoc = {
  fileName: 'funktionstest-doku.txt',
  format: 'txt',
  fileSizeBytes: fixtureDocumentationText.length,
  bodyText: fixtureDocumentationText,
  text: fixtureDocumentationText,
  structure: {
    bodyImageCount: 1,
    tableCount: 1,
    pageFieldInFooter: true
  },
  images: [
    {
      fileName: 'uml-klassendiagramm.png',
      contentType: 'image/png',
      nearbyText: 'Abbildung 1 UML Klassendiagramm fuer Benutzer, Bericht und Fragenpool.'
    }
  ],
  warnings: []
};

export const fixtureApplicationDoc = {
  fileName: 'funktionstest-antrag.txt',
  format: 'txt',
  fileSizeBytes: fixtureApplicationText.length,
  bodyText: fixtureApplicationText,
  text: fixtureApplicationText,
  structure: {},
  images: [],
  warnings: []
};
