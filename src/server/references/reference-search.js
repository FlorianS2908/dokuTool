import { listLocalReferences, loadReferenceTopics } from './reference-store.js';

function includesQuery(values, query) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return true;
  return values.some((value) => String(value || '').toLowerCase().includes(needle));
}

export function searchReferenceMetadata(query = '') {
  return listLocalReferences().filter((reference) =>
    includesQuery([
      reference.id,
      reference.title,
      reference.fileType,
      ...(reference.topics || []),
      ...(reference.mappedRules || [])
    ], query)
  ).map((reference) => ({
    id: reference.id,
    title: reference.title,
    fileType: reference.fileType,
    topics: reference.topics || [],
    mappedRules: reference.mappedRules || [],
    status: reference.status || 'missing',
    expectedLocalPath: reference.expectedLocalPath,
    localPath: reference.localPath
  }));
}

export function getReferenceTopics() {
  return loadReferenceTopics();
}
