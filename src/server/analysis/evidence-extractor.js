function normalize(text = '') {
  return String(text || '').replace(/\r/g, '\n').replace(/\s+/g, ' ').trim();
}

function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wordsFromRule(rule = {}) {
  const values = [
    rule.title,
    rule.description,
    ...(rule.positiveIndicators || []),
    ...(rule.wordingAliases || []),
    ...(rule.requiredEvidence || [])
  ];
  return [...new Set(values
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]+/gi, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 4)
    .slice(0, 30))];
}

function relevantSectionKeys(rule = {}) {
  const phaseMap = {
    formal: ['cover', 'tableOfContents', 'sources', 'appendix', 'declarations', 'fullText'],
    introduction: ['introduction', 'projectEnvironment', 'projectGoal', 'projectReason', 'projectInterfaces', 'projectScope'],
    analysis: ['analysis', 'currentState', 'targetState', 'requirements', 'stakeholderAnalysis', 'utilityAnalysis', 'dataAnalysis'],
    economic_analysis: ['economicAnalysis', 'resourcePlanning', 'projectPlanning'],
    planning: ['projectPlanning', 'projectPhases', 'resourcePlanning', 'developmentProcess'],
    design: ['design', 'targetPlatform', 'interfaceDesign', 'architectureDesign', 'dataModel', 'businessLogic'],
    implementation: ['implementation', 'dataModel', 'businessLogic', 'interfaceDesign'],
    quality_management: ['qualityManagement', 'implementation'],
    documentation: ['documentation', 'appendix'],
    conclusion: ['conclusion'],
    uml: ['analysis', 'projectPlanning', 'design', 'implementation', 'fullText'],
    ai_compliance: ['sources', 'declarations', 'fullText'],
    regional_ihk: ['cover', 'fullText']
  };

  return phaseMap[rule.phaseKey] || phaseMap[rule.phase] || ['fullText'];
}

function quoteAround(text, index, maxLength = 420) {
  const raw = normalize(text);
  const start = Math.max(0, index - 150);
  const end = Math.min(raw.length, index + maxLength - 150);
  return raw.slice(start, end).trim();
}

function evidenceQuality(matchCount, sectionKey) {
  if (matchCount >= 3 && sectionKey !== 'fullText') return 'strong';
  if (matchCount >= 2) return 'medium';
  return 'weak';
}

export function extractEvidenceForRule({ rule, sections = {}, doc = {}, AntragDoc = null }) {
  const words = wordsFromRule(rule);
  const sectionKeys = relevantSectionKeys(rule);
  const evidence = [];
  const seen = new Set();

  for (const sectionKey of sectionKeys) {
    const sectionText = normalize(sections[sectionKey] || '');
    if (!sectionText) continue;

    const hits = words
      .map((word) => ({ word, regex: new RegExp(escapeRegex(word), 'i') }))
      .filter(({ regex }) => regex.test(sectionText));

    if (!hits.length) continue;
    const firstHit = hits
      .map(({ regex }) => regex.exec(sectionText)?.index ?? Number.MAX_SAFE_INTEGER)
      .sort((a, b) => a - b)[0];
    const quote = quoteAround(sectionText, firstHit);
    const key = `${sectionKey}:${quote}`;
    if (seen.has(key)) continue;
    seen.add(key);

    evidence.push({
      section: sectionKey,
      quote,
      reason: `Erkannte Indikatoren: ${hits.slice(0, 6).map((hit) => hit.word).join(', ')}`,
      evidenceQuality: evidenceQuality(hits.length, sectionKey)
    });

    if (evidence.length >= 3) break;
  }

  if (rule.id?.startsWith('UML') && Array.isArray(doc.images)) {
    const image = doc.images.find((item) => /uml|diagramm|klasse|sequenz|aktivitaet|aktivität/i.test(item.nearbyText || ''));
    if (image) {
      evidence.push({
        section: 'docxImageContext',
        quote: normalize(`${image.fileName || 'Bild'}: ${image.nearbyText || 'Bild ohne Kontexttext'}`).slice(0, 420),
        reason: 'DOCX-Bildkontext weist auf ein Diagramm hin.',
        evidenceQuality: 'medium'
      });
    }
  }

  if (rule.id === 'ZU-01' && AntragDoc?.text) {
    evidence.push({
      section: 'projectApplication',
      quote: normalize(AntragDoc.text).slice(0, 420),
      reason: 'Projektantrag ist fuer den Abgleich vorhanden.',
      evidenceQuality: 'medium'
    });
  }

  return evidence.slice(0, 4);
}
