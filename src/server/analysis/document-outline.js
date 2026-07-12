function normalizeText(text = '') {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeLine(line = '') {
  return String(line || '').replace(/\s+/g, ' ').trim();
}

function wordCount(text = '') {
  return normalizeText(text).split(/\s+/).filter(Boolean).length;
}

function excerpt(text = '', max = 720) {
  const value = normalizeText(text).replace(/\n+/g, ' ');
  return value.length > max ? `${value.slice(0, max).trim()} ...` : value;
}

function slugId(number, index) {
  if (number) return `ch_${String(number).replace(/\.+$/g, '').replace(/\./g, '_')}`;
  return `ch_${index + 1}`;
}

const TITLE_PATTERNS = [
  { title: 'Inhaltsverzeichnis', level: 1, patterns: [/^inhaltsverzeichnis$/i, /^inhalt$/i] },
  { title: 'Einleitung', level: 1, patterns: [/^einleitung$/i] },
  { title: 'Projektumfeld', level: 2, patterns: [/^projektumfeld$/i, /^ausgangssituation$/i] },
  { title: 'Projektziel', level: 2, patterns: [/^projektziel$/i, /^zielsetzung$/i] },
  { title: 'Analysephase', level: 1, patterns: [/^analysephase$/i, /^analyse$/i, /^ist[-\s]?analyse$/i, /^anforderungsanalyse$/i] },
  { title: 'Entwurfsphase', level: 1, patterns: [/^entwurfsphase$/i, /^entwurf$/i, /^systementwurf$/i] },
  { title: 'Implementierungsphase', level: 1, patterns: [/^implementierungsphase$/i, /^implementierung$/i, /^realisierung$/i, /^umsetzung$/i] },
  { title: 'Qualitaetssicherung', level: 1, patterns: [/^qualitaetssicherung$/i, /^qualit.tssicherung$/i, /^testphase$/i, /^tests$/i] },
  { title: 'Fazit', level: 1, patterns: [/^fazit$/i, /^schlussbetrachtung$/i, /^ausblick$/i] },
  { title: 'Anhang', level: 1, patterns: [/^anhang$/i, /^anlagen$/i] },
  { title: 'Quellenverzeichnis', level: 1, patterns: [/^quellenverzeichnis$/i, /^literaturverzeichnis$/i] }
];

function knownHeading(line) {
  const cleaned = normalizeLine(line).replace(/[:.]$/g, '');
  if (cleaned.length < 4 || cleaned.length > 80) return null;
  return TITLE_PATTERNS.find((entry) => entry.patterns.some((pattern) => pattern.test(cleaned))) || null;
}

function parseNumberedHeading(line) {
  const cleaned = normalizeLine(line);
  const tocMatch = cleaned.match(/^(\d+(?:\.\d+){0,5})\.?\s+(.+?)(?:\.{2,}|\s{2,})\s*\d{1,3}$/);
  if (tocMatch) {
    return {
      number: tocMatch[1],
      title: tocMatch[2].trim(),
      level: tocMatch[1].split('.').length,
      looksLikeToc: true
    };
  }

  const match = cleaned.match(/^(\d+(?:\.\d+){0,5})\.?\s+(.{3,110})$/);
  if (!match) return null;
  const title = match[2].trim();
  if (/[.!?]$/.test(title) && title.split(/\s+/).length > 8) return null;
  return {
    number: match[1],
    title,
    level: match[1].split('.').length,
    looksLikeToc: false
  };
}

function detectHeadings(text) {
  const headings = [];
  const lines = text.split('\n');
  let offset = 0;

  lines.forEach((line, lineIndex) => {
    const raw = line;
    const cleaned = normalizeLine(raw);
    const startIndex = offset + raw.search(/\S|$/);
    offset += raw.length + 1;
    if (!cleaned) return;

    const numbered = parseNumberedHeading(cleaned);
    if (numbered && !numbered.looksLikeToc) {
      headings.push({
        ...numbered,
        startIndex,
        lineIndex
      });
      return;
    }

    const known = knownHeading(cleaned);
    if (known) {
      headings.push({
        number: '',
        title: cleaned.replace(/[:.]$/g, ''),
        level: known.level,
        startIndex,
        lineIndex
      });
    }
  });

  return headings
    .filter((heading, index, all) => (
      index === all.findIndex((other) => other.startIndex === heading.startIndex)
    ))
    .sort((a, b) => a.startIndex - b.startIndex);
}

function fallbackHeadings(text) {
  const patterns = [
    { title: 'Einleitung', regex: /einleitung|projektumfeld|projektziel/i },
    { title: 'Analyse', regex: /analyse|ist[-\s]?zustand|anforderung/i },
    { title: 'Entwurf', regex: /entwurf|architektur|datenmodell|schnittstelle/i },
    { title: 'Implementierung', regex: /implementierung|realisierung|umsetzung/i },
    { title: 'Qualitaetssicherung', regex: /qualitaetssicherung|testphase|testfall|abnahme/i },
    { title: 'Fazit', regex: /fazit|schlussbetrachtung|ausblick|soll[-\s]?ist/i }
  ];
  const found = patterns
    .map((item, index) => {
      const match = item.regex.exec(text);
      return match ? {
        number: String(index + 1),
        title: item.title,
        level: 1,
        startIndex: match.index,
        lineIndex: index
      } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.startIndex - b.startIndex);

  if (found.length >= 2) return found;

  const chunkSize = Math.max(2500, Math.ceil(text.length / 4));
  return Array.from({ length: Math.max(1, Math.ceil(text.length / chunkSize)) }, (_, index) => ({
    number: String(index + 1),
    title: `Abschnitt ${index + 1}`,
    level: 1,
    startIndex: index * chunkSize,
    lineIndex: index
  }));
}

function chapterFromHeading(heading, index, headings, text) {
  const next = headings.find((candidate, candidateIndex) => (
    candidateIndex > index && candidate.level <= heading.level
  ));
  const endIndex = next?.startIndex ?? text.length;
  const rawText = text.slice(heading.startIndex, endIndex).trim();
  return {
    id: slugId(heading.number, index),
    number: heading.number || String(index + 1),
    title: heading.title,
    level: heading.level,
    startIndex: heading.startIndex,
    endIndex,
    textExcerpt: excerpt(rawText),
    wordCount: wordCount(rawText),
    children: []
  };
}

function buildTree(flatChapters) {
  const roots = [];
  const stack = [];

  for (const chapter of flatChapters) {
    while (stack.length && stack.at(-1).level >= chapter.level) stack.pop();
    if (stack.length) stack.at(-1).children.push(chapter);
    else roots.push(chapter);
    stack.push(chapter);
  }

  return roots;
}

function titleFromDoc(doc, chapters) {
  if (doc?.fileName) return doc.fileName;
  return chapters[0]?.title || 'Dokument';
}

export function extractDocumentOutline(doc = {}) {
  const text = normalizeText(doc.bodyText || doc.text || '');
  const warnings = [];
  if (!text) {
    return { title: doc.fileName || 'Dokument', chapters: [], warnings: ['Kein auswertbarer Text vorhanden.'] };
  }

  let headings = detectHeadings(text);
  if (headings.length < 2) {
    headings = fallbackHeadings(text);
    warnings.push('Kapitelstruktur wurde heuristisch gebildet, weil keine eindeutigen Ueberschriften erkannt wurden.');
  }

  const flatChapters = headings
    .map((heading, index) => chapterFromHeading(heading, index, headings, text))
    .filter((chapter) => chapter.wordCount > 0 || chapter.title);

  if (!flatChapters.length) {
    flatChapters.push({
      id: 'ch_1',
      number: '1',
      title: 'Gesamtdokument',
      level: 1,
      startIndex: 0,
      endIndex: text.length,
      textExcerpt: excerpt(text),
      wordCount: wordCount(text),
      children: []
    });
  }

  return {
    title: titleFromDoc(doc, flatChapters),
    chapters: buildTree(flatChapters),
    warnings
  };
}
