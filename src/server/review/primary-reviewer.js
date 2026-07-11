import { reviewFromBase } from './review-schema.js';

export async function runPrimaryReviewer({ baseResult, evidence = [], round = 1 }) {
  return reviewFromBase({
    reviewer: 'primary',
    round,
    baseResult,
    evidence,
    note: 'Primary Reviewer bindet die Bewertung an Ruleset, Basisergebnis und vorhandene Fundstellen.'
  });
}
