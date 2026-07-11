import { importReferenceFile } from '../src/server/references/reference-importer.js';

const files = process.argv.slice(2).filter(Boolean);

if (!files.length) {
  console.error('Bitte mindestens eine PDF- oder EPUB-Datei angeben.');
  console.error('Beispiel: npm run references:import -- "C:\\\\Buecher\\\\Neues Buch.pdf"');
  process.exit(1);
}

const imported = [];
const failed = [];

for (const file of files) {
  try {
    const result = importReferenceFile(file);
    imported.push(result.record);
    console.log(`OK ${result.record.title} -> ${result.copiedTo}`);
  } catch (error) {
    failed.push({ file, error: error.message });
    console.error(`FEHLER ${file}: ${error.message}`);
  }
}

console.log(`Import abgeschlossen: ${imported.length} importiert, ${failed.length} fehlgeschlagen.`);
if (failed.length) process.exit(1);
