import assert from 'node:assert/strict';
import {
  addAuditStep,
  addEvidenceAudit,
  addPromptAudit,
  addRuleMappingAudit,
  createAnalysisAudit,
  finalizeAudit
} from '../src/server/audit/analysis-audit-log.js';
import { buildVisualReportModel } from '../src/server/audit/visual-report-model.js';
import { createExcel } from '../server.js';

const audit = createAnalysisAudit({
  document: {
    fileName: 'audit-test.txt',
    format: 'txt',
    sizeBytes: 1200
  },
  outline: {
    chapters: [
      { id: 'ch_1', number: '1', title: 'Analysephase', level: 1, textExcerpt: 'Kurzer Auszug', wordCount: 12 }
    ]
  }
});

assert.ok(audit.id, 'createAnalysisAudit erzeugt keine ID.');
assert.equal(audit.steps.length, 0, 'Grundstruktur sollte leere Schritte enthalten.');

addAuditStep(audit, {
  id: 'outline_extraction',
  label: 'Kapitelstruktur erkannt',
  status: 'success',
  durationMs: 12,
  summary: 'Ein Kapitel erkannt.',
  details: { apiKey: 'sk-test-secret-should-not-survive', note: 'ok' }
});
assert.equal(audit.steps.length, 1, 'addAuditStep speichert Schritte nicht.');

addRuleMappingAudit(audit, {
  chapterId: 'ch_1',
  chapterTitle: 'Analysephase',
  detectedMeaning: 'Analyse / Anforderungen',
  ruleId: 'AN-01',
  ruleTitle: 'Ist-Zustand beschreiben',
  mappingReason: 'Kapitel passt zur Analysephase.',
  confidence: 0.88,
  status: 'gelb'
});
assert.equal(audit.ruleMappings.length, 1, 'addRuleMappingAudit speichert Mapping nicht.');

addEvidenceAudit(audit, {
  ruleId: 'AN-01',
  section: 'analysis',
  quote: 'Der Ist-Zustand wird beschrieben.',
  evidenceQuality: 'medium',
  reason: 'Analysebegriff erkannt.'
});

addPromptAudit(audit, {
  title: 'Audit-Prompt',
  taskType: 'check_chapter',
  includedRuleIds: ['AN-01'],
  includedChapterIds: ['ch_1'],
  estimatedContextSize: 600,
  prompt: 'Bitte Kapitel prüfen. apiKey: sollte nicht als Feld existieren.'
});

const report = {
  summary: { score: 70 },
  metadata: { fileName: 'audit-test.txt', format: 'txt', warnings: [] },
  results: [
    {
      category: 'Analyse',
      criterion: 'Ist-Zustand',
      status: 'gelb',
      assessment: 'teilweise',
      evidence: 'Der Ist-Zustand wird beschrieben.',
      reason: 'Teilweise belegt.',
      recommendation: 'Mehr Details ergänzen.',
      severity: 'mittel',
      ruleset: { id: 'AN-01' }
    }
  ],
  ai: { used: false }
};

const finalized = finalizeAudit(audit, report);
assert.equal(finalized.summary.score, 70, 'finalizeAudit berechnet Summary nicht.');
assert.equal(finalized.summary.yellowCount, 1, 'finalizeAudit zählt gelb nicht.');

const visual = buildVisualReportModel({ auditReport: finalized });
assert.ok(visual.summaryCards.length > 0, 'visual-report-model erzeugt keine UI-Daten.');
assert.ok(visual.matrix.length > 0, 'visual-report-model erzeugt keine Matrix.');

const serialized = JSON.stringify(finalized);
assert.ok(!/"apiKey"\s*:/i.test(serialized), 'auditReport enthält apiKey-Feld.');
assert.ok(!/sk-[a-z0-9_-]{8,}/i.test(serialized), 'auditReport enthält API-Key-Muster.');
assert.ok(!serialized.includes('vollständige Doku'), 'auditReport enthält vollständige Doku.');

const excelBuffer = await createExcel({ ...report, auditReport: finalized });
assert.ok(Buffer.byteLength(Buffer.from(excelBuffer)) > 0, 'Excel-Export akzeptiert auditReport nicht.');

console.log('Audit report tests completed.');
