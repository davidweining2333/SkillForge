#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const binDir = dirname(fileURLToPath(import.meta.url));
const root = join(binDir, '..');
const registryPath = join(root, 'registry.json');
const targetsPath = join(root, 'targets.json');

function usage() {
  console.log(`Usage:
  meos-skills list
  meos-skills targets
  meos-skills install <name> --preset <target-name>
  meos-skills update <name> --preset <target-name>
  meos-skills validate

Examples:
  meos-skills list
  meos-skills targets
  meos-skills install language-mirroring --preset claude-code-user-rules --backup
  meos-skills update engineering-terminology-explainer --preset claude-code-user-rules --backup

Run through GitHub without cloning:
  npx github:<owner>/<repo> list
  npx github:<owner>/<repo> install language-mirroring --preset claude-code-user-rules --backup
`);
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function run(script, args) {
  const result = spawnSync(process.execPath, [join(root, script), ...args], {
    stdio: 'inherit',
    windowsHide: true,
  });
  process.exit(result.status ?? 1);
}

function list() {
  const registry = loadJson(registryPath);
  for (const item of registry) {
    console.log(`${item.name}\n  type: ${item.type}\n  version: ${item.version}\n  recommended: ${item.recommendedMode}\n  ${item.description}`);
  }
}

function targets() {
  const items = existsSync(targetsPath) ? loadJson(targetsPath) : {};
  for (const [name, target] of Object.entries(items)) {
    console.log(`${name}\n  mode: ${target.mode}\n  path: ${target.path}\n  ${target.description || ''}`);
  }
}

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case undefined:
  case 'help':
  case '--help':
  case '-h':
    usage();
    break;
  case 'list':
    list();
    break;
  case 'targets':
  case 'list-targets':
    targets();
    break;
  case 'install':
    run('scripts/install.mjs', args);
    break;
  case 'update':
    run('scripts/update.mjs', args);
    break;
  case 'validate':
    run('scripts/validate-skills.mjs', args);
    break;
  default:
    console.error(`Unknown command: ${command}`);
    usage();
    process.exit(1);
}
