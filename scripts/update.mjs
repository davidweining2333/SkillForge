#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const installScript = join(scriptDir, 'install.mjs');
const args = process.argv.slice(2);

if (args.includes('--help') || args.length === 0) {
  console.log(`Usage:
  node scripts/update.mjs <name> --target <path> [--mode rule-file|rule-directory|skill-directory]
  node scripts/update.mjs <name> --preset <target-name>

This is a version-aware wrapper around install.mjs.
It updates only when the repository version is newer, unless --force is passed.
`);
  process.exit(args.length === 0 ? 1 : 0);
}

const result = spawnSync(process.execPath, [installScript, ...args], {
  stdio: 'inherit',
  windowsHide: true,
});

process.exit(result.status ?? 1);
