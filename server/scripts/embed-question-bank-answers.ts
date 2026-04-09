/**
 * One-shot / repeatable: merge canon `answer` + `optionCatalogs` into question-bank.v1.json.
 * Run from server/: `pnpm tsx scripts/embed-question-bank-answers.ts`
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { INDUSTRY_OPTIONS } from '../src/config/industry-options.js';
import { buildCanonAnswerContractForBankId } from '../src/intake/bank-question-ui-overrides.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const bankPath = join(__dirname, '../src/intake/question-bank.v1.json');

function main(): void {
  const raw = JSON.parse(readFileSync(bankPath, 'utf8')) as {
    version: string;
    questions: Array<Record<string, unknown>>;
  };
  const questions = raw.questions.map(q => {
    const id = String(q.id);
    return { ...q, answer: buildCanonAnswerContractForBankId(id) };
  });
  const out = {
    version: '1.1.0',
    optionCatalogs: { industry: [...INDUSTRY_OPTIONS] },
    questions,
  };
  writeFileSync(bankPath, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  console.log('Wrote', bankPath, 'version', out.version, 'questions', questions.length);
}

main();
