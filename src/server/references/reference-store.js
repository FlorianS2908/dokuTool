import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, normalize, sep } from 'node:path';
import {
  emptyRegistry,
  REFERENCE_BOOK_DIR,
  REFERENCE_EXTRACTED_DIR,
  REFERENCE_INDEX_DIR,
  REFERENCE_MANIFEST_PATH,
  REFERENCE_REGISTRY_PATH,
  REFERENCE_ROOT,
  REFERENCE_TOPICS_PATH
} from './reference-types.js';

const projectRoot = resolve('.');

export function ensureReferenceDirectories() {
  for (const dir of [REFERENCE_ROOT, REFERENCE_BOOK_DIR, REFERENCE_EXTRACTED_DIR, REFERENCE_INDEX_DIR]) {
    mkdirSync(resolve(projectRoot, dir), { recursive: true });
  }
}

function readJsonIfExists(path, fallback) {
  const absolute = resolve(projectRoot, path);
  if (!existsSync(absolute)) return fallback;
  return JSON.parse(readFileSync(absolute, 'utf8').replace(/^\uFEFF/, ''));
}

function writeJson(path, value) {
  const absolute = resolve(projectRoot, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function assertSafeReferenceLocalPath(localPath = '') {
  const booksRoot = resolve(projectRoot, REFERENCE_BOOK_DIR);
  const absolute = resolve(projectRoot, localPath);
  if (!absolute.startsWith(`${booksRoot}${sep}`) && absolute !== booksRoot) {
    throw new Error(`Unsicherer Referenzpfad ausserhalb von ${REFERENCE_BOOK_DIR}: ${localPath}`);
  }
  return normalize(localPath).replace(/\\/g, '/');
}

export function loadReferenceManifest() {
  return readJsonIfExists(REFERENCE_MANIFEST_PATH, { version: '1.0.0', references: [] });
}

export function loadReferenceTopics() {
  return readJsonIfExists(REFERENCE_TOPICS_PATH, { version: '1.0.0', topicMappings: [] });
}

export function loadLocalReferenceRegistry() {
  ensureReferenceDirectories();
  const registry = readJsonIfExists(REFERENCE_REGISTRY_PATH, null);
  if (registry) return registry;
  const created = emptyRegistry();
  writeJson(REFERENCE_REGISTRY_PATH, created);
  return created;
}

export function saveLocalReferenceRegistry(registry) {
  const safeRegistry = {
    version: registry?.version || '1.0.0',
    updatedAt: new Date().toISOString(),
    books: Array.isArray(registry?.books) ? registry.books.map((book) => ({
      ...book,
      localPath: assertSafeReferenceLocalPath(book.localPath)
    })) : []
  };
  writeJson(REFERENCE_REGISTRY_PATH, safeRegistry);
  return safeRegistry;
}

export function listLocalReferences() {
  const registry = loadLocalReferenceRegistry();
  const manifest = loadReferenceManifest();
  const listed = (manifest.references || []).map((manifestRef) => {
    const local = (registry.books || []).find((book) => book.id === manifestRef.id || book.fileName === manifestRef.expectedLocalPath?.split('/').at(-1));
    return {
      ...manifestRef,
      ...local,
      expectedLocalPath: manifestRef.expectedLocalPath,
      status: local?.status || (existsSync(resolve(projectRoot, manifestRef.expectedLocalPath || '')) ? 'available' : 'missing')
    };
  });
  const knownIds = new Set(listed.map((reference) => reference.id));
  const extras = (registry.books || [])
    .filter((book) => !knownIds.has(book.id))
    .map((book) => ({
      ...book,
      expectedLocalPath: book.localPath,
      status: existsSync(resolve(projectRoot, book.localPath || '')) ? book.status || 'available' : 'missing'
    }));
  return [...listed, ...extras];
}

export function getLocalReferenceById(id) {
  return listLocalReferences().find((reference) => reference.id === id) || null;
}

export function upsertLocalReference(reference) {
  if (!reference?.id) throw new Error('Referenz braucht eine id.');
  const registry = loadLocalReferenceRegistry();
  const now = new Date().toISOString();
  const safeReference = {
    ...reference,
    localPath: assertSafeReferenceLocalPath(reference.localPath),
    updatedAt: now
  };
  const index = registry.books.findIndex((book) => book.id === safeReference.id);
  if (index >= 0) {
    registry.books[index] = { ...registry.books[index], ...safeReference };
  } else {
    registry.books.push({
      addedAt: now,
      copyrightNote: 'private_local_reference_only',
      ...safeReference
    });
  }
  return saveLocalReferenceRegistry(registry);
}
