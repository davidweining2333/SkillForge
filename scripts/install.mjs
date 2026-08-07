#!/usr/bin/env node

import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const registryPath = join(root, 'registry.json');
const targetsPath = join(root, 'targets.json');

function usage() {
  console.log(`Usage:
  node scripts/install.mjs <name> --target <path> [--mode rule-file|rule-directory|skill-directory]
  node scripts/install.mjs <name> --preset <target-name>

Options:
  --target <path>   Install target path. Overrides preset path.
  --preset <name>   Target preset from targets.json.
  --mode <mode>     Install mode. Overrides preset mode.
  --force           Replace even when installed version is same or newer.
  --backup          Backup existing target before replacing.
  --dry-run         Show what would happen without writing files.
  --list-targets    Print available target presets.
`);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      args._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    if (['force', 'backup', 'dry-run', 'list-targets', 'help'].includes(key)) {
      args[key] = true;
    } else {
      args[key] = argv[++i];
    }
  }
  return args;
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function expandPath(path) {
  if (!path) return path;
  if (path === '~') return homedir();
  if (path.startsWith('~/') || path.startsWith('~\\')) return join(homedir(), path.slice(2));
  return resolve(process.cwd(), path);
}

function stripFrontmatter(content) {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
}

function readFrontmatterVersion(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return null;
  const version = match[1].match(/^version:\s*['"]?([^'"\r\n]+)['"]?\s*$/m);
  return version?.[1]?.trim() || null;
}

function compareVersions(a, b) {
  const left = String(a || '0.0.0').split(/[+-]/)[0].split('.').map(Number);
  const right = String(b || '0.0.0').split(/[+-]/)[0].split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if ((left[i] || 0) > (right[i] || 0)) return 1;
    if ((left[i] || 0) < (right[i] || 0)) return -1;
  }
  return 0;
}

function backupPath(path) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
  return `${path}.backup-${stamp}`;
}

function maybeBackup(path, options) {
  if (!options.backup || !existsSync(path) || options.dryRun) return null;
  const backup = backupPath(path);
  cpSync(path, backup, { recursive: true });
  return backup;
}

function managedBlock(name, version, body) {
  return `<!-- skills-repo:start ${name} ${version} -->\n${body.trim()}\n<!-- skills-repo:end ${name} -->`;
}

function installedBlockVersion(content, name) {
  const pattern = new RegExp(`<!-- skills-repo:start ${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} ([^ ]+) -->`);
  return content.match(pattern)?.[1] || null;
}

function installRuleFile(item, sourcePath, targetPath, options) {
  const source = readFileSync(sourcePath, 'utf8');
  const body = managedBlock(item.name, item.version, stripFrontmatter(source));
  const existing = existsSync(targetPath) ? readFileSync(targetPath, 'utf8') : '';
  const installedVersion = installedBlockVersion(existing, item.name);

  if (installedVersion && compareVersions(installedVersion, item.version) >= 0 && !options.force) {
    console.log(`${item.name}: already installed (${installedVersion}); use --force to replace.`);
    return;
  }

  const blockPattern = new RegExp(`<!-- skills-repo:start ${item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} [^ ]+ -->[\\s\\S]*?<!-- skills-repo:end ${item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} -->`);
  const next = blockPattern.test(existing)
    ? existing.replace(blockPattern, body)
    : `${existing.trimEnd()}${existing.trim() ? '\n\n' : ''}${body}\n`;

  console.log(`${options.dryRun ? '[dry-run] ' : ''}${item.name}: install rule block to ${targetPath}`);
  if (options.dryRun) return;
  mkdirSync(dirname(targetPath), { recursive: true });
  const backup = maybeBackup(targetPath, options);
  writeFileSync(targetPath, next, 'utf8');
  if (backup) console.log(`${item.name}: backup created at ${backup}`);
}

function installRuleDirectory(item, sourcePath, targetPath, options) {
  const destination = join(targetPath, `${item.name}.md`);
  const installedVersion = existsSync(destination) ? readFrontmatterVersion(readFileSync(destination, 'utf8')) : null;

  if (installedVersion && compareVersions(installedVersion, item.version) >= 0 && !options.force) {
    console.log(`${item.name}: already installed (${installedVersion}); use --force to replace.`);
    return;
  }

  console.log(`${options.dryRun ? '[dry-run] ' : ''}${item.name}: install rule file to ${destination}`);
  if (options.dryRun) return;
  mkdirSync(targetPath, { recursive: true });
  const backup = maybeBackup(destination, options);
  copyFileSync(sourcePath, destination);
  if (backup) console.log(`${item.name}: backup created at ${backup}`);
}

function installSkillDirectory(item, sourcePath, targetPath, options) {
  if (!statSync(sourcePath).isDirectory()) {
    throw new Error(`${item.name}: skill-directory mode requires registry path to be a directory`);
  }

  const destination = join(targetPath, item.name);
  const installedSkill = join(destination, 'SKILL.md');
  const installedVersion = existsSync(installedSkill) ? readFrontmatterVersion(readFileSync(installedSkill, 'utf8')) : null;

  if (installedVersion && compareVersions(installedVersion, item.version) >= 0 && !options.force) {
    console.log(`${item.name}: already installed (${installedVersion}); use --force to replace.`);
    return;
  }

  console.log(`${options.dryRun ? '[dry-run] ' : ''}${item.name}: install skill directory to ${destination}`);
  if (options.dryRun) return;
  mkdirSync(targetPath, { recursive: true });
  const backup = maybeBackup(destination, options);
  if (existsSync(destination)) rmSync(destination, { recursive: true, force: true });
  cpSync(sourcePath, destination, { recursive: true });
  if (backup) console.log(`${item.name}: backup created at ${backup}`);
}

const args = parseArgs(process.argv.slice(2));
const targets = existsSync(targetsPath) ? loadJson(targetsPath) : {};

if (args.help) {
  usage();
  process.exit(0);
}

if (args['list-targets']) {
  for (const [name, target] of Object.entries(targets)) {
    console.log(`${name}\n  mode: ${target.mode}\n  path: ${target.path}\n  ${target.description || ''}`);
  }
  process.exit(0);
}

const name = args._[0];
if (!name) {
  usage();
  process.exit(1);
}

const registry = loadJson(registryPath);
const item = registry.find((entry) => entry.name === name);
if (!item) throw new Error(`Unknown item: ${name}`);

const preset = args.preset ? targets[args.preset] : null;
if (args.preset && !preset) throw new Error(`Unknown preset: ${args.preset}`);

const mode = args.mode || preset?.mode || item.recommendedMode;
const target = expandPath(args.target || preset?.path);
if (!target) throw new Error('Missing --target or --preset');
if (!item.installModes?.includes(mode) && mode !== item.recommendedMode) {
  throw new Error(`${item.name} does not support install mode ${mode}`);
}

const sourcePath = join(root, item.path);
if (!existsSync(sourcePath)) throw new Error(`Missing source path: ${sourcePath}`);

const options = { force: Boolean(args.force), backup: Boolean(args.backup), dryRun: Boolean(args['dry-run']) };

if (mode === 'rule-file') installRuleFile(item, sourcePath, target, options);
else if (mode === 'rule-directory') installRuleDirectory(item, sourcePath, target, options);
else if (mode === 'skill-directory') installSkillDirectory(item, sourcePath, target, options);
else throw new Error(`Unsupported mode: ${mode}`);
