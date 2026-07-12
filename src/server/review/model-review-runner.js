import { createReviewItem } from './review-schema.js';

function extractJsonObject(output = '') {
  const raw = String(output || '').trim();
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
  }
  throw new Error('Reviewer-Antwort war kein gueltiges JSON.');
}

function fallbackReview({ reviewer, round, ruleId, reason, recommendation = '' }) {
  return createReviewItem({
    reviewer,
    round,
    ruleId,
    status: 'grau',
    confidence: 0.2,
    finding: 'KI-Review nicht sicher auswertbar',
    evidence: [],
    reason,
    recommendation: recommendation || 'Manuelle Pruefung anhand Ruleset und Fundstellen vornehmen.',
    manualReviewRequired: true,
    disagreements: []
  });
}

function toReviewItem(payload, reviewer, round, ruleId) {
  return createReviewItem({
    reviewer,
    round,
    ruleId: payload.ruleId || ruleId,
    status: payload.status,
    confidence: payload.confidence,
    finding: payload.finding,
    evidence: payload.evidence,
    reason: payload.reason,
    recommendation: payload.recommendation,
    manualReviewRequired: payload.manualReviewRequired,
    disagreements: payload.disagreements
  });
}

async function requestJson({ client, model, prompt }) {
  const response = await client.responses.create({
    model,
    input: prompt,
    max_output_tokens: 1100
  });
  return response.output_text || '';
}

async function repairJson({ client, model, output, schemaHint }) {
  const response = await client.responses.create({
    model,
    input: `Repariere diese Ausgabe zu gueltigem JSON nach Schema. Keine Erklaerung, nur JSON.\n\nSchema:\n${schemaHint}\n\nAusgabe:\n${String(output || '').slice(0, 6000)}`,
    max_output_tokens: 900
  });
  return response.output_text || '';
}

export async function runModelReview({
  client,
  model,
  prompt,
  reviewer,
  round,
  ruleId,
  fallbackReason,
  fallbackRecommendation
}) {
  if (!client) {
    return fallbackReview({
      reviewer,
      round,
      ruleId,
      reason: fallbackReason || 'Kein KI-Client vorhanden; Fallback-Review wurde erzeugt.',
      recommendation: fallbackRecommendation
    });
  }

  let output = '';
  try {
    output = await requestJson({ client, model, prompt });
    return toReviewItem(extractJsonObject(output), reviewer, round, ruleId);
  } catch (firstError) {
    try {
      const repaired = await repairJson({
        client,
        model,
        output,
        schemaHint: '{ "reviewer": "...", "round": 1, "ruleId": "...", "status": "gruen|gelb|rot|grau", "confidence": 0.5, "finding": "...", "evidence": [], "reason": "...", "recommendation": "...", "manualReviewRequired": true, "disagreements": [] }'
      });
      return toReviewItem(extractJsonObject(repaired), reviewer, round, ruleId);
    } catch (repairError) {
      return fallbackReview({
        reviewer,
        round,
        ruleId,
        reason: `KI-Review konnte nicht als JSON ausgewertet werden: ${repairError?.message || firstError?.message || 'unbekannter Fehler'}`,
        recommendation: fallbackRecommendation
      });
    }
  }
}
