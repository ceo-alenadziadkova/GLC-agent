import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const FORBIDDEN_PATTERNS = [
  {
    name: 'camelCase readiness status token (flowReady)',
    regex: /['"`]flowReady['"`]/g,
  },
  {
    name: 'camelCase readiness status token (auditReady)',
    regex: /['"`]auditReady['"`]/g,
  },
  {
    name: 'legacy readiness field (flow_status)',
    regex: /['"`]flow_status['"`]/g,
  },
  {
    name: 'legacy readiness field (audit_status)',
    regex: /['"`]audit_status['"`]/g,
  },
  {
    name: 'legacy readiness field (readinessStatus)',
    regex: /['"`]readinessStatus['"`]/g,
  },
];

const allowedPaths = new Set([
  'server/src/config/api-user-messages.en.json',
  'src/app/config/intake-diagnostic-pilot-copy.en.ts',
]);

const TARGET_ROOTS = ['src/app', 'server/src'];
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);

function collectSourceFiles(rootPath) {
  const entries = readdirSync(rootPath);
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(rootPath, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (SOURCE_EXTENSIONS.has(path.extname(fullPath))) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = TARGET_ROOTS.flatMap((rootPath) => collectSourceFiles(rootPath));
const violations = [];

for (const filePath of files) {
  if (allowedPaths.has(filePath)) {
    continue;
  }
  const content = readFileSync(filePath, 'utf8');
  for (const { name, regex } of FORBIDDEN_PATTERNS) {
    regex.lastIndex = 0;
    if (!regex.test(content)) {
      continue;
    }
    violations.push({ filePath, name });
  }
}

if (violations.length > 0) {
  console.error('Forbidden readiness vocabulary detected in runtime source files:');
  for (const violation of violations) {
    console.error(`- ${violation.filePath}: ${violation.name}`);
  }
  process.exit(1);
}

console.log('Intake readiness vocabulary check passed.');
