import { scanLocalReferences } from '../src/server/references/reference-scanner.js';

const result = scanLocalReferences();

console.log(`Referenzscan abgeschlossen: ${result.filesFound} Datei(en), ${result.added} neu registriert, ${result.missing} fehlend.`);
for (const book of result.books) {
  console.log(`- ${book.id}: ${book.title} [${book.fileType}] ${book.status}`);
}
if (result.missing) {
  console.warn('Warnung: Einige Registry-Eintraege zeigen auf fehlende lokale Dateien.');
}
