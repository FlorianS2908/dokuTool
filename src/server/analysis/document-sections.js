function normalize(text = '') {
  return String(text || '').replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function lower(text = '') {
  return normalize(text).toLowerCase();
}

function firstIndex(text, patterns = []) {
  const lText = lower(text);
  let best = -1;
  for (const pattern of patterns) {
    const match = pattern.exec(lText);
    if (match && (best === -1 || match.index < best)) best = match.index;
  }
  return best;
}

function sectionSlice(text, patterns, fallbackStart = 0, maxLength = 9000) {
  const raw = normalize(text);
  const index = firstIndex(raw, patterns);
  const start = index >= 0 ? index : fallbackStart;
  return raw.slice(start, Math.min(raw.length, start + maxLength)).trim();
}

function aroundTerms(text, patterns, radius = 3000) {
  const raw = normalize(text);
  const index = firstIndex(raw, patterns);
  if (index < 0) return '';
  return raw.slice(Math.max(0, index - radius), Math.min(raw.length, index + radius)).trim();
}

const SECTION_DEFINITIONS = {
  tableOfContents: [/inhaltsverzeichnis|table of contents|\binhalt\b/i],
  introduction: [/einleitung|projektumfeld|projektziel|projektbegruendung|projektbegründung/i],
  projectEnvironment: [/projektumfeld|ausgangssituation|unternehmen|ausbildungsbetrieb|auftraggeber/i],
  projectGoal: [/projektziel|zielsetzung|ziel des projekts|soll[-\s]?zustand/i],
  projectReason: [/projektbegruendung|projektbegründung|wirtschaftliche einordnung|notwendigkeit|bedarf/i],
  projectInterfaces: [/projektschnittstellen|schnittstellen|systemgrenze|externe systeme/i],
  projectScope: [/projektabgrenzung|abgrenzung|in[-\s]?scope|out[-\s]?of[-\s]?scope/i],
  analysis: [/analysephase|ist[-\s]?analyse|soll[-\s]?analyse|anforderungsanalyse|stakeholderanalyse/i],
  currentState: [/ist[-\s]?zustand|ist[-\s]?analyse|ausgangssituation|aktueller zustand/i],
  targetState: [/soll[-\s]?zustand|soll[-\s]?analyse|soll[-\s]?konzept|zielzustand/i],
  requirements: [/anforderungsanalyse|anforderungen|funktionale anforderung|nichtfunktionale anforderung|lastenheft|pflichtenheft/i],
  stakeholderAnalysis: [/stakeholderanalyse|stakeholder|projektbeteiligte|fachabteilung|anwender/i],
  utilityAnalysis: [/nutzwertanalyse|nutzwert|bewertungsmatrix|gewichtung|alternative/i],
  dataAnalysis: [/datenanalyse|datenquelle|datenmodell|datenbestand|datenstruktur/i],
  economicAnalysis: [/wirtschaftlichkeitsanalyse|wirtschaftlichkeit|kosten[-\s]?nutzen|amortisation|break[-\s]?even|make[-\s]?or[-\s]?buy/i],
  projectPlanning: [/projektplanung|zeitplanung|projektphasen|meilenstein|arbeitspaket/i],
  projectPhases: [/projektphasen|phasenplanung|analysephase|entwurfsphase|implementierungsphase|testphase/i],
  resourcePlanning: [/ressourcenplanung|ressourcen|personal|hardware|software|lizenz|testumgebung/i],
  developmentProcess: [/entwicklungsprozess|vorgehensmodell|wasserfall|scrum|kanban|agil|iterativ/i],
  design: [/entwurfsphase|entwurf|systementwurf|architektur|design|datenmodell|schnittstellendesign/i],
  targetPlatform: [/zielplattform|laufzeitumgebung|betriebssystem|hosting|deploymentziel|serverumgebung/i],
  interfaceDesign: [/schnittstellendesign|\bapi\b|endpoint|rest|graphql|import|export|frontend[-\s]?backend/i],
  architectureDesign: [/architekturdesign|architektur|schichtenmodell|komponenten|modul|pattern/i],
  dataModel: [/datenmodell|er[-\s]?modell|erd|tabellenmodell|relation|datenbank|schema/i],
  businessLogic: [/geschaeftslogik|geschäftslogik|fachlogik|algorithmus|validierung|berechnung/i],
  implementation: [/implementierungsphase|implementierung|realisierung|umsetzung|entwicklung/i],
  qualityManagement: [/qualitaetsmanagement|qualitätsmanagement|qualitaetssicherung|qualitätssicherung|teststrategie|testphase|deployment/i],
  documentation: [/projektdokumentation|entwicklerdokumentation|kundendokumentation|benutzerhandbuch|betriebsdokumentation/i],
  conclusion: [/\bfazit\b|schlussbetrachtung|lessons learned|ausblick|soll[-\s]?ist[-\s]?vergleich|abnahme/i],
  appendix: [/\banhang\b|\banlagen\b|appendix/i],
  sources: [/quellenverzeichnis|literaturverzeichnis|quellen|literatur/i],
  declarations: [/eigenstaendigkeit|eigenständigkeit|selbststaendigkeit|selbstständigkeit|persoenliche erklaerung|persönliche erklärung/i]
};

export function extractDocumentSections(doc = {}) {
  const text = normalize(doc.bodyText || doc.text || '');
  const cover = text.slice(0, 4500);
  const sections = {
    fullText: text,
    cover,
    structure: doc.structure || {},
    images: Array.isArray(doc.images) ? doc.images : [],
    warnings: doc.warnings || []
  };

  for (const [key, patterns] of Object.entries(SECTION_DEFINITIONS)) {
    sections[key] = sectionSlice(text, patterns);
  }

  sections.tableOfContents = aroundTerms(text, SECTION_DEFINITIONS.tableOfContents, 500);
  sections.sources = aroundTerms(text, SECTION_DEFINITIONS.sources, 3500);
  sections.appendix = aroundTerms(text, SECTION_DEFINITIONS.appendix, 4500);
  sections.declarations = aroundTerms(text, SECTION_DEFINITIONS.declarations, 1800);

  return sections;
}

export { SECTION_DEFINITIONS };
