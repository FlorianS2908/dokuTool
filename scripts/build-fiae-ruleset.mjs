import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rulesetTargetPath = resolve(root, 'rulesets', 'Ruleset.txt');
const jsonTargetPath = resolve(root, 'rulesets', 'fiae_ruleset_v2.json');
const rulesetSourcePath = existsSync(rulesetTargetPath) ? rulesetTargetPath : resolve(root, 'ruleSet.txt');

const sourceText = readFileSync(rulesetSourcePath, 'utf8').replace(/\r\n/g, '\n').trimEnd();

function slugWords(title) {
  return title
    .toLowerCase()
    .replace(/[ä]/g, 'ae')
    .replace(/[ö]/g, 'oe')
    .replace(/[ü]/g, 'ue')
    .replace(/[ß]/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 8);
}

function baseIndicators(title, aliases = []) {
  return [...new Set([...slugWords(title), ...aliases].filter(Boolean))];
}

function referenceTopicsForRule({ id = '', title = '', category = '', phaseKey = '' }) {
  const text = `${id} ${title} ${category} ${phaseKey}`.toLowerCase();
  const topics = new Set();
  if (id.startsWith('UML') || /uml|diagramm|klassendiagramm|sequenzdiagramm|aktivitaetsdiagramm|aktivitätsdiagramm/.test(text)) topics.add('UML');
  if (id.startsWith('DM') || /datenmodell|datenbank|normalisierung|primaer|primär|fremdschluessel|fremdschlüssel|sql|er-modell/.test(text)) {
    topics.add('Datenbanken');
    topics.add('ER-Modell');
    topics.add('Normalisierung');
  }
  if (id.startsWith('SD') || /schnittstelle|api|rest|endpoint|request|response|json|http/.test(text)) {
    topics.add('REST-API');
    topics.add('Webentwicklung');
    topics.add('Datenformate');
  }
  if (id.startsWith('GL') || /geschaeftslogik|geschäftslogik|fachlogik|datenstruktur|algorithmus/.test(text)) {
    topics.add('Software-Engineering');
    topics.add('Python');
    topics.add('Datenstrukturen');
  }
  if (id.startsWith('QM') || /test|qualitaet|qualität|deployment|quellcodeanalyse/.test(text)) {
    topics.add('Unit-Tests');
    topics.add('Tests');
    topics.add('Software-Engineering');
  }
  if (/sicherheit|datenschutz|authentifizierung|autorisierung|rollen|rechte|verschluesselung|verschlüsselung/.test(text)) {
    topics.add('IT-Sicherheit');
    topics.add('Datenschutz');
  }
  if (id.startsWith('EP') || id.startsWith('AD') || id.startsWith('IM') || id.startsWith('DOK')) topics.add('Software-Engineering');
  return [...topics];
}

function rule({
  id,
  title,
  category,
  phase,
  phaseKey,
  severity = 'MAJOR',
  evidence = [],
  positive = [],
  negative = [],
  aliases = [],
  applies = { always: true, when: [] },
  manual = false,
  recommendation
}) {
  const requiredEvidence = evidence.length
    ? evidence
    : [`Fundstelle oder Abschnitt zu "${title}"`, 'kurze fachliche Einordnung im Fliesstext'];

  const createdRule = {
    id,
    title,
    category,
    phase,
    phaseKey,
    severity,
    applies,
    description: `Prueft, ob "${title}" fachlich und formal nachvollziehbar in der Projektdokumentation behandelt wird.`,
    purpose: `Die Regel stellt sicher, dass der Pruefungsausschuss "${title}" ohne Raten aus Dokumentation, Projektkontext und Fundstellen ableiten kann.`,
    requiredEvidence,
    positiveIndicators: baseIndicators(title, [...positive, ...aliases]),
    negativeIndicators: negative.length
      ? negative
      : ['fehlt', 'nur als Tabellenueberschrift ohne Erlaeuterung', 'kein Projektbezug', 'unklare oder widerspruechliche Aussage'],
    statusRules: {
      gruen: 'Eindeutig vorhanden, passende Fundstelle vorhanden und inhaltlich plausibel.',
      gelb: 'Vorhanden, aber unvollstaendig, schwach belegt oder nur indirekt erkennbar.',
      rot: 'Fehlt trotz Relevanz oder widerspricht dem Projektkontext.',
      grau: 'Nicht sicher automatisch pruefbar oder sinnvoll nur manuell bewertbar.'
    },
    recommendation: recommendation || `${title} mit konkretem Projektbezug, Fundstelle und nachvollziehbarer Begruendung ergaenzen oder schaerfen.`,
    wordingAliases: aliases,
    requiresManualReview: manual
  };
  const referenceTopics = referenceTopicsForRule(createdRule);
  if (referenceTopics.length) createdRule.referenceTopics = referenceTopics;
  return createdRule;
}

function numberedRules(prefix, titles, category, phase, phaseKey, severity = 'MAJOR', defaults = {}) {
  return titles.map((title, index) => rule({
    id: `${prefix}-${String(index + 1).padStart(2, '0')}`,
    title,
    category,
    phase,
    phaseKey,
    severity,
    ...defaults
  }));
}

const rules = [
  ...numberedRules('FG', [
    'Digitale Verlinkung aller Verzeichnisse pruefen',
    'Inhaltsverzeichnis pruefen',
    'Abbildungsverzeichnis pruefen',
    'Tabellenverzeichnis pruefen',
    'Listing- oder Quellcodeverzeichnis pruefen',
    'Abkuerzungsverzeichnis pruefen',
    'Fremdwortverzeichnis oder Glossar pruefen',
    'Literatur- oder Quellenverzeichnis pruefen',
    'Anhangsverzeichnis pruefen',
    'Konsistenz alternativer Verzeichnisbezeichnungen pruefen',
    'Deckblatt mit Pruefling, Betrieb, Projekttitel, Ausbilder und Projektbetreuer pruefen',
    'Kopfzeile mit Projekttitel und Firmenlogo pruefen',
    'Fusszeile mit Seitenzahl und Name des Dokumentationserstellers pruefen',
    'Seitenzaehlung und Seitenverweise pruefen',
    'Verweise aus dem Fliesstext auf Abbildungen, Tabellen, Listings und Anhang pruefen',
    'Formale Konsistenz der Bezeichnungen pruefen',
    'Abweichendes Wording inhaltlich statt rein wortgleich bewerten',
    'Deckblatt- und Metadatenkonsistenz pruefen',
    'Fremdinhalte und Quellenkennzeichnung formal pruefen',
    'Formale Gesamtpruefung auf IHK-Abgabereife'
  ], 'Formale Grundpruefung', 'Immer geprueft', 'formal', 'MAJOR', {
    aliases: ['verzeichnis', 'inhaltsverzeichnis', 'abbildungsverzeichnis', 'bildverzeichnis', 'quellen', 'anhang', 'anlagen'],
    positive: ['verzeichnis', 'seite', 'abbildung', 'tabelle', 'listing', 'quelle', 'anhang'],
    evidence: ['passender Dokumentabschnitt', 'Fundstelle im vorderen Dokumentbereich oder Verzeichnisbereich']
  }),

  ...numberedRules('IN', [
    'Abweichungen zum Projektantrag in der Einleitung pruefen',
    'Projektumfeld pruefen',
    'Projektziel pruefen',
    'Projektbegruendung pruefen',
    'Projektschnittstellen pruefen',
    'Projektabgrenzung pruefen',
    'Gesamtpruefung der Einleitung'
  ], 'Projekt-Einleitung', 'Einleitung', 'introduction', 'MAJOR', {
    aliases: ['einleitung', 'projektumfeld', 'projektziel', 'projektbegruendung', 'schnittstellen', 'abgrenzung'],
    positive: ['ausgangssituation', 'auftraggeber', 'zielsetzung', 'scope', 'out of scope']
  }),

  ...numberedRules('AN', [
    'Ist-Zustand oder Ist-Analyse pruefen',
    'Soll-Zustand oder Soll-Analyse pruefen',
    'Lastenheft pruefen',
    'Pflichtenheft pruefen',
    'Anforderungsanalyse pruefen',
    'Stakeholderanalyse pruefen',
    'Nutzwertanalyse pruefen',
    'Datenanalyse pruefen',
    'Roter Faden im Analysebereich pruefen'
  ], 'Analysephase', 'Analyse', 'analysis', 'CRITICAL', {
    aliases: ['ist analyse', 'soll analyse', 'anforderungen', 'stakeholder', 'nutzwertanalyse', 'datenanalyse'],
    positive: ['funktionale anforderung', 'nichtfunktionale anforderung', 'geschaeftliche anforderung', 'stakeholder', 'bewertungskriterium']
  }),

  ...numberedRules('WA', [
    'Wirtschaftlichkeitsanalyse mit Projektkosten und Ressourcenplanung abgleichen',
    'Make-or-Buy-Entscheidung pruefen',
    'Projektkosten pruefen',
    'Amortisationsrechnung pruefen',
    'Formelverwendung und Rechenweg pruefen',
    'Break-even-Grafik oder Break-even-Erlaeuterung pruefen'
  ], 'Wirtschaftlichkeitsanalyse', 'Wirtschaftlichkeit', 'economic_analysis', 'MAJOR', {
    aliases: ['wirtschaftlichkeit', 'kosten nutzen', 'amortisation', 'break even', 'make or buy'],
    positive: ['gesamtkosten', 'gemeinkosten', 'einsparung', 'nutzen', 'formel', 'rechnung']
  }),

  ...numberedRules('PP', [
    'Projektphasen vollstaendig benennen',
    'Projektphasen mit Stunden planen',
    'Analysephase in der Planung pruefen',
    'Entwurfsphase in der Planung pruefen',
    'Implementierungsphase in der Planung pruefen',
    'Testphase in der Planung pruefen',
    'Abnahme und Uebergabe in der Planung pruefen',
    'Dokumentationsaufwand in der Planung pruefen',
    'Meilensteine pruefen',
    'Abhaengigkeiten zwischen Phasen pruefen',
    'Puffer und Risiken in der Planung pruefen',
    'Soll-Ist-faehige Planungsstruktur pruefen',
    'Planungsabweichungen begruenden',
    'Projektrollen in der Planung pruefen',
    'Zeitplanung gegen Projektumfang pruefen',
    'Projektplanung gegen Antrag abgleichen',
    'Phasenbezeichnungen konsistent pruefen',
    'Tabellarische Planung durch Fliesstext erlaeutern',
    'Planungsentscheidungen begruenden',
    'Gesamtpruefung Projektplanung'
  ], 'Projektplanung', 'Planung', 'planning', 'CRITICAL', {
    aliases: ['projektplanung', 'zeitplanung', 'stunden', 'meilenstein', 'phase'],
    positive: ['analysephase', 'entwurfsphase', 'implementierung', 'testphase', 'abnahme', 'dokumentation']
  }),

  ...numberedRules('RP', [
    'Personal und Rollen in der Ressourcenplanung pruefen',
    'Hardware und Arbeitsplatz pruefen',
    'Infrastruktur und Serverressourcen pruefen',
    'Software und Entwicklungswerkzeuge pruefen',
    'Lizenzen und Drittanbieter pruefen',
    'Datenquellen und Testdaten pruefen',
    'Testressourcen und Testumgebung pruefen',
    'Hosting, Deployment und Betrieb pruefen',
    'Sicherheit, Datenschutz und Backup pruefen',
    'Dokumentation, Schulung und Abnahme pruefen',
    'Administrative oder rechtliche Ressourcen pruefen',
    'Vorhandene Ressourcen begruenden',
    '0-Euro-Positionen begruenden',
    'Ressourcen gegen Kostenplanung abgleichen',
    'Ressourcen gegen Projektphasen abgleichen',
    'Ressourcen gegen Projektziel abgleichen',
    'Ressourcen gegen Technikstack abgleichen',
    'Ressourcen gegen Testplanung abgleichen',
    'Ressourcen gegen Stakeholder abgleichen',
    'Ressourcen gegen Risiken abgleichen',
    'Ressourcenmatrix pruefen',
    'Fehlende erwartbare Ressourcen benennen',
    'Ressourcenplanung projektspezifisch statt generisch pruefen',
    'Gesamtpruefung Ressourcenplanung'
  ], 'Ressourcenplanung', 'Planung', 'planning', 'CRITICAL', {
    aliases: ['ressourcenplanung', 'personal', 'hardware', 'software', 'lizenz', 'testumgebung', 'hosting', 'deployment'],
    positive: ['rolle', 'stundensatz', 'kostenposition', 'ressource', 'phase', 'nachweis']
  }),

  ...numberedRules('EP', [
    'Entwicklungsprozess benennen',
    'Vorgehensmodell begruenden',
    'Alternativen zum Vorgehensmodell pruefen',
    'Projektgroesse gegen Vorgehensmodell abgleichen',
    'Iterationen oder Phasenlogik pruefen',
    'Anforderungsmanagement im Prozess pruefen',
    'Aenderungsmanagement im Prozess pruefen',
    'Review- oder Freigabepunkte pruefen',
    'Qualitaetssicherung im Prozess verankern',
    'Dokumentation im Prozess verankern',
    'Stakeholder-Einbindung im Prozess pruefen',
    'Risiken im Prozess beruecksichtigen',
    'Werkzeuge fuer Prozesssteuerung pruefen',
    'Prozess gegen Antrag abgleichen',
    'Prozess gegen Umsetzung abgleichen',
    'Prozessentscheidungen begruenden',
    'Prozessabweichungen erklaeren',
    'Gesamtpruefung Entwicklungsprozess'
  ], 'Entwicklungsprozess', 'Planung', 'planning', 'MAJOR', {
    aliases: ['vorgehensmodell', 'wasserfall', 'scrum', 'kanban', 'iterativ', 'prozess'],
    positive: ['begruendung', 'alternative', 'review', 'freigabe', 'aenderung']
  }),

  ...numberedRules('ZP', [
    'Zielplattform benennen', 'Betriebssystem pruefen', 'Laufzeitumgebung pruefen', 'Hosting-Ziel pruefen',
    'Client-Server-Kontext pruefen', 'Browser- oder Endgeraetekontext pruefen', 'Deploymentziel pruefen',
    'Skalierbarkeit der Zielplattform pruefen', 'Verfuegbarkeit pruefen', 'Wartbarkeit pruefen',
    'Sicherheitsanforderungen der Zielplattform pruefen', 'Datenschutzanforderungen der Zielplattform pruefen',
    'Schnittstellen zur Zielplattform pruefen', 'Datenhaltung auf der Zielplattform pruefen',
    'Monitoring oder Betrieb pruefen', 'Alternativen zur Zielplattform pruefen',
    'Zielplattformentscheidung begruenden', 'Gesamtpruefung Zielplattform'
  ], 'Zielplattform', 'Entwurf', 'design', 'MAJOR', {
    aliases: ['zielplattform', 'betriebssystem', 'hosting', 'deployment', 'laufzeitumgebung'],
    positive: ['server', 'browser', 'client', 'cloud', 'docker', 'runtime']
  }),

  ...numberedRules('SD', [
    'Schnittstellendesign Relevanz pruefen', 'API-Endpunkte pruefen', 'Methoden und Operationen pruefen',
    'Datenformate pruefen', 'Statuscodes pruefen', 'Fehlerverhalten pruefen', 'Authentifizierung pruefen',
    'Autorisierung pruefen', 'Versionierung pruefen', 'Import-Schnittstellen pruefen', 'Export-Schnittstellen pruefen',
    'Frontend-Backend-Kommunikation pruefen', 'Externe Systeme pruefen', 'Schnittstellenrisiken pruefen',
    'Schnittstellentests pruefen', 'Schnittstellendokumentation pruefen', 'Alternativen pruefen',
    'Gesamtpruefung Schnittstellendesign'
  ], 'Schnittstellendesign', 'Entwurf', 'design', 'MAJOR', {
    applies: { always: false, when: ['api_or_interface_detected'] },
    aliases: ['api', 'schnittstelle', 'import', 'export', 'endpoint', 'rest', 'graphql'],
    positive: ['request', 'response', 'json', 'statuscode', 'authentifizierung', 'externes system']
  }),

  ...numberedRules('AD', [
    'Architekturuebersicht pruefen', 'Schichtenmodell pruefen', 'Komponenten pruefen', 'Modulzuschnitt pruefen',
    'Abhaengigkeiten pruefen', 'Datenfluesse pruefen', 'Entwurfsentscheidungen pruefen', 'Alternativen pruefen',
    'Patterns pruefen', 'Sicherheitsarchitektur pruefen', 'Fehlerbehandlung in Architektur pruefen',
    'Testbarkeit der Architektur pruefen', 'Wartbarkeit der Architektur pruefen', 'Erweiterbarkeit pruefen',
    'Deploymentarchitektur pruefen', 'Architekturdiagramm pruefen', 'Architektur gegen Anforderungen abgleichen',
    'Gesamtpruefung Architekturdesign'
  ], 'Architekturdesign', 'Entwurf', 'design', 'CRITICAL', {
    aliases: ['architektur', 'schichten', 'komponenten', 'modul', 'pattern'],
    positive: ['layer', 'komponente', 'datenfluss', 'entscheidung', 'alternative']
  }),

  ...numberedRules('DM', [
    'Datenmodell Relevanz pruefen', 'ER-Modell pruefen', 'Tabellenmodell pruefen', 'Entitaeten pruefen',
    'Attribute pruefen', 'Primaerschluessel pruefen', 'Fremdschluessel pruefen', 'Kardinalitaeten pruefen',
    'Normalisierung pruefen', 'Datentypen pruefen', 'Validierungsregeln pruefen', 'Datenherkunft pruefen',
    'Datenlebenszyklus pruefen', 'Datenschutzbezug pruefen', 'Datenmodell gegen Anforderungen abgleichen',
    'Datenmodell gegen Implementierung abgleichen', 'Gesamtpruefung Datenmodell'
  ], 'Datenmodell', 'Entwurf', 'design', 'CRITICAL', {
    applies: { always: false, when: ['database_detected'] },
    aliases: ['datenmodell', 'er modell', 'erd', 'tabelle', 'relation', 'sql'],
    positive: ['primaerschluessel', 'fremdschluessel', 'kardinalitaet', 'normalisierung', 'datentyp']
  }),

  ...numberedRules('GL', [
    'Geschaeftslogik identifizieren', 'Fachliche Regeln pruefen', 'Berechnungen pruefen', 'Validierungen pruefen',
    'Entscheidungslogik pruefen', 'Ausnahmefaelle pruefen', 'Fehlerfaelle pruefen', 'Berechtigungslogik pruefen',
    'Status- oder Zustandslogik pruefen', 'Algorithmische Entscheidungen pruefen', 'Datenverarbeitung pruefen',
    'Geschaeftslogik gegen Anforderungen abgleichen', 'Geschaeftslogik gegen Tests abgleichen',
    'Plausibilitaet der Geschaeftslogik pruefen', 'Gesamtpruefung Geschaeftslogik'
  ], 'Geschaeftslogik', 'Entwurf', 'design', 'CRITICAL', {
    aliases: ['geschaeftslogik', 'fachlogik', 'algorithmus', 'validierung'],
    positive: ['regel', 'berechnung', 'entscheidung', 'ausnahme', 'status']
  }),

  ...numberedRules('IM', [
    'Implementierung der Datenstrukturen pruefen',
    'Implementierung der Geschaeftslogik pruefen',
    'Exception Handling pruefen',
    'Event Handling pruefen',
    'Implementierung der Schnittstellen pruefen',
    'Verwendete Bibliotheken pruefen'
  ], 'Implementierungsphase', 'Implementierung', 'implementation', 'MAJOR', {
    aliases: ['implementierung', 'realisierung', 'exception', 'event', 'bibliothek', 'library'],
    positive: ['klasse', 'funktion', 'methode', 'framework', 'schnittstelle']
  }),

  ...numberedRules('QM', [
    'Teststrategie pruefen',
    'Statische Quellcodeanalyse pruefen',
    'Dynamische Quellcodeanalyse pruefen',
    'Automatisierte Tests pruefen',
    'Manuelle Tests pruefen',
    'Deployment pruefen'
  ], 'Qualitaetsmanagement', 'Qualitaetsmanagement', 'quality_management', 'CRITICAL', {
    aliases: ['qualitaetssicherung', 'teststrategie', 'lint', 'sonarqube', 'unit test', 'deployment'],
    positive: ['testfall', 'testergebnis', 'abnahmetest', 'automatisiert', 'manuell']
  }),

  ...numberedRules('DOK', [
    'Projektdokumentation pruefen',
    'Entwicklerdokumentation pruefen',
    'Kundendokumentation pruefen'
  ], 'Dokumentation', 'Dokumentation', 'documentation', 'MAJOR', {
    aliases: ['dokumentation', 'entwicklerdokumentation', 'kundendokumentation', 'benutzerhandbuch'],
    positive: ['uebergabe', 'anleitung', 'readme', 'betrieb']
  }),

  ...numberedRules('FAZ', [
    'Abnahme pruefen',
    'Soll-Ist-Vergleich pruefen',
    'Ausblick pruefen'
  ], 'Fazit', 'Fazit', 'conclusion', 'CRITICAL', {
    aliases: ['fazit', 'abnahme', 'soll ist vergleich', 'ausblick'],
    positive: ['zielerreichung', 'abweichung', 'lessons learned', 'freigabe']
  }),

  ...numberedRules('ZU', [
    'Projektantrag gegen Dokumentation abgleichen',
    'Eigenstaendigkeitserklaerung oder persoenliche Erklaerung pruefen',
    'Aenderungen gegenueber Projektantrag erlaeutern',
    'Version, Datum und Autor-Metadaten pruefen',
    'Verweise zwischen Textbausteinen pruefen',
    'Thematische Passung von Verlinkungen pruefen',
    'Fliesstextanteil der Phasen pruefen',
    'Grobe fachliche Fehler benennen'
  ], 'Allgemeine Zusatzregeln', 'Immer geprueft', 'formal', 'MAJOR', {
    aliases: ['projektantrag', 'eigenstaendigkeit', 'version', 'datum', 'verweis', 'fliesstext'],
    positive: ['abweichung', 'erklaerung', 'autor', 'siehe', 'vgl']
  }),

  ...numberedRules('UML', [
    'UML-Diagramm als Abbildung vorhanden',
    'UML-Notation fachlich plausibel',
    'UML-Inhaltsbezug zur Dokumentation',
    'UML-Diagramm in Analysephase',
    'UML-Diagramm in Planungsphase',
    'UML-Diagramm in Entwurfsphase',
    'UML-Diagramm in Implementierungsphase',
    'Klassendiagramm pruefen',
    'Anwendungsfalldiagramm pruefen',
    'Aktivitaetsdiagramm pruefen',
    'Sequenzdiagramm pruefen',
    'Komponentendiagramm pruefen',
    'Zustandsdiagramm pruefen',
    'Verteilungsdiagramm pruefen'
  ], 'UML-Pruefung', 'UML', 'uml', 'MAJOR', {
    aliases: ['uml', 'klassendiagramm', 'sequenzdiagramm', 'aktivitaetsdiagramm', 'use case'],
    positive: ['abbildung', 'diagramm', 'klasse', 'akteur', 'sequenz', 'komponente']
  }),

  ...numberedRules('AI', [
    'KI-Richtlinie nach IHK-Profil pruefen',
    'Moegliche KI-Nutzung und Fundstellen pruefen',
    'KI-Nachweis gegen IHK-Richtlinie pruefen'
  ], 'KI-Richtlinien', 'KI-Compliance', 'ai_compliance', 'MAJOR', {
    aliases: ['ki', 'chatgpt', 'openai', 'copilot', 'gemini', 'claude', 'prompt'],
    positive: ['ki nachweis', 'prompt', 'antwort', 'hilfsmittel', 'erklaerung']
  }),

  ...numberedRules('REG', [
    'Seitenumfang nach IHK-Profil pruefen',
    'PDF-Dateigroesse nach IHK-Profil pruefen',
    'Layout- und Formhinweise nach IHK-Profil pruefen',
    'KI-Sonderregeln nach IHK-Profil pruefen',
    'Regionale Pflichtpunkte nach Dropdown-Profil pruefen'
  ], 'Regionale IHK-Regeln', 'Regionale IHK', 'regional_ihk', 'MAJOR', {
    aliases: ['ihk profil', 'seitenumfang', 'dateigroesse', 'layout', 'ki sonderregel'],
    positive: ['nord westfalen', 'koeln', 'stuttgart', 'hanau', 'frankfurt', 'erfurt']
  })
];

const conditionalRules = new Map([
  ['FG-03', ['images_detected']],
  ['FG-04', ['tables_detected']],
  ['FG-05', ['code_or_listings_detected']],
  ['FG-09', ['appendix_detected']],
  ['SD-01', ['api_or_interface_detected']],
  ['DM-02', ['database_detected']],
  ['UML-08', ['object_oriented_detected']]
]);

for (const item of rules) {
  const when = conditionalRules.get(item.id);
  if (when) item.applies = { always: false, when };
}

const ruleset = {
  id: 'fiae_ruleset_v2',
  version: '2.0.0',
  source: 'rulesets/Ruleset.txt',
  description: 'Strukturiertes fachliches FIAE-Ruleset fuer nachvollziehbare IHK-Dokumentationsreviews.',
  phaseStructure: [
    'formal',
    'introduction',
    'analysis',
    'economic_analysis',
    'planning',
    'design',
    'implementation',
    'quality_management',
    'documentation',
    'conclusion',
    'uml',
    'ai_compliance',
    'regional_ihk'
  ],
  wordingAliases: {
    Abbildungsverzeichnis: ['Bildverzeichnis', 'Abbildungen'],
    Quellenverzeichnis: ['Literaturverzeichnis', 'Quellen', 'Literatur'],
    Anhang: ['Anlage', 'Anlagen', 'Appendix'],
    Listingverzeichnis: ['Quellcodeverzeichnis', 'Codeverzeichnis'],
    Glossar: ['Fremdwortverzeichnis', 'Begriffsverzeichnis']
  },
  rules
};

mkdirSync(dirname(rulesetTargetPath), { recursive: true });
writeFileSync(rulesetTargetPath, `${sourceText}\n`, 'utf8');
writeFileSync(jsonTargetPath, `${JSON.stringify(ruleset, null, 2)}\n`, 'utf8');

console.log(`Wrote ${ruleset.rules.length} FIAE rules to ${jsonTargetPath}`);
