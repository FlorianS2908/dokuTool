import { getPromptTemplate } from './prompt-templates.js';

const STATUS_LOGIC = {
  gruen: 'vorhanden und plausibel',
  gelb: 'vorhanden, aber unvollstaendig oder schwach belegt',
  rot: 'fehlt, passt nicht oder ist fachlich riskant',
  grau: 'nicht sicher automatisch pruefbar, manuell pruefen'
};

function clean(text = '') {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function trimText(text = '', max = 900) {
  const value = clean(text);
  return value.length > max ? `${value.slice(0, max).trim()} ...` : value;
}

function normalizeRules(rules = []) {
  return (Array.isArray(rules) ? rules : [])
    .filter(Boolean)
    .slice(0, 16);
}

function ruleLine(rule) {
  const parts = [
    `${rule.ruleId || rule.id || '-'}: ${rule.simpleTitle || rule.title || 'Regel'}`,
    `Status: ${rule.status || 'grau'}`,
    `Schwere: ${rule.severity || 'mittel'}`
  ];
  const explanation = rule.simpleExplanation ? `Erwartung: ${trimText(rule.simpleExplanation, 260)}` : '';
  const recommendation = rule.recommendation ? `Empfehlung: ${trimText(rule.recommendation, 220)}` : '';
  return `- ${parts.join(' | ')}${explanation ? `\n  ${explanation}` : ''}${recommendation ? `\n  ${recommendation}` : ''}`;
}

function missingRuleLine(rule) {
  return `- ${rule.ruleId || rule.id || '-'}: ${rule.simpleTitle || rule.title || 'Fehlender Punkt'}\n  Grund: ${trimText(rule.reason || rule.simpleExplanation || 'Kein klarer Nachweis erkannt.', 260)}`;
}

function evidenceLines(evidence = []) {
  const list = Array.isArray(evidence) ? evidence : [];
  return list
    .filter(Boolean)
    .slice(0, 8)
    .map((item) => {
      if (typeof item === 'string') return `- ${trimText(item, 320)}`;
      return `- ${item.section || 'Fundstelle'}: ${trimText(item.quote || item.evidence || item.text || '', 320)}`;
    });
}

function referenceLines(references = []) {
  return (Array.isArray(references) ? references : [])
    .slice(0, 6)
    .map((reference) => `- ${reference.title || reference.id} (${(reference.topics || []).slice(0, 4).join(', ') || 'Referenz'})`);
}

function taskInstruction(taskType, userInstruction = '') {
  const base = {
    check_chapter: 'Pruefe, ob das Kapitel die ausgewaehlten IHK-Regeln nachvollziehbar erfuellt.',
    find_missing_content: 'Finde fehlende oder zu schwach belegte Inhalte und erklaere, wo nachgearbeitet werden sollte.',
    improve_structure: 'Bewerte die Kapitelstruktur und schlage eine bessere Reihenfolge oder klarere Unterteilung vor.',
    create_todo_list: 'Erstelle eine konkrete To-do-Liste fuer die Nacharbeit, priorisiert nach IHK-Risiko.',
    check_ihk_risk: 'Bewerte das Risiko fuer die IHK-Abgabe und nenne die kritischsten Punkte.',
    prepare_multi_ai_review: 'Bereite eine regelgebundene Zweitpruefung vor und markiere offene Konflikte.',
    check_application_alignment: 'Pruefe, ob Kapitel und Projektantrag fachlich zusammenpassen.',
    check_uml: 'Pruefe UML-Bezug, Notation, Diagrammtyp und fachliche Passung zur Dokumentation.',
    check_quality_management: 'Pruefe Teststrategie, Testfaelle, Abnahme und Qualitaetssicherung.',
    check_data_model: 'Pruefe Datenmodell, Entitaeten, Felder, Schluessel, Beziehungen und Bezug zur Umsetzung.',
    custom: 'Bearbeite die Nutzeranweisung, bleibe aber strikt am Kapitel, an den Regeln und an den Fundstellen.'
  }[taskType] || 'Pruefe das Kapitel regelgebunden.';

  return userInstruction ? `${base}\nBesonderer Wunsch des Nutzers: ${clean(userInstruction)}` : base;
}

function collectRuleIds(rules = []) {
  return [...new Set(rules.map((rule) => rule.ruleId || rule.id).filter(Boolean))];
}

export function buildUserPrompt({
  taskType = 'check_chapter',
  chapter = {},
  matchedRules = [],
  missingRules = [],
  evidence = [],
  references = [],
  userInstruction = '',
  options = {}
}) {
  const template = getPromptTemplate(taskType);
  const selectedRules = normalizeRules(matchedRules);
  const selectedMissing = normalizeRules(missingRules);
  const includedRuleIds = collectRuleIds([...selectedRules, ...selectedMissing]);
  const includedChapterIds = chapter?.id ? [chapter.id] : [];
  const warnings = [];
  const chapterExcerpt = trimText(chapter.textExcerpt || '', Number(options.maxChapterExcerpt || 1200));
  const evidenceBlock = evidenceLines(evidence);
  const referenceBlock = referenceLines(references);

  if (!evidenceBlock.length) warnings.push('Keine belastbaren Fundstellen uebergeben; Ergebnis sollte manuell geprueft werden.');
  if (!selectedRules.length && !selectedMissing.length) warnings.push('Keine Regeln ausgewaehlt.');
  if (!chapterExcerpt) warnings.push('Kein Kapitelauszug vorhanden.');

  const prompt = `
Rolle:
Du bist ein strenges, aber faires IHK-Projektdokumentations-Review-Werkzeug fuer FIAE-Abschlussprojekte.
Du darfst nicht frei raten. Arbeite nur mit dem Kapitelkontext, den Regeln und den Fundstellen in diesem Prompt.
Du erstellst keine fertige Projektdokumentation, sondern pruefst, erklaerst Risiken und gibst konkrete To-dos.

Aufgabe:
${taskInstruction(taskType, userInstruction)}

Kapitelkontext:
- Kapitel: ${chapter.number || '-'} ${chapter.title || 'Ausgewaehltes Kapitel'}
- Erkannte Bedeutung: ${chapter.detectedMeaning || options.detectedMeaning || '-'}
- Wortanzahl: ${chapter.wordCount ?? '-'}
- Kurzer Auszug:
"""${chapterExcerpt || '-'}"""

Relevante IHK-Regeln:
${selectedRules.length ? selectedRules.map(ruleLine).join('\n') : '- Keine passenden Regeln ausgewaehlt.'}

Moeglicherweise fehlende Regeln:
${selectedMissing.length ? selectedMissing.map(missingRuleLine).join('\n') : '- Keine fehlenden Regeln ausgewaehlt.'}

Statuslogik:
- gruen: ${STATUS_LOGIC.gruen}
- gelb: ${STATUS_LOGIC.gelb}
- rot: ${STATUS_LOGIC.rot}
- grau: ${STATUS_LOGIC.grau}

Fundstellen:
${evidenceBlock.length ? evidenceBlock.join('\n') : '- Keine Fundstellen uebergeben.'}

Private Referenzbasis nur als Metadatenhinweis:
${referenceBlock.length ? referenceBlock.join('\n') : '- Keine Referenzmetadaten ausgewaehlt.'}

Ausgabeform:
1. Kurzfazit in maximal 4 Saetzen.
2. Ampelbewertung je Regel mit Begruendung.
3. Fehlende oder riskante Inhalte als konkrete To-dos.
4. Hinweise auf unklare Punkte, die manuell geprueft werden muessen.
5. Keine langen Neutext-Formulierungen fuer die Doku, keine fertigen Kapitel schreiben.
`.trim();

  return {
    title: template.label,
    prompt,
    includedRuleIds,
    includedChapterIds,
    estimatedContextSize: prompt.length,
    warnings
  };
}
