import { extractDocumentSections } from '../src/server/analysis/document-sections.js';
import { evaluateFiaeRulesetV2 } from '../src/server/rules/fiae-ruleset-v2-evaluator.js';
import { detectReviewConflicts } from '../src/server/review/conflict-detector.js';
import { buildConsensusItem } from '../src/server/review/consensus-builder.js';
import { createReviewItem } from '../src/server/review/review-schema.js';
import { createExcel } from '../server.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const doc = {
  fileName: 'demo.docx',
  format: 'docx',
  fileSizeBytes: 1200,
  pageCount: 12,
  bodyText: `
    Inhaltsverzeichnis
    Einleitung Projektumfeld Projektziel Projektbegruendung Projektschnittstellen Projektabgrenzung
    Analysephase Ist-Analyse Soll-Analyse Anforderungsanalyse Stakeholderanalyse Nutzwertanalyse Datenanalyse
    Wirtschaftlichkeitsanalyse Kosten-Nutzen Amortisation Break-even Make-or-Buy Projektkosten Ressourcenplanung
    Projektplanung Analysephase Entwurfsphase Implementierungsphase Testphase Abnahme Dokumentation 80 h
    Entwurfsphase Architekturdesign Datenmodell Schnittstellendesign API Endpoint JSON Statuscode Geschaeftslogik
    Implementierungsphase Datenstrukturen Exception Handling Event Handling Bibliotheken
    Qualitaetsmanagement Teststrategie statische Quellcodeanalyse automatisierte Tests manuelle Tests Deployment
    Fazit Abnahme Soll-Ist-Vergleich Ausblick
    UML Abbildung 1 Klassendiagramm Sequenzdiagramm
    Quellenverzeichnis Anhang Eigenstaendigkeitserklaerung
  `,
  text: '',
  headerText: 'Projekt Demo',
  footerText: 'Seite 1',
  structure: {
    bodyImageCount: 1,
    tableCount: 1,
    headerImageCount: 1,
    footerImageCount: 0,
    pageFieldInFooter: true
  },
  images: [{ fileName: 'uml.png', nearbyText: 'Abbildung 1 UML Klassendiagramm', contentType: 'image/png' }]
};
doc.text = doc.bodyText;

const sections = extractDocumentSections(doc);
const evaluation = evaluateFiaeRulesetV2({ doc, sections });
assert(evaluation.results.length > 100, 'FIAE Evaluator liefert zu wenige Ergebnisse.');
assert(evaluation.results.every((item) => item.category && item.criterion && item.status && item.evidence && item.reason && item.recommendation && item.ruleset?.id), 'Evaluator-Ergebnisformat ist unvollstaendig.');

const primary = createReviewItem({
  reviewer: 'primary',
  ruleId: 'FG-02',
  status: 'gruen',
  confidence: 0.9,
  evidence: [{ section: 'tableOfContents', quote: 'Inhaltsverzeichnis', evidenceQuality: 'strong' }]
});
const counter = createReviewItem({
  reviewer: 'counter',
  ruleId: 'FG-02',
  status: 'rot',
  confidence: 0.8,
  evidence: []
});
const conflicts = detectReviewConflicts(primary, counter, { id: 'FG-02' });
assert(conflicts.some((item) => item.level === 'hoch'), 'Conflict Detector erkennt gruen-vs-rot nicht als hohen Konflikt.');

const consensus = buildConsensusItem({
  ruleId: 'FG-02',
  baseResult: evaluation.results[0],
  reviews: [primary, counter],
  conflicts
});
assert(consensus.finalStatus, 'Consensus Builder erzeugt keinen finalStatus.');

const baseReport = {
  summary: { score: 80, grade: 'Test', redCount: 0, yellowCount: 1, grayCount: 0, note: 'Test' },
  metadata: { fileName: 'demo.docx', format: 'docx', headings: [], docxStructure: {}, warnings: [] },
  results: evaluation.results.slice(0, 3),
  ai: { used: false }
};

const withoutConsensus = await createExcel(baseReport);
assert(Buffer.byteLength(Buffer.from(withoutConsensus)) > 0, 'Excel-Export ohne aiConsensus ist leer.');

const withConsensus = await createExcel({
  ...baseReport,
  aiConsensus: {
    enabled: true,
    maxRounds: 3,
    completedRounds: 1,
    consensusReached: false,
    openConflictCount: conflicts.length,
    manualReviewCount: 1,
    reviewedRuleCount: 1,
    items: [consensus]
  }
});
assert(Buffer.byteLength(Buffer.from(withConsensus)) > 0, 'Excel-Export mit aiConsensus ist leer.');

console.log('Review workflow test completed.');
process.exit(0);
