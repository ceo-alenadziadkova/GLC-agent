/**
 * Print question-bank v1 metadata (id, priority, branch, reportUse, primary domains).
 * Lightweight "studio" view for engineers — no canvas; pipe to CSV or grep.
 *
 * Usage (from server/):
 *   pnpm question-bank-overview
 *   pnpm question-bank-overview --json
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { QUESTION_FEED_ROLES } from '@glc/intake-core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const bankPath = join(__dirname, '..', '..', 'packages', 'intake-core', 'src', 'question-bank.v1.json');

type Row = {
  id: string;
  section?: string;
  priority?: string;
  branch?: string;
  label?: string;
  reportUse?: string;
};

function parseArgs(argv: string[]): { json: boolean } {
  return { json: argv.includes('--json') };
}

function main() {
  const { json } = parseArgs(process.argv);
  const raw = JSON.parse(readFileSync(bankPath, 'utf8')) as { questions: Row[] };
  const rows = raw.questions ?? [];

  const enriched = rows.map(q => {
    const roles = QUESTION_FEED_ROLES[q.id];
    const primary = roles?.primary?.join(',') ?? '';
    return { ...q, primaryDomains: primary };
  });

  if (json) {
    console.log(JSON.stringify(enriched, null, 2));
    return;
  }

  for (const q of enriched) {
    const br = q.branch ? ` branch=${q.branch}` : '';
    console.log(
      `${q.id}\t${q.section ?? ''}\t${q.priority ?? ''}\t${q.reportUse ?? ''}\t${q.primaryDomains}${br}`,
    );
  }
}

main();
