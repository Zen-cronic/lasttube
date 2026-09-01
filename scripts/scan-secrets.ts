// Secret scan over every git-tracked (and staged) file. Reads secret values
// from .env in memory only; values are never passed as arguments or printed.
// Exits non-zero if any tracked file contains a secret value or a
// credential-bearing pattern.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { loadEnvFile } from '../server/env.ts';

const SECRET_ENV_KEYS = [
  'PERFECT_CORP_API_KEY',
  'PERFECT_CORP_API_SECRET',
  'SERPAPI_KEY',
  'FEATHERLESS_API_KEY',
];

const SUSPECT_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'api_key query param with value', re: /[?&]api_key=(?!\[REDACTED\])[^&\s"']+/i },
  { name: 'AWS presigned signature', re: /X-Amz-Signature=(?!\[REDACTED\])[^&\s"']+/i },
  { name: 'bearer token literal', re: /Bearer\s+(?!YOUR_API_KEY|\[REDACTED\])[A-Za-z0-9._~+/=-]{30,}/ },
];

function main() {
  loadEnvFile();
  const secrets = SECRET_ENV_KEYS.map((k) => ({ key: k, value: process.env[k] ?? '' })).filter(
    (s) => s.value.length >= 8,
  );

  const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
  const staged = execFileSync('git', ['diff', '--cached', '--name-only', '-z'], {
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean);
  const files = [...new Set([...tracked, ...staged])];

  const findings: string[] = [];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    if (fs.statSync(file).isDirectory()) continue;
    const buf = fs.readFileSync(file);
    // Skip binary-ish files for pattern checks but still scan for raw secrets.
    const text = buf.toString('utf8');
    for (const s of secrets) {
      if (text.includes(s.value)) {
        findings.push(`${file}: contains the value of ${s.key}`);
      }
    }
    const isBinary = buf.subarray(0, 1024).includes(0);
    if (isBinary) continue;
    // The scanner defines the suspect patterns as literals; skip pattern
    // checks on itself (raw secret values above are still checked).
    if (file === 'scripts/scan-secrets.ts') continue;
    for (const p of SUSPECT_PATTERNS) {
      if (p.re.test(text)) {
        findings.push(`${file}: matches suspect pattern "${p.name}"`);
      }
    }
  }

  if (findings.length > 0) {
    console.error('[scan:secrets] FAIL');
    for (const f of findings) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log(
    `[scan:secrets] OK — ${files.length} files scanned, ${secrets.length} secret values checked (values never printed).`,
  );
}

// Run from the repo root regardless of invocation cwd.
process.chdir(path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'));
main();
