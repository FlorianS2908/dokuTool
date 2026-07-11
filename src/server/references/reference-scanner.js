import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildReferenceRecord } from './reference-importer.js';
import { metadataFromFileName } from './reference-extractor.js';
import {
  ensureReferenceDirectories,
  loadLocalReferenceRegistry,
  loadReferenceManifest,
  loadReferenceTopics,
  saveLocalReferenceRegistry
} from './reference-store.js';
import { REFERENCE_BOOK_DIR, SUPPORTED_REFERENCE_EXTENSIONS } from './reference-types.js';

function isSupportedBook(fileName = '') {
  const ext = `.${fileName.split('.').pop().toLowerCase()}`;
  return SUPPORTED_REFERENCE_EXTENSIONS.has(ext);
}

export function scanLocalReferences() {
  ensureReferenceDirectories();
  const registry = loadLocalReferenceRegistry();
  const manifest = loadReferenceManifest();
  const topicsConfig = loadReferenceTopics();
  const booksRoot = resolve(REFERENCE_BOOK_DIR);
  const files = readdirSync(booksRoot).filter(isSupportedBook);
  const existingFileNames = new Set((registry.books || []).map((book) => book.fileName));
  let added = 0;

  for (const fileName of files) {
    if (existingFileNames.has(fileName)) continue;
    const metadata = metadataFromFileName(fileName, topicsConfig);
    const manifestReference = (manifest.references || []).find((reference) =>
      reference.id === metadata.id || reference.expectedLocalPath?.endsWith(`/${fileName}`)
    );
    const record = buildReferenceRecord({
      fileName,
      fileSizeBytes: statSync(resolve(booksRoot, fileName)).size,
      manifestReference,
      topicsConfig
    });
    registry.books.push({
      addedAt: new Date().toISOString(),
      ...record
    });
    added += 1;
  }

  for (const book of registry.books || []) {
    book.status = existsSync(resolve(book.localPath || '')) ? 'available' : 'missing';
  }

  const saved = saveLocalReferenceRegistry(registry);
  const missing = (saved.books || []).filter((book) => book.status === 'missing');

  return {
    filesFound: files.length,
    added,
    missing: missing.length,
    books: saved.books || []
  };
}
