import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import {
  REFERENCE_BOOK_DIR,
  REFERENCE_MANIFEST_PATH,
  REFERENCE_REGISTRY_PATH,
  REFERENCE_TOPICS_PATH,
  SUPPORTED_REFERENCE_EXTENSIONS
} from '../src/server/references/reference-types.js';

function readJson(path, required = true) {
  if (!existsSync(path)) {
    if (required) throw new Error(`Fehlt: ${path}`);
    return null;
  }
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function uniqueIds(items, label) {
  const seen = new Set();
  for (const item of items || []) {
    assert(item.id, `${label}: Eintrag ohne id.`);
    assert(!seen.has(item.id), `${label}: doppelte id ${item.id}`);
    seen.add(item.id);
  }
}

function isUnder(child, parent) {
  const childPath = resolve(child);
  const parentPath = resolve(parent);
  return childPath === parentPath || childPath.startsWith(`${parentPath}\\`) || childPath.startsWith(`${parentPath}/`);
}

function walk(dir, ignored = []) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = resolve(dir, entry);
    if (ignored.some((ignore) => isUnder(path, ignore))) continue;
    const stats = statSync(path);
    if (stats.isDirectory()) out.push(...walk(path, ignored));
    else out.push(path);
  }
  return out;
}

try {
  const manifest = readJson(REFERENCE_MANIFEST_PATH);
  const topics = readJson(REFERENCE_TOPICS_PATH);
  const registry = readJson(REFERENCE_REGISTRY_PATH, false);
  const gitignore = readFileSync('.gitignore', 'utf8');

  assert(Array.isArray(manifest.references), 'reference-manifest.json braucht references[].');
  assert(Array.isArray(topics.topicMappings), 'reference-topics.json braucht topicMappings[].');
  uniqueIds(manifest.references, 'Manifest');
  uniqueIds(registry?.books || [], 'Registry');

  for (const book of registry?.books || []) {
    assert(book.localPath, `Registry ${book.id}: localPath fehlt.`);
    assert(isUnder(book.localPath, REFERENCE_BOOK_DIR), `Registry ${book.id}: localPath liegt nicht unter ${REFERENCE_BOOK_DIR}.`);
    if (!existsSync(book.localPath)) {
      console.warn(`Warnung: Lokale Referenzdatei fehlt: ${book.localPath}`);
    }
  }

  assert(/(^|\n)\.data\/(\n|$)/.test(gitignore), '.gitignore muss .data/ ausschliessen.');
  for (const pattern of ['*.epub', '*.pdf', '*.mobi', '*.azw', '*.azw3']) {
    assert(gitignore.includes(pattern), `.gitignore fehlt ${pattern}.`);
  }

  const ignored = [resolve('.git'), resolve('node_modules'), resolve(REFERENCE_BOOK_DIR)];
  const bookFilesOutsideStore = walk('.', ignored).filter((path) => SUPPORTED_REFERENCE_EXTENSIONS.has(extname(path).toLowerCase()));
  assert(bookFilesOutsideStore.length === 0, `Buchdateien ausserhalb ${REFERENCE_BOOK_DIR}: ${bookFilesOutsideStore.join(', ')}`);

  console.log('Reference validation completed.');
} catch (error) {
  console.error(`Reference validation failed: ${error.message}`);
  process.exit(1);
}
