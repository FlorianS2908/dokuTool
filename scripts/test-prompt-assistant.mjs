import assert from 'node:assert/strict';
import { extractDocumentOutline } from '../src/server/analysis/document-outline.js';
import { extractDocumentSections } from '../src/server/analysis/document-sections.js';
import { mapRulesToOutline } from '../src/server/rules/rule-outline-mapper.js';
import { simplifyRuleForUser } from '../src/server/rules/rule-simplifier.js';
import { buildUserPrompt } from '../src/server/prompting/prompt-builder.js';
import { FIAE_RULESET_V2 } from '../ruleset-evaluator.js';

const docText = `
1 Einleitung
Dieses Projekt entwickelt eine interne Webanwendung.

2 Analysephase
Der Ist-Zustand beschreibt manuelle Ablage. Der Soll-Zustand beschreibt eine Anwendung mit Anforderungen,
Datenanalyse, Stakeholdern und Nutzwertanalyse. Die Datenquelle ist eine relationale Datenbank.

2.1 Datenanalyse
Es werden Kundendaten, Projektberichte und Pruefergebnisse gespeichert. Primaerschluessel und Beziehungen werden beschrieben.

3 Entwurfsphase
Das Datenmodell und die Schnittstellen werden als REST API beschrieben. Ein UML Klassendiagramm ist vorgesehen.

4 Testphase
Testfaelle, Abnahme und Qualitaetssicherung werden dokumentiert.

5 Fazit
Der Soll-Ist-Vergleich bewertet Ergebnis und Abweichungen.
`;

const doc = {
  fileName: 'test-doku.txt',
  text: docText,
  bodyText: docText,
  structure: {},
  images: []
};

const outline = extractDocumentOutline(doc);
const flatChapters = [];
function flatten(chapters) {
  for (const chapter of chapters) {
    flatChapters.push(chapter);
    flatten(chapter.children || []);
  }
}
flatten(outline.chapters);

assert.ok(flatChapters.some((chapter) => chapter.number === '2' && /Analyse/.test(chapter.title)), 'Analysekapitel muss erkannt werden.');
assert.ok(flatChapters.some((chapter) => chapter.number === '2.1' && /Datenanalyse/.test(chapter.title)), 'Unterkapitel muss erkannt werden.');

const sections = extractDocumentSections(doc);
const ruleMatrix = mapRulesToOutline({
  outline,
  ruleset: FIAE_RULESET_V2,
  sections,
  doc,
  AntragDoc: null
});

const analysisEntry = ruleMatrix.matrix.find((entry) => /Analyse/.test(entry.chapterTitle));
assert.ok(analysisEntry, 'Analyse-Matrixeintrag muss vorhanden sein.');
assert.ok(analysisEntry.matchedRules.some((rule) => /^AN-/.test(rule.ruleId)), 'Analyse-Regeln muessen Analysekapitel zugeordnet werden.');

const anRule = FIAE_RULESET_V2.rules.find((rule) => rule.id === 'AN-01');
const simplified = simplifyRuleForUser(anRule);
assert.ok(simplified.simpleTitle, 'simpleTitle muss erzeugt werden.');
assert.ok(Array.isArray(simplified.userChecklist) && simplified.userChecklist.length > 0, 'userChecklist muss erzeugt werden.');

const promptMeta = buildUserPrompt({
  taskType: 'check_chapter',
  chapter: {
    id: analysisEntry.chapterId,
    number: analysisEntry.chapterNumber,
    title: analysisEntry.chapterTitle,
    detectedMeaning: analysisEntry.detectedMeaning,
    textExcerpt: analysisEntry.textExcerpt,
    wordCount: analysisEntry.wordCount
  },
  matchedRules: analysisEntry.matchedRules.slice(0, 2),
  missingRules: analysisEntry.missingExpectedRules.slice(0, 1),
  evidence: analysisEntry.matchedRules.slice(0, 2).map((rule) => ({ section: rule.ruleId, quote: rule.evidence })),
  references: [],
  userInstruction: 'Bitte besonders auf Datenanalyse achten.'
});

assert.ok(promptMeta.prompt.includes('AN-'), 'Prompt muss Regel-ID enthalten.');
assert.ok(promptMeta.prompt.includes('Statuslogik'), 'Prompt muss Statuslogik enthalten.');
assert.ok(promptMeta.prompt.includes('Kapitelkontext'), 'Prompt muss Kapitelkontext enthalten.');
assert.ok(promptMeta.prompt.length < docText.length + 5000, 'Prompt darf nicht unnoetig die komplette Doku enthalten.');

const promptWithoutEvidence = buildUserPrompt({
  taskType: 'check_chapter',
  chapter: { id: 'ch_x', title: 'Leeres Kapitel', textExcerpt: 'Kurzer Auszug' },
  matchedRules: [analysisEntry.matchedRules[0]],
  missingRules: [],
  evidence: []
});
assert.ok(promptWithoutEvidence.warnings.some((warning) => /Fundstellen/i.test(warning)), 'Warnung bei fehlenden Fundstellen erwartet.');

console.log('Prompt assistant tests completed.');
