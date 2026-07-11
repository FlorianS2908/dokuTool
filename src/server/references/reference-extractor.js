import { extname, basename } from 'node:path';
import { SUPPORTED_REFERENCE_EXTENSIONS } from './reference-types.js';

const umlautMap = {
  ä: 'ae',
  ö: 'oe',
  ü: 'ue',
  ß: 'ss',
  Ä: 'ae',
  Ö: 'oe',
  Ü: 'ue'
};

export function normalizeReferenceFileName(fileName = '') {
  const ext = extname(fileName).toLowerCase();
  const name = basename(fileName, ext)
    .replace(/[äöüßÄÖÜ]/g, (char) => umlautMap[char] || char)
    .replace(/&/g, ' und ')
    .replace(/\+/g, ' ')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .toLowerCase();
  return `${name || 'reference'}${ext}`;
}

export function referenceIdFromFileName(fileName = '') {
  const ext = extname(fileName);
  return basename(fileName, ext)
    .replace(/-/g, '_')
    .replace(/[^a-zA-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

export function fileTypeFromExtension(fileName = '') {
  const ext = extname(fileName).toLowerCase();
  if (!SUPPORTED_REFERENCE_EXTENSIONS.has(ext)) {
    throw new Error(`Nicht unterstuetztes Referenzformat: ${ext || 'ohne Erweiterung'}`);
  }
  return ext.slice(1);
}

export function titleFromFileName(fileName = '') {
  const ext = extname(fileName);
  return basename(fileName, ext)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

export function metadataFromFileName(fileName, topicsConfig = null) {
  const normalizedFileName = normalizeReferenceFileName(fileName);
  const id = referenceIdFromFileName(normalizedFileName);
  const fileType = fileTypeFromExtension(normalizedFileName);
  const title = titleFromFileName(normalizedFileName);
  const text = `${title} ${normalizedFileName}`.toLowerCase();
  const topicMatches = (topicsConfig?.topicMappings || []).filter((mapping) =>
    (mapping.keywords || []).some((keyword) => text.includes(String(keyword).toLowerCase()))
  );
  const topics = [...new Set(topicMatches.map((mapping) => mapping.topic))];
  const mappedRules = [...new Set(topicMatches.flatMap((mapping) => mapping.mappedRules || []))];

  return {
    id,
    title,
    fileName: normalizedFileName,
    fileType,
    topics,
    mappedRules
  };
}
