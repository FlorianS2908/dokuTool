function contextJson(context) {
  return JSON.stringify(context, null, 2);
}

const OUTPUT_SCHEMA = `
Antworte ausschliesslich als JSON:
{
  "reviewer": "primary|counter|revision|arbiter",
  "round": 1,
  "ruleId": "...",
  "status": "gruen|gelb|rot|grau",
  "confidence": 0.0,
  "finding": "...",
  "evidence": [
    {
      "section": "...",
      "quote": "...",
      "evidenceQuality": "strong|medium|weak"
    }
  ],
  "reason": "...",
  "recommendation": "...",
  "manualReviewRequired": true,
  "disagreements": []
}
`.trim();

function sharedInstructions() {
  return `
Du bist ein regelgebundener IHK-FIAE-Dokumentationsreviewer.
Das Ruleset im Kontext ist verbindlich.
Bewerte nur die angegebene Regel, nicht das ganze Dokument.
Nutze nur gelieferte Fundstellen und Kontextdaten.
Erfinde keine Fundstellen, Quellen, Buchinhalte oder Dokumentstellen.
Wenn keine belastbare Fundstelle vorhanden ist, darf keine sichere gruene Bewertung vergeben werden.
Erstelle keine fertige IHK-Dokumentation und keine langen Ersatztexte.
Gib konkrete Pruef-To-dos und Risiken aus.
Keine Markdown-Ausgabe, keine Erklaertexte ausserhalb des JSON.
${OUTPUT_SCHEMA}
`.trim();
}

export function buildPrimaryReviewerPrompt(context) {
  return `
${sharedInstructions()}

Rolle: Primary Reviewer.
Aufgabe: Pruefe die Regel direkt anhand Ruleset, Basisergebnis und Fundstellen. Lege eine erste fachliche Bewertung fest.

Regelkontext:
${contextJson(context)}
`.trim();
}

export function buildCounterReviewerPrompt(context, primaryReview) {
  return `
${sharedInstructions()}

Rolle: Counter Reviewer.
Aufgabe: Pruefe kritisch, ob die Primary-Bewertung durch die gelieferten Fundstellen gedeckt ist. Suche Widersprueche, aber erfinde nichts.

Primary Review:
${JSON.stringify(primaryReview || {}, null, 2)}

Regelkontext:
${contextJson(context)}
`.trim();
}

export function buildRevisionReviewerPrompt(context, primaryReview, counterReview, conflicts) {
  return `
${sharedInstructions()}

Rolle: Revision Reviewer.
Aufgabe: Beruecksichtige Counter Review und Konflikte. Passe die Bewertung nur an, wenn die gelieferten Fundstellen das rechtfertigen.

Primary Review:
${JSON.stringify(primaryReview || {}, null, 2)}

Counter Review:
${JSON.stringify(counterReview || {}, null, 2)}

Konflikte:
${JSON.stringify(conflicts || [], null, 2)}

Regelkontext:
${contextJson(context)}
`.trim();
}

export function buildArbiterReviewerPrompt(context, reviews, conflicts) {
  return `
${sharedInstructions()}

Rolle: Arbiter Reviewer.
Aufgabe: Triff bei offenen Konflikten eine vorsichtige Schlussbewertung. Wenn Fundstellen unklar sind, markiere manuelle Pruefung.

Reviews:
${JSON.stringify(reviews || [], null, 2)}

Konflikte:
${JSON.stringify(conflicts || [], null, 2)}

Regelkontext:
${contextJson(context)}
`.trim();
}
