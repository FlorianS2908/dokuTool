import { readFileSync } from 'node:fs';

const rulesets = [
  { path: 'rulesets/ihk_abschlussprojekt_ruleset_v1.json', type: 'legacy' },
  { path: 'rulesets/kosten_ressourcen_rules_v3.json', type: 'legacy' },
  { path: 'rulesets/fiae_ruleset_v2.json', type: 'fiae' }
];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateFiaeRuleset(data) {
  assert(data.id === 'fiae_ruleset_v2', 'fiae_ruleset_v2.json hat unerwartete id.');
  assert(Array.isArray(data.rules), 'fiae_ruleset_v2.json braucht rules[].');
  assert(data.rules.length >= 100, 'fiae_ruleset_v2.json enthaelt zu wenige Regeln.');

  const ids = new Set();
  for (const rule of data.rules) {
    assert(rule.id, 'Regel ohne id.');
    assert(!ids.has(rule.id), `Doppelte Regel-ID: ${rule.id}`);
    ids.add(rule.id);
    for (const field of ['title', 'category', 'severity']) {
      assert(rule[field], `${rule.id} fehlt Pflichtfeld ${field}.`);
    }
    assert(['CRITICAL', 'MAJOR', 'MINOR', 'INFO'].includes(rule.severity), `${rule.id} hat ungueltige severity.`);
    assert(rule.applies && typeof rule.applies === 'object', `${rule.id} fehlt applies-Struktur.`);
    if (rule.applies.always === false) {
      assert(Array.isArray(rule.applies.when), `${rule.id} ist bedingt, hat aber kein applies.when[].`);
      assert(rule.applies.when.length > 0, `${rule.id} ist bedingt, aber applies.when ist leer.`);
    }
  }
}

for (const item of rulesets) {
  const data = readJson(item.path);
  if (item.type === 'fiae') validateFiaeRuleset(data);
  else assert(data.rules || data.blocker_rules || data.version, `${item.path} sieht nicht wie ein Ruleset aus.`);
  console.log(`OK ${item.path}`);
}

console.log('Ruleset validation completed.');
