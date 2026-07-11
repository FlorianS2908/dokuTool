import { copyFileSync, existsSync, statSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { metadataFromFileName } from './reference-extractor.js';
import {
  assertSafeReferenceLocalPath,
  ensureReferenceDirectories,
  loadReferenceManifest,
  loadReferenceTopics,
  upsertLocalReference
} from './reference-store.js';
import { REFERENCE_BOOK_DIR } from './reference-types.js';

function titleWords(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]+/gi, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !['fuer', 'und', 'with', 'the', 'copy'].includes(word));
}

function manifestMatch(metadata, manifest) {
  const metadataText = `${metadata.id} ${metadata.title} ${metadata.fileName}`.toLowerCase();
  return (manifest.references || []).find((reference) =>
    reference.id === metadata.id ||
    metadata.id.includes(reference.id) ||
    reference.id.includes(metadata.id) ||
    reference.expectedLocalPath?.endsWith(`/${metadata.fileName}`) ||
    reference.title?.toLowerCase() === metadata.title.toLowerCase() ||
    titleWords(reference.title).every((word) => metadataText.includes(word))
  );
}

export function buildReferenceRecord({ fileName, fileSizeBytes, manifestReference = null, topicsConfig = null }) {
  const metadata = metadataFromFileName(fileName, topicsConfig);
  const mergedTopics = [...new Set([...(manifestReference?.topics || []), ...metadata.topics])];
  const mergedRules = [...new Set([...(manifestReference?.mappedRules || []), ...metadata.mappedRules])];
  const id = manifestReference?.id || metadata.id;
  const finalFileName = manifestReference?.expectedLocalPath?.split('/').at(-1) || metadata.fileName;

  return {
    id,
    title: manifestReference?.title || metadata.title,
    fileName: finalFileName,
    localPath: assertSafeReferenceLocalPath(`${REFERENCE_BOOK_DIR}/${finalFileName}`),
    fileType: manifestReference?.fileType || metadata.fileType,
    status: 'available',
    fileSizeBytes,
    topics: mergedTopics,
    mappedRules: mergedRules,
    copyrightNote: 'private_local_reference_only'
  };
}

export function importReferenceFile(sourcePath, { overwrite = false } = {}) {
  ensureReferenceDirectories();
  const absoluteSource = resolve(sourcePath);
  if (!existsSync(absoluteSource)) throw new Error(`Datei nicht gefunden: ${sourcePath}`);
  const stats = statSync(absoluteSource);
  if (!stats.isFile()) throw new Error(`Keine Datei: ${sourcePath}`);

  const topicsConfig = loadReferenceTopics();
  const manifest = loadReferenceManifest();
  const metadata = metadataFromFileName(basename(absoluteSource), topicsConfig);
  const manifestReference = manifestMatch(metadata, manifest);
  const record = buildReferenceRecord({
    fileName: basename(absoluteSource),
    fileSizeBytes: stats.size,
    manifestReference,
    topicsConfig
  });
  const targetPath = resolve(record.localPath);

  if (existsSync(targetPath) && !overwrite) {
    throw new Error(`Zieldatei existiert bereits: ${record.localPath}`);
  }

  copyFileSync(absoluteSource, targetPath);
  const registry = upsertLocalReference(record);

  return {
    record,
    registry,
    copiedTo: record.localPath
  };
}
