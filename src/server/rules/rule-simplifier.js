function clean(text = '') {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function firstSentence(text = '') {
  const value = clean(text);
  const match = value.match(/^(.{30,220}?[.!?])\s/);
  return match ? match[1] : value.slice(0, 220);
}

function removeReviewWords(text = '') {
  return clean(text)
    .replace(/\bpruefen\b/gi, '')
    .replace(/\bprüfen\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function titleForRule(rule = {}) {
  const title = removeReviewWords(rule.title || rule.description || rule.id || 'Regel');
  const lower = title.toLowerCase();

  if (/datenmodell|datenbank|er-?modell|normalisierung/.test(lower)) return 'Datenmodell nachvollziehbar darstellen';
  if (/uml|klassendiagramm|sequenzdiagramm|aktivitaet|aktivität/.test(lower)) return 'UML-Diagramm fachlich passend darstellen';
  if (/test|qualitaet|qualität|qs|abnahme/.test(lower)) return 'Tests und Qualitaetssicherung nachvollziehbar machen';
  if (/schnittstelle|api|rest|endpoint/.test(lower)) return 'Schnittstellen verstaendlich beschreiben';
  if (/ist|ausgangssituation/.test(lower)) return 'Ausgangssituation erklaeren';
  if (/soll|ziel/.test(lower)) return 'Zielzustand klar beschreiben';
  if (/kosten|ressource|wirtschaft/.test(lower)) return 'Kosten und Ressourcen nachvollziehbar begruenden';
  if (/fazit|soll.*ist|schluss/.test(lower)) return 'Ergebnis und Soll-Ist-Vergleich bewerten';
  if (/inhaltsverzeichnis|abbildungsverzeichnis|quellen|anhang|verzeichnis/.test(lower)) return 'Formale Verzeichnisse sauber fuehren';

  return title.charAt(0).toUpperCase() + title.slice(1);
}

function explanationForRule(rule = {}, simpleTitle = '') {
  if (rule.purpose) {
    return firstSentence(rule.purpose)
      .replace(/^Die Regel stellt sicher, dass der Pruefungsausschuss/i, 'Die Doku sollte so klar sein, dass der Pruefungsausschuss')
      .replace(/^Die Regel stellt sicher, dass der Prüfungsausschuss/i, 'Die Doku sollte so klar sein, dass der Pruefungsausschuss');
  }
  if (rule.description) return firstSentence(rule.description);
  return `Die Doku sollte zeigen, dass der Punkt "${simpleTitle}" nachvollziehbar behandelt wurde.`;
}

function checklistFromEvidence(rule = {}) {
  const evidence = Array.isArray(rule.requiredEvidence) ? rule.requiredEvidence : [];
  const checklist = evidence
    .slice(0, 5)
    .map((item) => `Ist ${clean(item).replace(/^passender\s+/i, '')} erkennbar?`);

  const indicators = Array.isArray(rule.positiveIndicators) ? rule.positiveIndicators : [];
  if (indicators.length) {
    checklist.push(`Werden passende Begriffe wie ${indicators.slice(0, 4).join(', ')} fachlich erklaert?`);
  }

  checklist.push('Passt die Aussage zum konkreten Projekt?');
  checklist.push('Gibt es eine kurze Begruendung oder Fundstelle?');
  return [...new Set(checklist)].slice(0, 6);
}

function problemsFromRule(rule = {}) {
  const negatives = Array.isArray(rule.negativeIndicators) ? rule.negativeIndicators : [];
  const problems = negatives
    .map((item) => clean(item))
    .filter(Boolean)
    .slice(0, 5);

  if (!problems.length) {
    problems.push('Nur Stichworte ohne Erklaerung');
    problems.push('Keine Verbindung zum Projekt');
    problems.push('Fundstelle ist zu allgemein oder fehlt');
  }

  return problems;
}

export function simplifyRuleForUser(rule = {}) {
  const simpleTitle = titleForRule(rule);
  return {
    ruleId: rule.id || '',
    simpleTitle,
    simpleExplanation: explanationForRule(rule, simpleTitle),
    userChecklist: checklistFromEvidence(rule),
    typicalProblems: problemsFromRule(rule)
  };
}
