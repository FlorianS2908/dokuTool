import { FIAE_RULESET_V2 } from '../../../ruleset-evaluator.js';
import { extractEvidenceForRule } from '../analysis/evidence-extractor.js';
import { resolveReferencesForRulesetRule } from '../references/reference-resolver.js';

const statusScore = { gruen: 1, gelb: 0.55, rot: 0, grau: 0.35 };

const severityToApp = {
  CRITICAL: 'hoch',
  MAJOR: 'hoch',
  MINOR: 'mittel',
  INFO: 'niedrig'
};

const missingStatusBySeverity = {
  CRITICAL: 'rot',
  MAJOR: 'gelb',
  MINOR: 'gelb',
  INFO: 'grau'
};

function normalize(text = '') {
  return String(text || '').replace(/\r/g, '\n').replace(/\s+/g, ' ').trim();
}

function lower(text = '') {
  return normalize(text).toLowerCase();
}

function countRegex(text, pattern) {
  return (String(text || '').match(pattern) || []).length;
}

function projectContext({ doc = {}, sections = {}, AntragDoc = null }) {
  const text = normalize(doc.text || sections.fullText || '');
  const lText = lower(text);
  const structure = doc.structure || {};
  return {
    text,
    lText,
    hasImages: Number(structure.bodyImageCount || 0) > 0 || countRegex(text, /abbildung\s+\d+/gi) > 0 || (doc.images || []).length > 0,
    hasTables: Number(structure.tableCount || 0) > 0 || countRegex(text, /tabelle\s+\d+/gi) > 0,
    hasCode: /```|listing\s+\d+|quellcode|public\s+class|function\s+\w+|def\s+\w+|class\s+\w+/i.test(text),
    hasAppendix: /\banhang\b|\banlagen\b|appendix/i.test(text),
    hasApiOrInterface: /\bapi\b|rest|graphql|endpoint|schnittstelle|import|export|frontend[-\s]?backend|externes system|fremdsystem/i.test(text),
    hasDatabase: /datenbank|sql|mysql|postgres|sqlite|mssql|oracle|tabelle|relation|er[-\s]?modell|erd/i.test(text),
    hasObjectOriented: /objektorientiert|\boop\b|klasse|class\s+\w+|java|c#|typescript|klassendiagramm/i.test(text),
    hasSensitiveData: /personenbezogen|datenschutz|dsgvo|gesundheitsdaten|kundendaten|mitarbeiterdaten|sensible daten/i.test(text),
    hasApplication: Boolean(AntragDoc?.text)
  };
}

const conditionMap = {
  images_detected: (context) => context.hasImages,
  tables_detected: (context) => context.hasTables,
  code_or_listings_detected: (context) => context.hasCode,
  appendix_detected: (context) => context.hasAppendix,
  api_or_interface_detected: (context) => context.hasApiOrInterface,
  database_detected: (context) => context.hasDatabase,
  object_oriented_detected: (context) => context.hasObjectOriented,
  sensitive_data_detected: (context) => context.hasSensitiveData,
  project_application_available: (context) => context.hasApplication
};

function appliesToRule(rule, context) {
  if (rule.applies?.always !== false) return true;
  const conditions = Array.isArray(rule.applies?.when) ? rule.applies.when : [];
  if (!conditions.length) return true;
  return conditions.some((condition) => conditionMap[condition]?.(context));
}

function weightForRule(rule, status) {
  if (status === 'gruen' && rule.applies?.always === false) return 0.2;
  if (rule.severity === 'CRITICAL') return 1.15;
  if (rule.severity === 'MAJOR') return 0.85;
  if (rule.severity === 'MINOR') return 0.55;
  return 0.35;
}

function evidenceSummary(evidence = []) {
  if (!evidence.length) return '-';
  return evidence
    .map((item) => `${item.section}: "${item.quote}"`)
    .join(' | ');
}

function evaluateStatus(rule, evidence, context) {
  if (!appliesToRule(rule, context)) {
    return {
      status: 'gruen',
      assessment: 'nicht erforderlich',
      reason: 'Die bedingte Regel wurde im erkannten Projektkontext nicht ausgeloest.'
    };
  }

  const strongEvidence = evidence.filter((item) => item.evidenceQuality === 'strong').length;
  const mediumEvidence = evidence.filter((item) => item.evidenceQuality === 'medium').length;

  if (rule.requiresManualReview && !evidence.length) {
    return {
      status: 'grau',
      assessment: 'manuelle Pruefung noetig',
      reason: 'Das Ruleset markiert diese Regel als nur eingeschraenkt automatisch bewertbar und es wurde keine sichere Fundstelle gefunden.'
    };
  }

  if (strongEvidence > 0 || evidence.length >= 2) {
    return {
      status: 'gruen',
      assessment: 'vorhanden und plausibel',
      reason: 'Passende Fundstellen und Indikatoren wurden im relevanten Dokumentkontext erkannt.'
    };
  }

  if (mediumEvidence > 0 || evidence.length === 1) {
    return {
      status: 'gelb',
      assessment: 'teilweise oder schwach belegt',
      reason: 'Eine Fundstelle wurde erkannt, sie reicht fuer eine sichere gruene Bewertung aber noch nicht aus.'
    };
  }

  if (rule.requiresManualReview) {
    return {
      status: 'grau',
      assessment: 'nicht sicher automatisch pruefbar',
      reason: 'Keine belastbare Fundstelle erkannt; die Regel braucht fachliche manuelle Einordnung.'
    };
  }

  return {
    status: missingStatusBySeverity[rule.severity] || 'gelb',
    assessment: 'nicht ausreichend erkannt',
    reason: 'Im passenden Dokumentkontext wurde keine belastbare Fundstelle zur Regel erkannt.'
  };
}

function resultForRule(rule, statusInfo, evidence) {
  const status = statusInfo.status;
  const references = resolveReferencesForRulesetRule(rule);
  return {
    category: `FIAE Ruleset v2 · ${rule.category}`,
    criterion: `${rule.id} ${rule.title}`,
    status,
    assessment: statusInfo.assessment,
    evidence: evidenceSummary(evidence),
    reason: `${statusInfo.reason} Zweck: ${rule.purpose}`,
    recommendation: rule.recommendation,
    references,
    severity: severityToApp[rule.severity] || 'mittel',
    weight: weightForRule(rule, status),
    ruleset: {
      id: rule.id,
      category: rule.category,
      phase: rule.phaseKey || rule.phase,
      severity: rule.severity,
      referenceTopics: rule.referenceTopics || [],
      source: FIAE_RULESET_V2.id
    }
  };
}

function buildSummary(results) {
  const weighted = results.reduce((acc, result) => {
    acc.total += result.weight || 1;
    acc.score += (statusScore[result.status] ?? 0) * (result.weight || 1);
    return acc;
  }, { total: 0, score: 0 });

  return {
    id: FIAE_RULESET_V2.id,
    version: FIAE_RULESET_V2.version,
    evaluatedRules: results.length,
    score: weighted.total ? Math.round((weighted.score / weighted.total) * 100) : 0,
    redCount: results.filter((result) => result.status === 'rot').length,
    yellowCount: results.filter((result) => result.status === 'gelb').length,
    grayCount: results.filter((result) => result.status === 'grau').length,
    manualReviewCount: results.filter((result) => result.status === 'grau' || /manuell/i.test(result.assessment)).length
  };
}

export function evaluateFiaeRulesetV2({ doc, AntragDoc, options = {}, profile = null, sections = {} }) {
  const context = projectContext({ doc, sections, AntragDoc, options, profile });
  const results = (FIAE_RULESET_V2.rules || []).map((rule) => {
    const evidence = extractEvidenceForRule({ rule, sections, doc, AntragDoc });
    const statusInfo = evaluateStatus(rule, evidence, context);
    return resultForRule(rule, statusInfo, evidence);
  });

  return {
    metadata: {
      ruleset: {
        id: FIAE_RULESET_V2.id,
        version: FIAE_RULESET_V2.version,
        source: FIAE_RULESET_V2.source,
        phaseStructure: FIAE_RULESET_V2.phaseStructure
      },
      summary: buildSummary(results)
    },
    results
  };
}
