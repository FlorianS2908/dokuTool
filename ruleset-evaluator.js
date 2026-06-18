import { readFileSync } from 'node:fs';

const rulesetUrl = new URL('./rulesets/ihk_abschlussprojekt_ruleset_v1.json', import.meta.url);
const kostenRessourcenRulesetUrl = new URL('./rulesets/kosten_ressourcen_rules_v3.json', import.meta.url);

export const IHK_ABSCHLUSSPROJEKT_RULESET = JSON.parse(
  readFileSync(rulesetUrl, 'utf8').replace(/^\uFEFF/, '')
);

export const KOSTEN_RESSOURCEN_RULESET_V3 = JSON.parse(
  readFileSync(kostenRessourcenRulesetUrl, 'utf8').replace(/^\uFEFF/, '')
);

const statusScore = { gruen: 1, gelb: 0.55, rot: 0, grau: 0.35 };
const categoryMap = new Map(
  (IHK_ABSCHLUSSPROJEKT_RULESET.score_model?.categories || []).map((category) => [category.id, category])
);

const severityToApp = {
  BLOCKER: 'hoch',
  CRITICAL: 'hoch',
  MAJOR: 'hoch',
  MINOR: 'mittel',
  INFO: 'niedrig',
  BONUS: 'niedrig'
};

const missingStatusBySeverity = {
  BLOCKER: 'rot',
  CRITICAL: 'rot',
  MAJOR: 'gelb',
  MINOR: 'gelb',
  INFO: 'grau',
  BONUS: 'gruen'
};

const categoryLabel = (categoryId) => categoryMap.get(categoryId)?.name || categoryId || 'Ruleset';

function normalize(text = '') {
  return String(text || '').replace(/\r/g, '\n').replace(/\s+/g, ' ').trim();
}

function lower(text = '') {
  return normalize(text).toLowerCase();
}

function regexWithGlobal(pattern) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  return new RegExp(pattern.source, flags);
}

function hasAny(text, patterns = []) {
  return patterns.some((pattern) => pattern.test(text));
}

function countRegex(text, pattern) {
  return [...String(text || '').matchAll(regexWithGlobal(pattern))].length;
}

function excerptAt(text, index, before = 100, after = 220) {
  const raw = normalize(text);
  return raw.slice(Math.max(0, index - before), Math.min(raw.length, index + after));
}

function firstEvidence(text, patterns = [], label = 'Fundstelle') {
  const raw = normalize(text);
  for (const pattern of patterns) {
    const match = regexWithGlobal(pattern).exec(raw);
    if (match) return `${label}: "${excerptAt(raw, match.index)}"`;
  }
  return '-';
}

function matchedLabels(text, checks = []) {
  return checks.filter((check) => hasAny(text, check.patterns)).map((check) => check.label);
}

function severity(rule) {
  return severityToApp[rule.severity] || 'mittel';
}

function missingStatus(rule) {
  return missingStatusBySeverity[rule.severity] || 'gelb';
}

function resultFor(rule, status, assessment, evidence, reason, recommendation = rule.recommendation, weight = rule.points || 1) {
  return {
    category: `Ruleset v1 · ${categoryLabel(rule.category)}`,
    criterion: `${rule.id} ${rule.name}`,
    status,
    assessment,
    evidence: evidence || '-',
    reason: `${reason} Regel: ${rule.rule || rule.name}`,
    recommendation: recommendation || 'Manuell gegen das Ruleset pruefen.',
    severity: severity(rule),
    weight,
    ruleset: {
      id: rule.id,
      category: rule.category,
      severity: rule.severity,
      points: rule.points || 0
    }
  };
}

function notApplicableResult(rule, reason) {
  return resultFor(
    rule,
    'gruen',
    'nicht erforderlich',
    '-',
    reason,
    'Kein unmittelbarer Handlungsbedarf, sofern der Kontext wirklich nicht zutrifft.',
    Math.max(0.3, (rule.points || 1) * 0.35)
  );
}

function evaluateChecks(rule, context, checks, options = {}) {
  const scopeText = options.scope === 'cover' ? context.coverText : context.text;
  const applies = options.applies ? options.applies(context) : appliesToRule(rule, context);
  if (!applies) return notApplicableResult(rule, 'Die Regel ist laut Applies-if/Kontext fuer dieses Dokument nicht ausloesend.');

  const labels = matchedLabels(scopeText, checks);
  const missing = checks.map((check) => check.label).filter((label) => !labels.includes(label));
  const minMatches = options.minMatches ?? checks.length;
  const partialMatches = options.partialMatches ?? Math.max(1, Math.ceil(minMatches * 0.45));

  if (labels.length >= minMatches) {
    return resultFor(
      rule,
      'gruen',
      'erfuellt',
      `${labels.length}/${checks.length} Merkmale erkannt: ${labels.join(', ')}`,
      'Das Ruleset-Kriterium wurde anhand typischer Begriffe und Strukturhinweise erkannt.',
      rule.recommendation
    );
  }

  if (labels.length >= partialMatches) {
    return resultFor(
      rule,
      'gelb',
      'teilweise erkannt',
      `Erkannt: ${labels.join(', ') || '-'}. Fehlt/unklar: ${missing.slice(0, 8).join(', ') || '-'}.`,
      'Das Ruleset-Kriterium ist nur teilweise maschinenlesbar nachweisbar.',
      rule.recommendation
    );
  }

  return resultFor(
    rule,
    missingStatus(rule),
    'nicht ausreichend erkannt',
    `Fehlt/unklar: ${missing.slice(0, 8).join(', ') || rule.name}.`,
    'Das Ruleset-Kriterium wurde im extrahierten Text nicht ausreichend erkannt.',
    rule.recommendation
  );
}

function appliesToRule(rule, context) {
  const appliesIf = rule.applies_if || [];
  if (!appliesIf.length) return true;
  const text = context.lText;
  const matcherGroups = {
    'strukturierte Daten': [/datenbank|sql|json|csv|xml|datenmodell|datenstruktur|persistenz|tabelle/i],
    Datenbank: [/datenbank|sql|mysql|postgres|sqlite|mssql|oracle|tabelle|relation/i],
    Dateipersistenz: [/datei|csv|json|xml|excel|filesystem|persistenz/i],
    'API-Datenmodell': [/api|rest|graphql|endpoint|json|request|response/i],
    API: [/api|rest|graphql|endpoint|schnittstelle|request|response|http/i],
    'externe Systeme': [/extern|schnittstelle|fremdsystem|drittsystem|api|import|export/i],
    'Frontend-Backend-Trennung': [/frontend|backend|client|server|api|rest/i],
    Benutzeroberfläche: [/oberflaeche|oberfläche|ui|ux|maske|formular|screen|frontend|benutzer/i]
  };

  return appliesIf.some((item) => (matcherGroups[item] || [new RegExp(String(item), 'i')]).some((pattern) => pattern.test(text)));
}

function buildContext({ doc, AntragDoc, options, profile }) {
  const text = normalize(doc.text || '');
  const bodyText = normalize(doc.bodyText || doc.text || '');
  const coverText = bodyText.slice(0, 4500);
  const lText = lower(text);
  const headings = Array.isArray(doc.headings) ? doc.headings : [];
  const structure = doc.structure || {};
  const imageCount = Math.max(countRegex(text, /\bAbbildung\s+\d+/gi), Number(structure.bodyImageCount || 0));
  const tableCount = Math.max(countRegex(text, /\bTabelle\s+\d+/gi), Number(structure.tableCount || 0));
  const listingCount = countRegex(text, /\b(?:Listing|Quellcode)\s+\d+/gi)
    + countRegex(text, /```|public\s+class|function\s+\w+|def\s+\w+|class\s+\w+/gi);
  const appendixCount = countRegex(text, /\b(?:Anhang|Anlage)\s+[A-Za-z0-9]/gi);
  const sourceHints = countRegex(text, /https?:\/\/|\bQuelle\s*:|\[[0-9]+\]|\b[A-Z][A-Za-z]+,\s*\d{4}\b/gi);
  const pageCount = Number(doc.pageCount || 0);
  const charsPerPage = pageCount ? Math.round(text.length / pageCount) : text.length;

  return {
    doc,
    AntragDoc,
    options,
    profile,
    text,
    bodyText,
    coverText,
    lText,
    headings,
    structure,
    imageCount,
    tableCount,
    listingCount,
    appendixCount,
    sourceHints,
    pageCount,
    charsPerPage,
    hasAppendix: /\banhang\b|\banlagen\b/i.test(text),
    hasSources: /literaturverzeichnis|quellenverzeichnis|\bquellen\b/i.test(text),
    hasToc: /inhaltsverzeichnis|gliederung|table of contents|\binhalt\b/i.test(text)
      || /\b\d+(?:\.\d+)*\s+[A-ZÄÖÜA-Za-zäöüß].{3,80}\s+\.{2,}\s*\d+\b/.test(text),
    hasPageNumbering: /seite\s+\d+|page\s+\d+|\b\d+\s*\/\s*\d+\b/i.test(text) || pageCount > 1,
    hasDeclaration: /eigenst[aä]ndigkeit|selbstst[aä]ndigkeit|pers[oö]nliche erkl[aä]rung|ohne fremde hilfe/i.test(text),
    hasDeviationChapter: /abweichungen?\s+(?:zum|vom)\s+projektantrag|aenderungen?\s+(?:gegenueber|zum|vom)\s+projektantrag|änderungen?\s+(?:gegenüber|zum|vom)\s+projektantrag/i.test(text),
    hasOwnContribution: /ich habe|ich entwickelte|ich implementierte|ich entschied|eigenleistung|eigene(?:r|n|s)?\s+(?:anteil|umsetzung|entscheidung)|durch den pruefling|durch den prüfling/i.test(text)
      || /(entwickelt|implementiert|konzipiert|analysiert|getestet|entschieden)\b/i.test(text),
    hasDecisionLanguage: /entscheidung|alternative|begruendung|begründung|warum|aus diesem grund|daher wurde|verglichen|bewertet/i.test(text),
    hasTests: /testkonzept|testfall|testergebnis|qualit[aä]tssicherung|unit[-\s]?test|integrationstest|abnahmetest|validierung/i.test(text),
    hasRequirements: /anforderung|akzeptanzkriter|lastenheft|pflichtenheft|funktionale|nichtfunktionale/i.test(text),
    applicationText: normalize(AntragDoc?.text || '')
  };
}

const CHECKS = {
  'FORM-001': [
    { label: 'Projekttitel', patterns: [/projekttitel|projektthema|projektarbeit|abschlussprojekt/i] },
    { label: 'Ausbildungsberuf', patterns: [/fachinformatiker|fachinformatikerin|fia(?:e|si)|anwendungsentwicklung|systemintegration/i] },
    { label: 'Pruefling/Prueflingsnummer', patterns: [/pruefling|prüfling|pruefungsbewerber|prüfungsbewerber|prueflingsnummer|prüflingsnummer|autor|ersteller|name/i] },
    { label: 'Ausbildungsbetrieb', patterns: [/ausbildungsbetrieb|betrieb|firma|unternehmen/i] },
    { label: 'Datum', patterns: [/abgabedatum|fertigstellung|datum|\b\d{1,2}\.\d{1,2}\.\d{4}\b/i] },
    { label: 'betriebliche Projektarbeit', patterns: [/betriebliche projektarbeit|projektdokumentation|abschlussprojekt/i] }
  ],
  'STR-001': [
    { label: 'Einleitung', patterns: [/\beinleitung\b/i] },
    { label: 'Projektumfeld', patterns: [/projektumfeld|ausgangssituation|unternehmen|betrieb/i] },
    { label: 'Projektziel', patterns: [/projektziel|zielsetzung|ziel des projekts/i] },
    { label: 'Projektbegruendung', patterns: [/projektbegruendung|projektbegründung|begruendung|begründung|notwendigkeit/i] },
    { label: 'Projektabgrenzung', patterns: [/projektabgrenzung|abgrenzung|in[-\s]?scope|out[-\s]?of[-\s]?scope|nicht bestandteil/i] },
    { label: 'Projektplanung', patterns: [/projektplanung|zeitplanung|ressourcenplanung|kostenplanung/i] },
    { label: 'Analysephase', patterns: [/analysephase|ist[-\s]?analyse|anforderungsanalyse/i] },
    { label: 'Entwurfsphase', patterns: [/entwurfsphase|entwurf|architektur|konzeption|design/i] },
    { label: 'Implementierung/Realisierung', patterns: [/implementierung|realisierung|umsetzung/i] },
    { label: 'Test/QS', patterns: [/test|qualit[aä]tssicherung|validierung/i] },
    { label: 'Abnahme/Uebergabe', patterns: [/abnahme|uebergabe|übergabe|deployment|einfuehrung|einführung/i] },
    { label: 'Soll-Ist-Vergleich', patterns: [/soll\s*[-/]?\s*ist\s*[-/]?\s*vergleich|gegenueberstellung|gegenüberstellung/i] },
    { label: 'Fazit/Ausblick/Lessons Learned', patterns: [/\bfazit\b|ausblick|lessons learned|reflexion|schlussbetrachtung/i] }
  ],
  'STR-002': [
    { label: 'Problem/Ausgangssituation', patterns: [/problem|ausgangssituation|ist[-\s]?zustand|schwachstelle/i] },
    { label: 'Ziel', patterns: [/projektziel|zielsetzung|soll[-\s]?zustand/i] },
    { label: 'Analyse', patterns: [/analyse|anforderung|stakeholder/i] },
    { label: 'Planung', patterns: [/planung|zeitplanung|ressourcen|kosten/i] },
    { label: 'Entwurf', patterns: [/entwurf|architektur|design|datenmodell/i] },
    { label: 'Umsetzung', patterns: [/implementierung|realisierung|umsetzung/i] },
    { label: 'Test', patterns: [/test|qualit[aä]tssicherung|validierung/i] },
    { label: 'Abnahme/Fazit', patterns: [/abnahme|fazit|ausblick/i] }
  ],
  'STR-003': [
    { label: 'Entscheidungen', patterns: [/entscheidung|entschieden|auswahl/i] },
    { label: 'Alternativen', patterns: [/alternative|vergleich|gegenueberstellung|gegenüberstellung/i] },
    { label: 'Begruendungen', patterns: [/begruendung|begründung|warum|aufgrund|daher/i] },
    { label: 'Ergebnisse', patterns: [/ergebnis|resultat|zielerreichung|auswirkung/i] }
  ],
  'PROJ-001': [
    { label: 'konkretes Projektziel', patterns: [/projektziel|zielsetzung|ziel des projekts/i] },
    { label: 'messbare Kriterien', patterns: [/messbar|akzeptanzkriter|kennzahl|kriterium|zielwert|erfolgreich wenn/i] },
    { label: 'Problemableitung', patterns: [/ausgangssituation|problem|bedarf|schwachstelle|ist[-\s]?analyse/i] }
  ],
  'PROJ-002': [
    { label: 'eigener Anteil', patterns: [/eigenleistung|eigener anteil|selbst entwickelt|durch den pruefling|durch den prüfling/i] },
    { label: 'eigene Analyse/Entscheidung', patterns: [/analysiert|entschieden|konzipiert|bewertet|ausgewaehlt|ausgewählt/i] },
    { label: 'eigene Umsetzung/Test', patterns: [/implementiert|entwickelt|programmiert|getestet|validiert/i] }
  ],
  'PROJ-003': [
    { label: 'In-Scope', patterns: [/in[-\s]?scope|bestandteil des projekts|umfang des projekts|teil des projekts/i] },
    { label: 'Out-of-Scope', patterns: [/out[-\s]?of[-\s]?scope|nicht bestandteil|abgrenzung|nicht umgesetzt|ausgeschlossen/i] },
    { label: 'Vorarbeiten/Systeme', patterns: [/bestehend|vorarbeit|framework|uebernommen|übernommen|altsystem|bestandssystem/i] }
  ],
  'PROJ-004': [
    { label: 'Analyse', patterns: [/analyse|anforderung|ist[-\s]?analyse|soll[-\s]?konzept/i] },
    { label: 'Entwurf/Planung', patterns: [/entwurf|architektur|design|planung/i] },
    { label: 'Implementierung/Systemintegration', patterns: [/implementierung|realisierung|konfiguration|systemintegration|deployment/i] },
    { label: 'Test/Dokumentation', patterns: [/test|qualit[aä]tssicherung|dokumentation|abnahme/i] }
  ],
  'ANA-001': [
    { label: 'aktueller Zustand', patterns: [/ist[-\s]?analyse|ist[-\s]?zustand|ausgangssituation|aktueller zustand/i] },
    { label: 'bestehende Systeme/Prozesse', patterns: [/bestehende systeme|prozess|workflow|daten|schnittstelle/i] },
    { label: 'Schwachstellen/Nutzerprobleme', patterns: [/schwachstelle|problem|medienbruch|fehler|performance|nutzerproblem/i] }
  ],
  'ANA-002': [
    { label: 'Soll-Zustand', patterns: [/soll[-\s]?analyse|soll[-\s]?zustand|soll[-\s]?konzept|angestrebter zustand/i] },
    { label: 'konkrete Verbesserungen', patterns: [/verbesserung|optimierung|reduzierung|automatisierung|vereinfachung/i] },
    { label: 'Zielkriterien', patterns: [/zielkriter|akzeptanzkriter|messbar|erwartung|erfolgskriter/i] }
  ],
  'ANA-003': [
    { label: 'funktionale Anforderungen', patterns: [/funktionale anforderung|functional requirement|das system soll|muss das system|anforderung f/i] },
    { label: 'eindeutig/pruefbar', patterns: [/pruefbar|prüfbar|akzeptanzkriter|muss|soll|kann/i] }
  ],
  'ANA-004': [
    { label: 'Sicherheit/Datenschutz', patterns: [/sicherheit|datenschutz|rollen|rechte|authentifizierung|autorisierung/i] },
    { label: 'Performance/Skalierung', patterns: [/performance|skalierbarkeit|antwortzeit|laufzeit|verfuegbarkeit|verfügbarkeit/i] },
    { label: 'Usability/Wartbarkeit/Zuverlaessigkeit', patterns: [/usability|benutzerfreund|wartbarkeit|zuverlaessigkeit|zuverlässigkeit|barrierefreiheit/i] }
  ],
  'ANA-005': [
    { label: 'Priorisierung', patterns: [/priorit[aä]t|priorisierung|must|should|could|moscow|kann[-\s]?anforderung/i] },
    { label: 'Stakeholder-Abstimmung', patterns: [/stakeholder|fachabteilung|auftraggeber|abgestimmt|workshop|interview/i] },
    { label: 'Aenderungsmanagement', patterns: [/aenderung|änderung|change|review|validiert|freigabe/i] }
  ],
  'ANA-006': [
    { label: 'Anforderung zu Entwurf', patterns: [/anforderung.*entwurf|entwurf.*anforderung|traceability|nachverfolgbarkeit/i] },
    { label: 'Anforderung zu Test', patterns: [/anforderung.*test|test.*anforderung|testmatrix|testabdeckung/i] },
    { label: 'Akzeptanz/Abnahme', patterns: [/akzeptanzkriter|abnahmekriter|abnahme/i] }
  ],
  'PLAN-001': [
    { label: 'Projektphasen', patterns: [/projektphase|analysephase|entwurfsphase|implementierungsphase|testphase/i] },
    { label: 'Stunden/Summe', patterns: [/\b\d+(?:[,.]\d+)?\s*h\b|stunden|gesamtstunden/i] }
  ],
  'PLAN-002': [
    { label: 'Taetigkeiten mit Stunden', patterns: [/[A-ZÄÖÜA-Za-zäöüß\- ]{4,}\s+\d+(?:[,.]\d+)?\s*h\b/i] },
    { label: 'Phasenaufteilung', patterns: [/analyse|entwurf|implementierung|test|abnahme|dokumentation/i] },
    { label: 'Detailplanung', patterns: [/detailplanung|detaillierte zeitplanung|arbeitspaket|meilenstein/i] }
  ],
  'PLAN-003': [
    { label: 'Personal/Rollen', patterns: [/personal|rolle|stakeholder|projektbeteiligte|auftraggeber|ausbilder/i] },
    { label: 'Hardware/Software', patterns: [/hardware|software|entwicklungsumgebung|tool|lizenz|datenbank/i] },
    { label: 'Infrastruktur/Verfuegbarkeit', patterns: [/infrastruktur|server|deploymentumgebung|testumgebung|verfuegbarkeit|verfügbarkeit/i] }
  ],
  'PLAN-004': [
    { label: 'Personalkosten', patterns: [/personalkosten|stundensatz|lohn|gehalt|arbeitskosten/i] },
    { label: 'Sach-/Lizenzkosten', patterns: [/sachkosten|lizenzkosten|materialkosten|hardwarekosten|softwarekosten/i] },
    { label: 'Gemeinkosten/vorhandene Ressourcen', patterns: [/gemeinkosten|vorhandene ressourcen|anteilige nutzung|infrastrukturkosten/i] }
  ],
  'PLAN-005': [
    { label: 'Kosten-Nutzen/Amortisation', patterns: [/kosten[-\s]?nutzen|amortisation|wirtschaftlichkeit|break[-\s]?even/i] },
    { label: 'Make-or-Buy/Nutzwert', patterns: [/make[-\s]?or[-\s]?buy|nutzwertanalyse|alternative|vergleich/i] },
    { label: 'Annahmen/Ergebnis', patterns: [/annahme|berechnung|ergebnis|einsparung|nutzen/i] }
  ],
  'PLAN-006': [
    { label: 'Risiken', patterns: [/risiko|risiken|risikomatrix|risikoanalyse/i] },
    { label: 'Eintritt/Auswirkung', patterns: [/eintrittswahrscheinlichkeit|auswirkung|schadenshoehe|schadenshöhe/i] },
    { label: 'Massnahmen', patterns: [/massnahme|maßnahme|gegenmassnahme|gegenmaßnahme|mitigation/i] }
  ],
  'PLAN-007': [
    { label: 'Vorgehensmodell', patterns: [/vorgehensmodell|wasserfall|agil|scrum|kanban|iterativ|hybrid/i] },
    { label: 'Begruendung', patterns: [/begruendung|begründung|geeignet|vorteil|nachteil|projektbezug/i] }
  ],
  'DES-001': [
    { label: 'Komponenten/Schichten', patterns: [/komponente|schicht|layer|modul|architektur/i] },
    { label: 'Datenfluesse/Schnittstellen', patterns: [/datenfluss|schnittstelle|api|kommunikation|request|response/i] },
    { label: 'Technische Entscheidungen', patterns: [/entscheidung|framework|datenbank|technologie|deployment/i] }
  ],
  'DES-002': [
    { label: 'Technologieentscheidung', patterns: [/framework|programmiersprache|datenbank|api[-\s]?stil|deployment|technologie/i] },
    { label: 'Alternative', patterns: [/alternative|vergleich|gegenueberstellung|gegenüberstellung|auswahl/i] },
    { label: 'Begruendung', patterns: [/begruendung|begründung|kriterium|vorteil|nachteil|bewertung/i] }
  ],
  'DES-003': [
    { label: 'Datenmodell', patterns: [/datenmodell|er[-\s]?modell|erd|erm|tabellenmodell|klassendiagramm/i] },
    { label: 'Schluessel/Beziehungen', patterns: [/primaer|primär|fremdschluessel|fremdschlüssel|beziehung|relation|kardinalitaet|kardinalität/i] },
    { label: 'Datentypen/Validierung', patterns: [/datentyp|validierung|pflichtfeld|normalisierung|feld/i] }
  ],
  'DES-004': [
    { label: 'Endpunkte/Methoden', patterns: [/endpoint|route|methode|get|post|put|delete|rest|graphql/i] },
    { label: 'Datenformate/Statuscodes', patterns: [/json|xml|payload|statuscode|http[-\s]?status|request|response/i] },
    { label: 'Auth/Fehler/Versionierung', patterns: [/authentifizierung|autorisierung|token|fehlerverhalten|versionierung|api[-\s]?version/i] }
  ],
  'DES-005': [
    { label: 'Zielgruppe/Benutzerfuehrung', patterns: [/zielgruppe|benutzerfuehrung|benutzerführung|user journey|nutzer/i] },
    { label: 'Maske/Mockup/Wireframe', patterns: [/maske|mockup|wireframe|formular|screen|oberflaeche|oberfläche/i] },
    { label: 'Validierung/Usability', patterns: [/validierung|fehlermeldung|usability|barrierefreiheit|benutzerfreund/i] }
  ],
  'DES-006': [
    { label: 'Geschaeftslogik', patterns: [/geschaeftslogik|geschäftslogik|fachlogik|algorithmus|algorithmik|kernlogik/i] },
    { label: 'Ablaufbeschreibung', patterns: [/pseudocode|pap|aktivitaetsdiagramm|aktivitätsdiagramm|sequenzdiagramm|ablauf/i] }
  ],
  'DES-007': [
    { label: 'Rollen/Rechte/Auth', patterns: [/rolle|rechte|berechtigung|authentifizierung|autorisierung|passwort/i] },
    { label: 'Eingabe-/Websicherheit', patterns: [/validierung|sql[-\s]?injection|xss|csrf|escaping|input/i] },
    { label: 'Datenschutz/Logging/Backup', patterns: [/datenschutz|logging|backup|recovery|verschluesselung|verschlüsselung/i] }
  ],
  'IMPL-001': [
    { label: 'Umsetzungsschritte', patterns: [/implementierung|realisierung|umsetzung|entwickelt|programmiert/i] },
    { label: 'Bezug zu Entwurf/Anforderung', patterns: [/anforderung|entwurf|architektur|datenmodell|konzept/i] },
    { label: 'Erklaerung statt Screenshot', patterns: [/beschreibung|erklaerung|erklärung|logik|funktion/i] }
  ],
  'IMPL-002': [
    { label: 'eigene Module/Klassen/Funktionen', patterns: [/eigene|modul|klasse|funktion|skript|komponente/i] },
    { label: 'Kernfunktionen', patterns: [/kernfunktion|geschaeftslogik|geschäftslogik|algorithmus|service|controller/i] },
    { label: 'technische Entscheidungen', patterns: [/entscheidung|framework|bibliothek|datenbank|schnittstelle/i] }
  ],
  'IMPL-003': [
    { label: 'Codeauszug/Listing', patterns: [/codeauszug|quellcode|listing|```|public\s+class|function\s+\w+|def\s+\w+/i] },
    { label: 'Erklaerung/Beschriftung', patterns: [/erlaeutert|erläutert|beschrieben|listing\s+\d+|abbildung\s+\d+|kernlogik/i] }
  ],
  'IMPL-004': [
    { label: 'Fehlerbehandlung', patterns: [/fehlerbehandlung|exception|try|catch|ausnahme|fehlermeldung/i] },
    { label: 'Validierung', patterns: [/validierung|eingabepruefung|eingabeprüfung|ungueltig|ungültig|datenpruefung|datenprüfung/i] },
    { label: 'Berechtigung/technische Fehler', patterns: [/berechtigung|timeout|error|statuscode|rollback/i] }
  ],
  'IMPL-005': [
    { label: 'Installation/Konfiguration', patterns: [/installation|konfiguration|setup|environment|umgebung/i] },
    { label: 'Deployment/Migration', patterns: [/deployment|migration|release|produktiveinfuehrung|produktiveinführung|rollout/i] },
    { label: 'Uebergabe/Schulung', patterns: [/uebergabe|übergabe|schulung|einweisung|betriebsstart/i] }
  ],
  'IMPL-006': [
    { label: 'Versionierung', patterns: [/version|versionsverwaltung|git|commit|branch|release/i] },
    { label: 'Aenderungen/Abweichungen', patterns: [/aenderung|änderung|abweichung|iteration|anpassung/i] }
  ],
  'IMPL-007': [
    { label: 'Wartung/Betrieb', patterns: [/wartung|betrieb|runbook|admin|support|verantwortlichkeit/i] },
    { label: 'Backup/Monitoring', patterns: [/backup|recovery|monitoring|logging|rollen/i] }
  ],
  'TEST-001': [
    { label: 'Teststrategie', patterns: [/testkonzept|teststrategie|testplan/i] },
    { label: 'Testarten', patterns: [/unit[-\s]?test|integrationstest|systemtest|abnahmetest|usability[-\s]?test|sicherheitstest|manuell|automatisiert/i] }
  ],
  'TEST-002': [
    { label: 'Vorbedingung/Eingabe', patterns: [/vorbedingung|eingabe|testdaten|precondition/i] },
    { label: 'Erwartetes Ergebnis', patterns: [/erwartetes ergebnis|soll[-\s]?ergebnis|expected/i] },
    { label: 'Tatsaechliches Ergebnis/Status', patterns: [/tatsaechliches ergebnis|tatsächliches ergebnis|ist[-\s]?ergebnis|bestanden|fehlgeschlagen|status/i] }
  ],
  'TEST-003': [
    { label: 'Anforderung zu Testfall', patterns: [/anforderung.*testfall|testfall.*anforderung|testmatrix|testabdeckung/i] },
    { label: 'Kernanforderungen abgesichert', patterns: [/akzeptanzkriter|anforderungs-id|req[-\s]?\d+|testfall[-\s]?\d+/i] }
  ],
  'TEST-004': [
    { label: 'Testdaten', patterns: [/testdaten|datensatz|beispieldaten/i] },
    { label: 'Grenzwerte/Aequivalenzklassen', patterns: [/grenzwert|aequivalenzklasse|äquivalenzklasse|negativtest|fehlerfall/i] }
  ],
  'TEST-005': [
    { label: 'Testergebnisse', patterns: [/testergebnis|testprotokoll|ergebnis|bestanden|fehlgeschlagen/i] },
    { label: 'Fehler/Retest', patterns: [/fehlernummer|bug|defect|retest|erneut getestet|fehlerbehebung/i] }
  ],
  'TEST-006': [
    { label: 'Review/Walkthrough', patterns: [/code[-\s]?review|review|walkthrough|abnahmegespraech|abnahmegespräch|benutzerfeedback/i] },
    { label: 'Statische Analyse/Linting/Sicherheit', patterns: [/lint|statische analyse|sonarqube|security scan|sicherheitspruefung|sicherheitsprüfung/i] }
  ],
  'TEST-007': [
    { label: 'Abnahme', patterns: [/abnahme|abnahmeprotokoll|abnahmetest|freigabe/i] },
    { label: 'Beteiligte/Kriterien', patterns: [/auftraggeber|fachabteilung|kunde|ausbilder|projektverantwortlicher|abnahmekriter/i] },
    { label: 'Ergebnis', patterns: [/bestanden|freigegeben|akzeptiert|abgenommen|ergebnis/i] }
  ],
  'TEST-008': [
    { label: 'Traceability', patterns: [/traceability|nachverfolgbarkeit|testabdeckung|testmatrix/i] },
    { label: 'Anforderung/Akzeptanz/Risiko', patterns: [/anforderung|akzeptanzkriter|risiko|testfall/i] }
  ],
  'END-001': [
    { label: 'Ziel-Soll-Ist', patterns: [/soll\s*[-/]?\s*ist\s*[-/]?\s*vergleich|zielerreichung|geplante ziele|erreichte ergebnisse/i] },
    { label: 'Zeit/Kosten', patterns: [/geplante zeit|tatsaechliche zeit|tatsächliche zeit|geplante kosten|tatsaechliche kosten|abweichung/i] }
  ],
  'END-002': [
    { label: 'Abweichungen', patterns: [/abweichung|delta|unterschied|verschoben|mehrstunden|minderstunden/i] },
    { label: 'Ursache/Auswirkung', patterns: [/ursache|grund|auswirkung|bewertung|massnahme|maßnahme/i] }
  ],
  'END-003': [
    { label: 'Lessons Learned', patterns: [/lessons learned|gelernt|erkenntnis|reflexion/i] },
    { label: 'Projektbezug', patterns: [/projekt|technisch|fachlich|organisatorisch|zukuenftig|zukünftig/i] }
  ],
  'END-004': [
    { label: 'Ausblick', patterns: [/ausblick|erweiterung|folgeprojekt|optimierung|weiterentwicklung|wartung/i] },
    { label: 'realistische Grenzen', patterns: [/grenze|limitation|technische schuld|future work|offen/i] }
  ],
  'LANG-001': [
    { label: 'Fachsprache', patterns: [/fachbegriff|fachlich|technisch|begriff|glossar/i] },
    { label: 'Verstaendlichkeit', patterns: [/erklaert|erklärt|nachvollziehbar|beschreibung|kontext/i] }
  ],
  'LANG-002': [
    { label: 'Abkuerzungsverzeichnis', patterns: [/abkuerzungsverzeichnis|abkürzungsverzeichnis/i] },
    { label: 'Ausschreiben beim ersten Auftreten', patterns: [/[A-ZÄÖÜ]{2,}\s*\([^)]+\)|[A-Za-zäöüß ]+\s*\([A-ZÄÖÜ]{2,}\)/i] }
  ],
  'LANG-003': [
    { label: 'Quellenverzeichnis', patterns: [/quellenverzeichnis|literaturverzeichnis|quelle\s*:/i] },
    { label: 'Externe Quellen/Hilfsmittel', patterns: [/https?:\/\/|bibliothek|framework|bildquelle|ki[-\s]?hilfsmittel|chatgpt|openai/i] }
  ],
  'LANG-004': [
    { label: 'nummerierte Elemente', patterns: [/abbildung\s+\d+|tabelle\s+\d+|listing\s+\d+|anhang\s+[a-z0-9]/i] },
    { label: 'Textverweise', patterns: [/siehe\s+(?:abbildung|tabelle|listing|anhang)|vgl\.\s+(?:abbildung|tabelle|listing|anhang)/i] }
  ]
};

function evaluateSpecialRule(rule, context) {
  switch (rule.id) {
    case 'FORM-002': {
      const checks = [
        { label: 'Inhaltsverzeichnis', patterns: [/inhaltsverzeichnis|gliederung|table of contents|\binhalt\b/i, /\b\d+(?:\.\d+)*\s+[A-ZÄÖÜA-Za-zäöüß].{3,80}\s+\.{2,}\s*\d+\b/i] },
        { label: 'Seitennummerierung', patterns: [/seite\s+\d+|page\s+\d+|\b\d+\s*\/\s*\d+\b/i] }
      ];
      const labels = matchedLabels(context.text, checks);
      if (context.hasToc && context.hasPageNumbering) {
        return resultFor(rule, 'gruen', 'vorhanden', 'Inhaltsverzeichnis/Gliederung und Seitennummerierung erkannt.', 'Die formale Grundstruktur ist maschinenlesbar vorhanden.');
      }
      if (context.hasToc || context.hasPageNumbering || labels.length) {
        return resultFor(rule, 'gelb', 'teilweise erkannt', `Erkannt: ${labels.join(', ') || (context.hasToc ? 'Inhaltsverzeichnis' : 'Seitennummerierung')}.`, 'Ein Bestandteil wurde erkannt, der andere ist nicht sicher extrahierbar.');
      }
      return resultFor(rule, 'rot', 'nicht erkannt', '-', 'Weder Inhaltsverzeichnis noch Seitennummerierung wurden ausreichend erkannt.');
    }
    case 'FORM-003': {
      const issues = [];
      const ok = [];
      if (context.imageCount > 0) (/abbildungsverzeichnis|bildverzeichnis/i.test(context.text) ? ok : issues).push('Abbildungsverzeichnis');
      if (context.tableCount > 0) (/tabellenverzeichnis/i.test(context.text) ? ok : issues).push('Tabellenverzeichnis');
      if (context.listingCount > 0) (/listingverzeichnis|quellcodeverzeichnis/i.test(context.text) ? ok : issues).push('Listingverzeichnis');
      if (context.appendixCount > 0 || context.hasAppendix) (/anhangsverzeichnis|anlagenverzeichnis/i.test(context.text) ? ok : issues).push('Anhangsverzeichnis');
      if (context.sourceHints > 0) (context.hasSources ? ok : issues).push('Quellenverzeichnis');
      if (issues.length) return resultFor(rule, 'gelb', 'Verzeichnisse fehlen/unklar', `Fehlt/unklar: ${issues.join(', ')}. Erfuellt: ${ok.join(', ') || '-'}.`, 'Bedingte Verzeichnisse passen noch nicht vollstaendig zum erkannten Inhalt.');
      return resultFor(rule, 'gruen', 'plausibel', ok.length ? `Erfuellt: ${ok.join(', ')}` : 'Keine ausloesenden Elemente erkannt.', 'Bedingte Verzeichnisse wirken zum extrahierten Inhalt passend.');
    }
    case 'FORM-004': {
      if (!context.hasAppendix && context.appendixCount === 0) return notApplicableResult(rule, 'Keine Anhaenge oder Anlagen erkannt.');
      const referenced = /siehe\s+(anhang|anlage)|vgl\.\s+(anhang|anlage)|\b(?:anhang|anlage)\s+[a-z0-9]/i.test(context.text);
      return referenced
        ? resultFor(rule, 'gruen', 'referenziert', firstEvidence(context.text, [/siehe\s+(anhang|anlage)|vgl\.\s+(anhang|anlage)|\b(?:anhang|anlage)\s+[a-z0-9]/i], 'Anhangsverweis'), 'Anhaenge/Anlagen werden aus dem Text heraus referenziert.')
        : resultFor(rule, 'rot', 'Anhang ohne Textbezug', 'Anhang/Anlage erkannt, aber kein klarer Textverweis.', 'Anlagen wirken ohne Textbezug nicht ausreichend eingebunden.');
    }
    case 'FORM-005': {
      const page = context.profile?.page;
      if (!page && !context.profile?.layout && !context.profile?.pdfMaxMb) return resultFor(rule, 'grau', 'kein detailliertes Profil', context.profile?.label || '-', 'Das ausgewaehlte Profil enthaelt keine vollstaendig maschinenpruefbaren Formatgrenzen.');
      if (page && context.pageCount) {
        const exceeds = (page.totalMax && context.pageCount > page.totalMax) || (page.max && context.pageCount > page.max);
        const tooShort = page.min && context.pageCount < page.min;
        if (exceeds) return resultFor(rule, 'rot', 'Seitenlimit ueberschritten', `Erkannte Seiten: ${context.pageCount}. Profil: ${context.profile.label}.`, 'Der Seitenumfang liegt ueber einer hinterlegten regionalen Grenze.');
        if (tooShort) return resultFor(rule, 'gelb', 'moeglicherweise zu kurz', `Erkannte Seiten: ${context.pageCount}. Profil: ${context.profile.label}.`, 'Der Seitenumfang liegt unter der hinterlegten Orientierung.');
      }
      return resultFor(rule, 'grau', 'teilweise maschinenpruefbar', context.profile?.layout || context.profile?.summary || '-', 'Layoutdetails wie Schriftart, Zeilenabstand und Raender sind nur eingeschraenkt automatisch pruefbar.');
    }
    case 'FORM-006': {
      const consistency = [
        context.hasToc,
        context.hasPageNumbering,
        context.hasSources || context.sourceHints === 0,
        context.imageCount === 0 || /abbildungsverzeichnis|abbildung\s+\d+/i.test(context.text),
        context.tableCount === 0 || /tabellenverzeichnis|tabelle\s+\d+/i.test(context.text)
      ].filter(Boolean).length;
      if (consistency >= 4) return resultFor(rule, 'gruen', 'formal weitgehend konsistent', `${consistency}/5 Konsistenzhinweise erkannt.`, 'Verweise, Verzeichnisse und Nummerierung wirken maschinenlesbar konsistent.');
      if (consistency >= 2) return resultFor(rule, 'gelb', 'formale Nacharbeit moeglich', `${consistency}/5 Konsistenzhinweise erkannt.`, 'Mehrere formale Hinweise sind nicht sicher nachweisbar.');
      return resultFor(rule, 'gelb', 'formale Qualitaet unklar', `${consistency}/5 Konsistenzhinweise erkannt.`, 'Aeusserer Eindruck kann automatisch nur begrenzt bewertet werden.');
    }
    default:
      return null;
  }
}

function evaluateBlocker(rule, context) {
  switch (rule.id) {
    case 'KO-001': {
      if (context.text.length < 800 || (context.pageCount && context.charsPerPage < 350)) {
        return resultFor(rule, 'rot', 'Text kaum maschinenlesbar', `Textzeichen: ${context.text.length}; Seiten: ${context.pageCount || '-'}; Zeichen/Seite: ${context.charsPerPage}.`, 'Die extrahierte Textmenge ist fuer eine belastbare Pruefung zu gering.', rule.recommendation, 3);
      }
      if (context.imageCount > 8 && context.charsPerPage < 700) {
        return resultFor(rule, 'gelb', 'bildlastig', `Bilder: ${context.imageCount}; Zeichen/Seite: ${context.charsPerPage}.`, 'Das Dokument wirkt stark bildlastig oder der PDF-Text ist nur teilweise extrahierbar.', rule.recommendation, 2);
      }
      return resultFor(rule, 'gruen', 'maschinenlesbarer Text vorhanden', `Textzeichen: ${context.text.length}; Zeichen/Seite: ${context.charsPerPage}.`, 'Ausreichend maschinenlesbarer Text wurde extrahiert.', rule.recommendation, 1);
    }
    case 'KO-002':
      return context.hasDeclaration
        ? resultFor(rule, 'gruen', 'Erklaerung erkannt', firstEvidence(context.text, [/eigenst[aä]ndigkeit|selbstst[aä]ndigkeit|pers[oö]nliche erkl[aä]rung|ohne fremde hilfe/i], 'Erklaerung'), 'Eine Eigenstaendigkeits- oder persoenliche Erklaerung wurde erkannt.', rule.recommendation, 2)
        : resultFor(rule, 'rot', 'fehlt', '-', 'Die Eigenstaendigkeitserklaerung wurde nicht sicher erkannt.', rule.recommendation, 3);
    case 'KO-003': {
      const page = context.profile?.page;
      if (!page) return resultFor(rule, 'grau', 'kein Seitenlimit im Profil', context.profile?.label || '-', 'Das gewaehlte Profil enthaelt kein maschinenpruefbares Seitenlimit.', rule.recommendation, 1);
      if (!context.pageCount) return resultFor(rule, 'grau', 'Seitenzahl nicht pruefbar', `Format: ${context.doc.format || '-'}.`, 'Die Seitenzahl ist fuer dieses Format nicht belastbar automatisch vorhanden.', rule.recommendation, 1);
      const exceeded = (page.totalMax && context.pageCount > page.totalMax) || (page.max && context.pageCount > page.max);
      return exceeded
        ? resultFor(rule, 'rot', 'Seitenumfang ueberschritten', `Erkannte Seiten: ${context.pageCount}. Profil: ${context.profile.label}.`, 'Die erkannte Seitenzahl liegt ueber dem hinterlegten Limit.', rule.recommendation, 3)
        : resultFor(rule, 'gruen', 'Seitenumfang im pruefbaren Rahmen', `Erkannte Seiten: ${context.pageCount}. Profil: ${context.profile.label}.`, 'Die erkannte Seitenzahl liegt nicht ueber dem hinterlegten Limit.', rule.recommendation, 1);
    }
    case 'KO-004': {
      if (!context.applicationText) return resultFor(rule, 'grau', 'kein Antrag hochgeladen', '-', 'Ohne Projektantrag kann diese KO-Regel nicht belastbar geprueft werden.', 'Projektantrag zusaetzlich hochladen.', 1);
      const applicationWords = [...new Set(lower(context.applicationText).split(/\W+/).filter((word) => word.length >= 7))].slice(0, 80);
      const matches = applicationWords.filter((word) => context.lText.includes(word)).length;
      const ratio = applicationWords.length ? matches / applicationWords.length : 0;
      if (ratio < 0.18 && !context.hasDeviationChapter) {
        return resultFor(rule, 'rot', 'Antrag-Doku-Abgleich kritisch', `Wortueberdeckung: ${Math.round(ratio * 100)}%; keine Abweichungserklaerung erkannt.`, 'Der Antrag laesst sich nur schwach in der Dokumentation wiederfinden.', rule.recommendation, 3);
      }
      if (ratio < 0.3) {
        return resultFor(rule, 'gelb', 'Antrag-Doku-Abgleich unklar', `Wortueberdeckung: ${Math.round(ratio * 100)}%.`, 'Der Antrag ist nur teilweise im Dokumentationskontext erkennbar.', rule.recommendation, 2);
      }
      return resultFor(rule, 'gruen', 'Antragbezug erkennbar', `Wortueberdeckung: ${Math.round(ratio * 100)}%.`, 'Der Projektantrag ist im Dokumentationskontext wiedererkennbar.', rule.recommendation, 1);
    }
    case 'KO-005': {
      const externalHints = context.sourceHints + context.imageCount + context.listingCount;
      if (externalHints > 0 && !context.hasSources) {
        return resultFor(rule, 'rot', 'Quellenangaben fehlen/unklar', `Externe Hinweise/Bilder/Listings: ${externalHints}; Quellenverzeichnis nicht erkannt.`, 'Fremdinhalte oder referenzpflichtige Inhalte sind moeglich, aber ein Quellenverzeichnis wurde nicht erkannt.', rule.recommendation, 3);
      }
      return resultFor(rule, externalHints > 0 ? 'gruen' : 'grau', externalHints > 0 ? 'Quellennachweis erkannt' : 'keine Fremdinhalte sicher erkannt', context.hasSources ? firstEvidence(context.text, [/quellenverzeichnis|literaturverzeichnis|quelle\s*:/i], 'Quellen') : '-', 'Die Quellenlage wurde gegen erkennbare Fremdinhalte geprueft.', rule.recommendation, 1);
    }
    case 'KO-006':
      return context.hasOwnContribution && context.hasDecisionLanguage
        ? resultFor(rule, 'gruen', 'Eigenleistung erkennbar', 'Eigene Umsetzungs-/Entscheidungsbegriffe erkannt.', 'Die Dokumentation zeigt eigene Arbeit und Entscheidungen.', rule.recommendation, 1)
        : resultFor(rule, context.hasOwnContribution ? 'gelb' : 'rot', context.hasOwnContribution ? 'Eigenleistung teilweise erkennbar' : 'Eigenleistung nicht ausreichend erkennbar', context.hasOwnContribution ? 'Umsetzungsbegriffe erkannt, Begruendungen fehlen/unklar.' : '-', 'Die eigene Leistung wird im extrahierten Text nicht ausreichend deutlich.', rule.recommendation, 3);
    default:
      return resultFor(rule, 'grau', 'nicht implementiert', '-', 'Fuer diese KO-Regel gibt es noch keinen spezifischen automatischen Pruefer.', rule.recommendation, 0.5);
  }
}

function evaluateRule(rule, context) {
  const special = evaluateSpecialRule(rule, context);
  if (special) return special;

  const checks = CHECKS[rule.id];
  if (!checks) {
    return resultFor(
      rule,
      'grau',
      'nur manuell pruefbar',
      '-',
      'Das Ruleset-Kriterium ist hinterlegt, aber nicht hinreichend formalisiert, um es automatisch sicher zu bewerten.',
      rule.recommendation,
      Math.max(0.4, (rule.points || 1) * 0.4)
    );
  }

  const options = {
    scope: rule.id === 'FORM-001' ? 'cover' : undefined,
    minMatches: minMatchesForRule(rule, checks)
  };
  return evaluateChecks(rule, context, checks, options);
}

function minMatchesForRule(rule, checks) {
  const criticalAll = new Set(['FORM-001', 'STR-001']);
  if (criticalAll.has(rule.id)) return Math.ceil(checks.length * 0.75);
  if (rule.severity === 'CRITICAL') return Math.min(checks.length, Math.max(2, Math.ceil(checks.length * 0.7)));
  if (rule.severity === 'MAJOR') return Math.min(checks.length, Math.max(2, Math.ceil(checks.length * 0.6)));
  return Math.min(checks.length, Math.max(1, Math.ceil(checks.length * 0.5)));
}

const RED_FLAG_PATTERNS = {
  'RF-001': (context) => {
    const techHits = countRegex(context.text, /\b(?:react|node|java|python|sql|docker|firebase|api|framework|bibliothek|datenbank|cloud|server)\b/gi);
    return techHits >= 8 && !context.hasDecisionLanguage;
  },
  'RF-002': (context) => context.hasRequirements && !context.hasTests,
  'RF-003': (context) => context.hasAppendix && !/siehe\s+(anhang|anlage)|vgl\.\s+(anhang|anlage)/i.test(context.text),
  'RF-004': (context) => context.imageCount >= 8 && countRegex(context.text, /erkl[aä]r|begruend|begründ|beschreibung/gi) < 4,
  'RF-005': (context) => /installation|setup|konfiguration/i.test(context.text) && !context.hasDecisionLanguage,
  'RF-006': (context) => countRegex(context.text, /\b\d+(?:[,.]\d+)?\s*h\b/gi) >= 4 && !/gesamt|summe|80\s*h|40\s*h/i.test(context.text),
  'RF-007': (context) => /wirtschaftlichkeit|kosten[-\s]?nutzen/i.test(context.text) && countRegex(context.text, /\b\d+(?:[,.]\d+)?\s*(?:eur|€|stunden|h)\b/gi) < 3,
  'RF-008': (context) => /als ki[-\s]?sprachmodell|chatgpt|openai|von einer ki|ki[-\s]?generiert/i.test(context.text) && !/ki[-\s]?nachweis|prompt|tool\s*\/\s*url|quellenverzeichnis/i.test(context.text),
  'RF-009': (context) => hasDuplicateNumbering(context.text, /\b(?:Abbildung|Tabelle|Listing)\s+(\d+)/gi),
  'RF-010': (context) => !context.applicationText
};

function hasDuplicateNumbering(text, pattern) {
  const values = [...String(text || '').matchAll(regexWithGlobal(pattern))].map((match) => match[1]);
  return values.some((value, index) => values.indexOf(value) !== index);
}

function evaluateRedFlags(context) {
  return (IHK_ABSCHLUSSPROJEKT_RULESET.red_flags || [])
    .filter((flag) => RED_FLAG_PATTERNS[flag.id]?.(context))
    .map((flag) => ({
      category: 'Ruleset v1 · Red Flags',
      criterion: `${flag.id} ${flag.pattern}`,
      status: flag.id === 'RF-010' ? 'grau' : 'gelb',
      assessment: flag.id === 'RF-010' ? 'nicht pruefbar' : 'auffaellig',
      evidence: flag.message,
      reason: 'Das Ruleset markiert dieses Muster als Red Flag fuer manuelle Nachpruefung.',
      recommendation: flag.id === 'RF-010'
        ? 'Projektantrag hochladen, damit Antrag-Doku-Abgleich und Abweichungen belastbar bewertet werden koennen.'
        : 'Fundstelle manuell pruefen und die Doku gezielt nachschaerfen.',
      severity: flag.id === 'RF-010' ? 'mittel' : 'hoch',
      weight: 0.5,
      ruleset: { id: flag.id, redFlag: true }
    }));
}

const COST_RESOURCE_CHECKS = {
  resources: [
    { label: 'Personal/Rollen', patterns: [/personal|rolle|rollen|entwickler|projektleiter|auftraggeber|stakeholder|fachabteilung|ausbilder/i] },
    { label: 'Hardware/Arbeitsplatz/Infrastruktur', patterns: [/hardware|arbeitsplatz|notebook|pc|server|infrastruktur|netzwerk|arbeitsmittel/i] },
    { label: 'Software/Entwicklungswerkzeuge', patterns: [/software|entwicklungsumgebung|entwicklungswerkzeug|ide|visual studio|vs code|intellij|tool|framework|bibliothek/i] },
    { label: 'Lizenzkosten', patterns: [/lizenz|lizenzkosten|subscription|abo|kostenpflichtig|drittanbieter/i] },
    { label: 'Daten/Datenquellen/Testdaten', patterns: [/datenquelle|testdaten|datensatz|datenbank|csv|json|xml|import|export|migration/i] },
    { label: 'Testressourcen/Testumgebung', patterns: [/testumgebung|testressource|testsystem|qa|qualitaetssicherung|unit[-\s]?test|integrationstest|abnahmetest/i] },
    { label: 'Hosting/Deployment/Betrieb', patterns: [/hosting|deployment|betrieb|produktivsystem|staging|cloud|docker|server|release|rollout/i] },
    { label: 'Sicherheit/Datenschutz/Backup', patterns: [/sicherheit|datenschutz|dsgvo|backup|rechte|rollen|authentifizierung|autorisierung|verschluesselung/i] },
    { label: 'Dokumentation/Schulung/Abnahme', patterns: [/dokumentation|schulung|uebergabe|uebergabe|abnahme|einweisung|benutzerhandbuch|betriebsdokumentation/i] },
    { label: 'rechtliche/administrative Ressourcen', patterns: [/rechtlich|administrativ|freigabe|compliance|vertrag|betriebsrat|datenschutzbeauftragter|genehmigung/i] }
  ],
  costFields: [
    { label: 'Bezeichnung/Kategorie', patterns: [/bezeichnung|kategorie|kostenart|kostenposition|ressource/i] },
    { label: 'Menge/Anzahl/Stunden', patterns: [/menge|anzahl|stunden|\b\d+(?:[,.]\d+)?\s*h\b|personentag|pt\b/i] },
    { label: 'Einzelkosten/Stundensatz', patterns: [/einzelkosten|stundensatz|satz|preis\s+pro|kosten\s+pro|eur\s*\/\s*h|euro\s*\/\s*h/i] },
    { label: 'Gesamtkosten', patterns: [/gesamtkosten|summe|gesamtbetrag|total|kosten\s+gesamt/i] },
    { label: 'Begruendung/Bemerkung', patterns: [/begruendung|bemerkung|annahme|grundlage|kalkulation|herleitung|nachvollziehbar/i] }
  ],
  projectFit: [
    { label: 'Projektziel', patterns: [/projektziel|zielsetzung|ziel\s+des\s+projekts|soll[-\s]?zustand/i] },
    { label: 'Anforderungen', patterns: [/anforderung|akzeptanzkriter|lastenheft|pflichtenheft|funktionale|nichtfunktionale/i] },
    { label: 'Technikstack', patterns: [/technologie|tech[-\s]?stack|framework|programmiersprache|datenbank|api|frontend|backend|server/i] },
    { label: 'Umsetzung', patterns: [/implementierung|realisierung|umsetzung|entwicklung|konfiguration/i] },
    { label: 'Test', patterns: [/test|testfall|testergebnis|qualitaetssicherung|abnahmetest/i] },
    { label: 'Deployment/Dokumentation', patterns: [/deployment|betrieb|hosting|dokumentation|uebergabe|abnahme/i] }
  ],
  personalCosts: [
    { label: 'Rollen', patterns: [/rolle|rollen|entwickler|projektleiter|auftraggeber|fachabteilung|tester/i] },
    { label: 'Stunden', patterns: [/stunden|\b\d+(?:[,.]\d+)?\s*h\b|aufwand|personentag|pt\b/i] },
    { label: 'Stundensatz', patterns: [/stundensatz|eur\s*\/\s*h|euro\s*\/\s*h|kostensatz|tagessatz/i] },
    { label: 'Berechnungslogik', patterns: [/berechnung|kalkulation|formel|summe|gesamt|annahme|grundlage/i] }
  ],
  traceability: [
    { label: 'Ressource', patterns: [/ressource|ressourcenplanung|personal|hardware|software|lizenz|testumgebung/i] },
    { label: 'Kostenposition', patterns: [/kostenposition|kostenplanung|personalkosten|sachkosten|lizenzkosten|gemeinkosten/i] },
    { label: 'Projektphase', patterns: [/projektphase|analysephase|entwurfsphase|implementierungsphase|testphase|abnahmephase/i] },
    { label: 'Nachweisstelle', patterns: [/nachweis|referenz|siehe|vgl\.|matrix|zuordnung|traceability/i] }
  ],
  outputReadiness: [
    { label: 'Vollstaendigkeitsstatus', patterns: [/vollstaendig|vollstaendigkeit|ressourcenplanung|ressourcenliste|ressourcenkatalog/i] },
    { label: 'fehlende Ressourcen', patterns: [/fehlende\s+ressource|nicht\s+vorhanden|offen|unklar|nachreichen|ergaenzen/i] },
    { label: 'Kosten-Findings', patterns: [/kostenfinding|kosten[-\s]?finding|kostenplanung|gemeinkosten|stundensatz|gesamtkosten/i] },
    { label: 'Konsistenzmatrix', patterns: [/konsistenzmatrix|traceability|zuordnung|ressource.*kosten|kosten.*phase|matrix/i] }
  ]
};

const PROJECT_TYPE_RESOURCE_CHECKS = [
  {
    label: 'Web-/CRUD-Anwendung',
    detectors: [/webanwendung|crud|formular|frontend|backend|benutzeroberflaeche|oberflaeche/i],
    resources: [
      { label: 'Frontend/UI', patterns: [/frontend|ui|oberflaeche|oberflaeche|formular|maske/i] },
      { label: 'Backend/API', patterns: [/backend|api|server|endpoint|controller|service/i] },
      { label: 'Datenbank/Persistenz', patterns: [/datenbank|persistenz|repository|sql|tabelle|schema/i] },
      { label: 'Test/Deployment', patterns: [/test|deployment|hosting|betrieb|staging/i] }
    ]
  },
  {
    label: 'Datenbank-/Datenmigrationsprojekt',
    detectors: [/datenmigration|migration|datenbank|import|export|etl|csv|sql/i],
    resources: [
      { label: 'Quelldaten/Zieldaten', patterns: [/quelldaten|zieldaten|datenquelle|datenbestand|datensatz/i] },
      { label: 'Import/Validierung', patterns: [/import|validierung|mapping|transformation|bereinigung/i] },
      { label: 'Datenbank/Schema', patterns: [/datenbank|schema|tabelle|sql|relation/i] },
      { label: 'Testdaten', patterns: [/testdaten|testfall|stichprobe|datenqualitaet/i] }
    ]
  },
  {
    label: 'API-Projekt',
    detectors: [/\bapi\b|rest|graphql|endpoint|schnittstelle|request|response/i],
    resources: [
      { label: 'Endpunkte/Methoden', patterns: [/endpoint|route|get|post|put|delete|methode/i] },
      { label: 'Auth/Sicherheit', patterns: [/authentifizierung|autorisierung|token|oauth|jwt|rechte/i] },
      { label: 'Statuscodes/Fehler', patterns: [/statuscode|http[-\s]?status|fehler|exception|error/i] },
      { label: 'API-Test', patterns: [/postman|integrationstest|api[-\s]?test|testfall|request/i] }
    ]
  },
  {
    label: 'KI-/Automatisierungsprojekt',
    detectors: [/\bki\b|kuenstliche intelligenz|ai\b|machine learning|automatisierung|prompt|modell/i],
    resources: [
      { label: 'Modell/Prompt', patterns: [/modell|prompt|llm|openai|ki[-\s]?modell|training/i] },
      { label: 'Daten/Datenschutz', patterns: [/daten|datenschutz|dsgvo|anonymisierung|personenbezogen/i] },
      { label: 'Evaluation', patterns: [/evaluation|qualitaetsmessung|trefferquote|validierung|benchmark/i] },
      { label: 'Betrieb/Monitoring', patterns: [/betrieb|monitoring|deployment|logging|kontrolle/i] }
    ]
  },
  {
    label: 'Systemintegrationsprojekt',
    detectors: [/systemintegration|server|netzwerk|firewall|backup|monitoring|virtualisierung|infrastruktur/i],
    resources: [
      { label: 'Server/Netzwerk', patterns: [/server|netzwerk|switch|router|firewall|vm|virtualisierung/i] },
      { label: 'Security/Backup', patterns: [/sicherheit|backup|rechte|rollen|hardening|datenschutz/i] },
      { label: 'Monitoring/Betrieb', patterns: [/monitoring|betrieb|wartung|verfuegbarkeit|sla|logging/i] },
      { label: 'Test/Abnahme', patterns: [/test|abnahme|funktionstest|lasttest|protokoll/i] }
    ]
  }
];

function costResourceWeight(rule) {
  if (rule.severity === 'CRITICAL') return 1.3;
  if (rule.severity === 'MAJOR') return 1;
  return 0.45;
}

function costResourceResult(rule, status, assessment, evidence, reason, recommendation, weight = costResourceWeight(rule)) {
  return {
    category: `Ruleset v3 · ${rule.category || 'Kosten/Ressourcen'}`,
    criterion: `${rule.id} ${rule.name}`,
    status,
    assessment,
    evidence: evidence || '-',
    reason,
    recommendation: recommendation || 'Kosten- und Ressourcenplanung gegen das erweiterte Ruleset v3 manuell nachschaerfen.',
    severity: severity(rule),
    weight,
    ruleset: {
      id: rule.id,
      version: KOSTEN_RESSOURCEN_RULESET_V3.version,
      category: rule.category,
      severity: rule.severity,
      kostenRessourcen: true
    }
  };
}

function evaluateCostChecks(rule, context, checks, minMatches, recommendation, weight) {
  const labels = matchedLabels(context.text, checks);
  const missing = checks.map((check) => check.label).filter((label) => !labels.includes(label));
  const partial = Math.max(1, Math.ceil(minMatches * 0.5));

  if (labels.length >= minMatches) {
    return costResourceResult(
      rule,
      'gruen',
      'erfuellt',
      `${labels.length}/${checks.length} Merkmale erkannt: ${labels.join(', ')}`,
      'Die v3-Anforderung wurde anhand der extrahierten Dokumentation ausreichend nachgewiesen.',
      recommendation,
      weight
    );
  }

  if (labels.length >= partial) {
    return costResourceResult(
      rule,
      'gelb',
      'teilweise erkannt',
      `Erkannt: ${labels.join(', ') || '-'}. Fehlt/unklar: ${missing.join(', ') || '-'}.`,
      'Die v3-Anforderung ist teilweise vorhanden, aber nicht vollstaendig oder nicht klar genug belegt.',
      recommendation,
      weight
    );
  }

  return costResourceResult(
    rule,
    missingStatus(rule),
    'nicht ausreichend erkannt',
    `Fehlt/unklar: ${missing.join(', ') || rule.name}.`,
    'Die v3-Anforderung wurde im extrahierten Text nicht belastbar erkannt.',
    recommendation,
    weight
  );
}

function detectProjectType(context) {
  const ranked = PROJECT_TYPE_RESOURCE_CHECKS
    .map((type) => ({
      ...type,
      detectorHits: type.detectors.filter((pattern) => pattern.test(context.text)).length
    }))
    .sort((a, b) => b.detectorHits - a.detectorHits);

  return ranked[0]?.detectorHits ? ranked[0] : null;
}

function evaluateProjectTypeMinimums(rule, context) {
  const projectType = detectProjectType(context);
  if (!projectType) {
    return costResourceResult(
      rule,
      'grau',
      'Projektart nicht sicher erkannt',
      '-',
      'Die Projektart konnte aus dem extrahierten Text nicht sicher genug bestimmt werden.',
      'Projektart im Dokument klar benennen, damit projektartspezifische Ressourcen geprueft werden koennen.',
      0.45
    );
  }

  const labels = matchedLabels(context.text, projectType.resources);
  const missing = projectType.resources.map((check) => check.label).filter((label) => !labels.includes(label));
  if (labels.length >= Math.ceil(projectType.resources.length * 0.75)) {
    return costResourceResult(
      rule,
      'gruen',
      `${projectType.label} plausibel abgedeckt`,
      `Projektart: ${projectType.label}. Erkannt: ${labels.join(', ')}.`,
      'Die erwartbaren Mindestressourcen der erkannten Projektart sind weitgehend nachvollziehbar.',
      'Keine unmittelbare Nacharbeit, sofern die Ressourcen im Kostenplan ebenfalls auftauchen.'
    );
  }

  return costResourceResult(
    rule,
    labels.length >= 2 ? 'gelb' : 'rot',
    `${projectType.label} unvollstaendig abgedeckt`,
    `Projektart: ${projectType.label}. Erkannt: ${labels.join(', ') || '-'}. Fehlt/unklar: ${missing.join(', ') || '-'}.`,
    'Die erkannten Ressourcen passen noch nicht vollstaendig zur Projektart.',
    'Projektart-spezifische Mindestressourcen in Ressourcen- und Kostenplanung ergaenzen.'
  );
}

function evaluateKostenRessourcenRule(rule, context) {
  switch (rule.id) {
    case 'CR-001':
      return evaluateCostChecks(
        rule,
        context,
        COST_RESOURCE_CHECKS.resources,
        7,
        'Ressourcenplanung um fehlende Kategorien wie Testumgebung, Deployment, Sicherheit, Dokumentation oder administrative Ressourcen ergaenzen.'
      );
    case 'CR-002':
      return evaluateCostChecks(
        rule,
        context,
        COST_RESOURCE_CHECKS.projectFit,
        4,
        'Ressourcen sichtbar mit Projektziel, Anforderungen, Technikstack, Umsetzung, Tests und Deployment verknuepfen.'
      );
    case 'CR-003':
      return evaluateCostChecks(
        rule,
        context,
        COST_RESOURCE_CHECKS.costFields,
        4,
        'Kostenplanung tabellarisch mit Bezeichnung, Kategorie, Menge/Stunden, Einzelkosten/Stundensatz, Gesamtkosten und Begruendung ausweisen.'
      );
    case 'CR-004':
      return evaluateCostChecks(
        rule,
        context,
        COST_RESOURCE_CHECKS.personalCosts,
        3,
        'Personalkosten mit Rollen, Stunden, Stundensaetzen und Berechnungslogik nachvollziehbar machen.'
      );
    case 'CR-005': {
      const hasCosts = /kostenplanung|personalkosten|sachkosten|lizenzkosten|gesamtkosten|stundensatz|wirtschaftlichkeit/i.test(context.text);
      const hasOverhead = /gemeinkosten|overhead|verwaltungskosten|pauschale|einzelaufschluesselung|einzelaufschlüsselung|in\s+den\s+stundensaetzen\s+enthalten|in\s+stundensatz\s+enthalten/i.test(context.text);
      if (hasOverhead) {
        return costResourceResult(rule, 'gruen', 'Gemeinkostenmodell erkannt', firstEvidence(context.text, [/gemeinkosten|overhead|verwaltungskosten|pauschale|einzelaufschluesselung|einzelaufschlüsselung|in\s+den\s+stundensaetzen\s+enthalten|in\s+stundensatz\s+enthalten/i], 'Gemeinkosten'), 'Gemeinkosten oder ein Modell fuer enthaltene Gemeinkosten wurden erkannt.', 'Gemeinkostenmodell beibehalten und rechnerisch nachvollziehbar machen.');
      }
      return costResourceResult(
        rule,
        hasCosts ? 'rot' : 'grau',
        hasCosts ? 'Gemeinkosten fehlen/unklar' : 'Kostenplanung nicht sicher erkannt',
        hasCosts ? 'Kostenbegriffe erkannt, aber keine Gemeinkosten oder kein Modell fuer enthaltene Gemeinkosten.' : '-',
        hasCosts ? 'Bei vorhandener Kostenplanung verlangt das v3-Ruleset einen Gemeinkostenbezug.' : 'Ohne sicher erkannte Kostenplanung kann Gemeinkostenbezug nicht belastbar bewertet werden.',
        'Gemeinkosten als Pauschale, Einzelaufschluesselung oder explizit im Stundensatz enthalten ausweisen.'
      );
    }
    case 'CR-006': {
      const hasZero = /\b0\s*(?:eur|euro|€)|kostenlos|ohne\s+kosten|freie\s+software|open[-\s]?source|vorhandene\s+(?:infrastruktur|lizenz|hardware|software)|bestehende\s+lizenz/i.test(context.text);
      const hasReason = /begruendung|grund|weil|da\s+bereits|vorhanden|bestehend|freie\s+software|open[-\s]?source|lizenz\s+bereits|infrastruktur\s+bereits/i.test(context.text);
      if (!hasZero) {
        return costResourceResult(rule, 'grau', 'keine 0-Euro-Position erkannt', '-', 'Im extrahierten Text wurde keine explizite 0-Euro- oder vorhandene Ressource gefunden.', 'Falls Ressourcen kostenlos angesetzt werden, diese trotzdem kurz begruenden.', 0.45);
      }
      return costResourceResult(
        rule,
        hasReason ? 'gruen' : 'gelb',
        hasReason ? '0-Euro-Begruendung plausibel' : '0-Euro-Begruendung fehlt/unklar',
        firstEvidence(context.text, [/\b0\s*(?:eur|euro|€)|kostenlos|ohne\s+kosten|freie\s+software|open[-\s]?source|vorhandene\s+(?:infrastruktur|lizenz|hardware|software)|bestehende\s+lizenz/i], '0-Euro/Bestand'),
        hasReason ? 'Kostenlose oder vorhandene Ressourcen werden begruendet.' : 'Kostenlose oder vorhandene Ressourcen wurden erkannt, aber nicht ausreichend begruendet.',
        '0-Euro-Positionen mit vorhandener Infrastruktur, freier Software oder bestehender Lizenz begruenden.'
      );
    }
    case 'CR-007':
      return evaluateCostChecks(
        rule,
        context,
        COST_RESOURCE_CHECKS.traceability,
        3,
        'Ressourcen, Kostenpositionen, Projektphasen und Nachweisstellen in einer Matrix oder klaren Zuordnung verbinden.'
      );
    case 'CR-008': {
      const checks = [
        { label: 'Zeitplanung', patterns: [/zeitplanung|projektphase|arbeitspaket|meilenstein|\b\d+(?:[,.]\d+)?\s*h\b/i] },
        { label: 'Personalkosten', patterns: [/personalkosten|stundensatz|kostensatz|lohn|gehalt/i] },
        { label: 'Rollen', patterns: [/rolle|rollen|entwickler|projektleiter|tester|auftraggeber/i] },
        { label: 'Stundenabgleich', patterns: [/gesamtstunden|summe|abweichung|soll[-\s]?ist|stunden.*kosten|kosten.*stunden/i] }
      ];
      return evaluateCostChecks(rule, context, checks, 3, 'Stunden aus Zeitplanung sichtbar mit Rollen und Personalkosten abgleichen.');
    }
    case 'CR-009': {
      const checks = [
        { label: 'Wirtschaftlichkeit', patterns: [/wirtschaftlichkeit|kosten[-\s]?nutzen|amortisation|break[-\s]?even|rentabilitaet/i] },
        { label: 'Kostenbasis', patterns: [/kostenplanung|gesamtkosten|personalkosten|sachkosten|lizenzkosten|gemeinkosten/i] },
        { label: 'Nutzen/Einsparung', patterns: [/nutzen|einsparung|zeitersparnis|qualitaetsgewinn|mehrwert|roi/i] },
        { label: 'Berechnung/Herleitung', patterns: [/berechnung|annahme|herleitung|formel|pro\s+monat|pro\s+jahr|stunden\s+pro/i] }
      ];
      return evaluateCostChecks(rule, context, checks, 3, 'Wirtschaftlichkeitsanalyse auf konkrete Kostenplanung stuetzen und Nutzen/Einsparungen rechnerisch herleiten.');
    }
    case 'CR-010':
      return evaluateCostChecks(
        rule,
        context,
        COST_RESOURCE_CHECKS.resources,
        6,
        'Ressourcen-Katalog als Checkliste nutzen und fehlende Kategorien markieren.',
        0.45
      );
    case 'CR-011':
      return evaluateProjectTypeMinimums(rule, context);
    case 'CR-012': {
      const checks = [
        { label: 'Stakeholder', patterns: [/stakeholder|auftraggeber|fachabteilung|kunde|anwender|ausbilder|projektbetreuer|datenschutzbeauftragter/i] },
        { label: 'Aufwand/Zeit', patterns: [/aufwand|zeitplanung|stunden|\b\d+(?:[,.]\d+)?\s*h\b|workshop|abstimmung|interview/i] },
        { label: 'Ressourcen/Kosten', patterns: [/ressourcenplanung|kostenplanung|personalkosten|stundensatz|rolle/i] }
      ];
      return evaluateCostChecks(rule, context, checks, 2, 'Aktive Stakeholder mit Aufwand, Rollen, Ressourcen oder Kosten im Plan abbilden.');
    }
    case 'CR-013': {
      const hasRisk = /risiko|risiken|swot|risikomatrix|eintrittswahrscheinlichkeit|auswirkung|gegenmassnahme|gegenmaßnahme|massnahme|maßnahme/i.test(context.text);
      const linked = /ressource|kosten|puffer|zeitplanung|testplanung|testfall|gemeinkosten|budget/i.test(context.text);
      if (hasRisk && linked) {
        return costResourceResult(rule, 'gruen', 'Risiko-Bezug erkannt', firstEvidence(context.text, [/risiko|swot|puffer|gegenmassnahme|gegenmaßnahme|massnahme|maßnahme/i], 'Risiko'), 'Risiken werden mit Ressourcen, Zeit, Tests oder Kosten in Verbindung gebracht.', 'Risiko-Bezug beibehalten und bei kritischen Risiken konkrete Puffer oder Massnahmen nennen.');
      }
      return costResourceResult(
        rule,
        hasRisk ? 'gelb' : 'gelb',
        hasRisk ? 'Risiko-Bezug teilweise erkannt' : 'Risikoanalyse fehlt/unklar',
        hasRisk ? 'Risiken erkannt, aber Bezug zu Kosten/Ressourcen/Zeit/Test bleibt unklar.' : '-',
        'Das v3-Ruleset erwartet, dass relevante Risiken in Ressourcen, Zeitpuffern, Testplanung oder Kostenplanung sichtbar werden.',
        'Risiken mit Massnahmen, Puffern, Testabdeckung oder Kosten-/Ressourcenauswirkungen verknuepfen.'
      );
    }
    case 'CR-014': {
      const templatePatterns = [/todo|tbd|lorem\s+ipsum|muster|vorlage|beispiel\s+gmbh|max\s+mustermann|platzhalter|xxx|<[^>]+>/i];
      const found = templatePatterns.some((pattern) => pattern.test(context.text));
      return costResourceResult(
        rule,
        found ? 'gelb' : 'gruen',
        found ? 'Vorlagenrest moeglich' : 'keine typischen Vorlagenreste erkannt',
        found ? firstEvidence(context.text, templatePatterns, 'Vorlagenrest') : '-',
        found ? 'Typische Platzhalter oder Vorlagenreste koennen auf nicht individualisierte Kosten-/Ressourcenplanung hinweisen.' : 'Keine typischen Platzhalter oder Vorlagenreste wurden maschinenlesbar erkannt.',
        found ? 'Platzhalter entfernen und Ressourcen/Kosten auf das konkrete Projekt zuschneiden.' : 'Keine unmittelbare Nacharbeit aus dieser Regel.'
      );
    }
    case 'CR-015':
      return evaluateCostChecks(
        rule,
        context,
        COST_RESOURCE_CHECKS.outputReadiness,
        2,
        'Pruefausgabe sollte Vollstaendigkeitsstatus, fehlende Ressourcen, Kosten-Findings und Konsistenzmatrix enthalten.',
        0.45
      );
    default:
      return costResourceResult(rule, 'grau', 'nur manuell pruefbar', '-', 'Fuer diese v3-Regel gibt es noch keinen spezifischen automatischen Pruefer.', 'Regel manuell gegen die Dokumentation pruefen.', 0.35);
  }
}

function evaluateKostenRessourcenRuleset(context) {
  const results = (KOSTEN_RESSOURCEN_RULESET_V3.rules || [])
    .map((rule) => evaluateKostenRessourcenRule(rule, context));

  return {
    metadata: {
      version: KOSTEN_RESSOURCEN_RULESET_V3.version,
      evaluatedRules: results.length,
      criticalFindings: results.filter((result) => result.status === 'rot').length,
      warnings: results.filter((result) => result.status === 'gelb').length,
      passed: results.filter((result) => result.status === 'gruen').length
    },
    results
  };
}

function buildRulesetSummary(results) {
  const ruleResults = results.filter((result) => result.ruleset?.points);
  const weighted = ruleResults.reduce((acc, result) => {
    acc.total += result.ruleset.points;
    acc.score += (statusScore[result.status] ?? 0) * result.ruleset.points;
    return acc;
  }, { score: 0, total: 0 });
  const score = weighted.total ? Math.round((weighted.score / weighted.total) * 100) : 0;
  const band = (IHK_ABSCHLUSSPROJEKT_RULESET.score_model?.rating_bands || [])
    .find((item) => score >= item.min && score <= item.max);

  const categoryScores = (IHK_ABSCHLUSSPROJEKT_RULESET.score_model?.categories || []).map((category) => {
    const categoryResults = ruleResults.filter((result) => result.ruleset.category === category.id);
    const categoryWeighted = categoryResults.reduce((acc, result) => {
      acc.total += result.ruleset.points;
      acc.score += (statusScore[result.status] ?? 0) * result.ruleset.points;
      return acc;
    }, { score: 0, total: 0 });
    return {
      id: category.id,
      name: category.name,
      maxPoints: category.max_points,
      evaluatedPoints: categoryWeighted.total,
      score: categoryWeighted.total ? Math.round((categoryWeighted.score / categoryWeighted.total) * category.max_points * 10) / 10 : 0
    };
  });

  return {
    id: IHK_ABSCHLUSSPROJEKT_RULESET.ruleset?.id,
    version: IHK_ABSCHLUSSPROJEKT_RULESET.ruleset?.version,
    score,
    rating: band?.label || '',
    risk: band?.risk || '',
    evaluatedRules: ruleResults.length,
    redFlags: results.filter((result) => result.ruleset?.redFlag).length,
    categoryScores
  };
}

export function evaluateAbschlussprojektRuleset({ doc, AntragDoc, options = {}, profile }) {
  const context = buildContext({ doc, AntragDoc, options, profile });
  const blockerResults = (IHK_ABSCHLUSSPROJEKT_RULESET.blocker_rules || []).map((rule) => evaluateBlocker(rule, context));
  const ruleResults = (IHK_ABSCHLUSSPROJEKT_RULESET.rules || []).map((rule) => evaluateRule(rule, context));
  const kostenRessourcenEvaluation = evaluateKostenRessourcenRuleset(context);
  const redFlagResults = evaluateRedFlags(context);
  const results = [...blockerResults, ...ruleResults, ...kostenRessourcenEvaluation.results, ...redFlagResults];

  return {
    metadata: {
      ruleset: IHK_ABSCHLUSSPROJEKT_RULESET.ruleset,
      kostenRessourcenRuleset: kostenRessourcenEvaluation.metadata,
      severityLevels: IHK_ABSCHLUSSPROJEKT_RULESET.severity_levels,
      scoreModel: IHK_ABSCHLUSSPROJEKT_RULESET.score_model,
      evaluationFlow: IHK_ABSCHLUSSPROJEKT_RULESET.evaluation_flow,
      summary: buildRulesetSummary(results)
    },
    results
  };
}
