export const REFERENCE_LIBRARY_VERSION = '1.0.0';
export const REFERENCE_ROOT = '.data/references';
export const REFERENCE_BOOK_DIR = '.data/references/books';
export const REFERENCE_EXTRACTED_DIR = '.data/references/extracted';
export const REFERENCE_INDEX_DIR = '.data/references/index';
export const REFERENCE_REGISTRY_PATH = '.data/references/registry.json';
export const REFERENCE_MANIFEST_PATH = 'references/reference-manifest.json';
export const REFERENCE_TOPICS_PATH = 'references/reference-topics.json';
export const SUPPORTED_REFERENCE_EXTENSIONS = new Set(['.pdf', '.epub']);

export function emptyRegistry(now = new Date().toISOString()) {
  return {
    version: REFERENCE_LIBRARY_VERSION,
    updatedAt: now,
    books: []
  };
}
