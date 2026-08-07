#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const registryPath = join(root, 'registry.json');
const targetsPath = join(root, 'targets.json');
const semverPattern = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const kebabCasePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const allowedTypes = new Set(['skill', 'rule']);
const allowedModes = new Set(['skill-directory', 'rule-directory', 'rule-file']);
const errors = [];
const warnings = [];

function rel(path) {
  return relative(root, path).replaceAll('\\\\', '/').replaceAll('\\', '/');
}

function fail(path, message) {
  errors.push(`${rel(path)}: ${message}`);
}

function warn(path, message) {
  warnings.push(`${rel(path)}: ${message}`);
}

function parseFrontmatter(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);

  if (!match) {
    fail(filePath, 'missing YAML frontmatter block');
    return {};
  }

  const metadata = {};
  const lines = match[1].split(/\r?\n/);
  let currentKey = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim() || line.trimStart().startsWith('#')) {
      continue;
    }

    const keyValue = line.match(/^([A-Za-z0-9_.-]+):\s*(.*)$/);
    if (keyValue && !line.startsWith(' ')) {
      currentKey = keyValue[1];
      const rawValue = keyValue[2].trim();

      if (!rawValue) {
        metadata[currentKey] = [];
      } else if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
        metadata[currentKey] = rawValue
          .slice(1, -1)
          .split(',')
          .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean);
      } else {
        metadata[currentKey] = rawValue.replace(/^['"]|['"]$/g, '');
      }
      continue;
    }

    const listItem = line.match(/^\s+-\s+(.+)$/);
    if (listItem && currentKey) {
      if (!Array.isArray(metadata[currentKey])) {
        metadata[currentKey] = [metadata[currentKey]].filter(Boolean);
      }
      metadata[currentKey].push(listItem[1].trim().replace(/^['"]|['"]$/g, ''));
    }
  }

  return metadata;
}

function loadJson(filePath, fallback) {
  if (!existsSync(filePath)) {
    fail(filePath, `${rel(filePath)} is required`);
    return fallback;
  }

  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(filePath, `invalid JSON: ${error.message}`);
    return fallback;
  }
}

function discoverSkillDirs() {
  return readdirSync(root)
    .map((entry) => join(root, entry))
    .filter((entryPath) => statSync(entryPath).isDirectory())
    .filter((entryPath) => !['_template', 'rules', 'scripts', '.git', '.claude', 'node_modules', 'dist', 'docs'].includes(entryPath.split(/[\\/]/).at(-1)))
    .filter((entryPath) => existsSync(join(entryPath, 'SKILL.md')));
}

function discoverRuleFiles() {
  const rulesDir = join(root, 'rules');
  if (!existsSync(rulesDir)) return [];
  return readdirSync(rulesDir)
    .map((entry) => join(rulesDir, entry))
    .filter((entryPath) => statSync(entryPath).isFile())
    .filter((entryPath) => extname(entryPath) === '.md');
}

function validateMetadata(filePath, expectedName) {
  const metadata = parseFrontmatter(filePath);

  for (const field of ['name', 'title', 'description', 'version']) {
    if (!metadata[field]) {
      fail(filePath, `missing required frontmatter field: ${field}`);
    }
  }

  if (metadata.name && metadata.name !== expectedName) {
    fail(filePath, `frontmatter name (${metadata.name}) must match file or directory name (${expectedName})`);
  }

  if (metadata.name && !kebabCasePattern.test(metadata.name)) {
    fail(filePath, 'frontmatter name must be kebab-case');
  }

  if (metadata.version && !semverPattern.test(metadata.version)) {
    fail(filePath, 'frontmatter version must be SemVer, for example 0.1.0');
  }

  if (metadata.description && metadata.description.length < 40) {
    warn(filePath, 'description is short; include what the item does and when to use it');
  }

  return metadata;
}

const registry = loadJson(registryPath, []);
if (!Array.isArray(registry)) {
  fail(registryPath, 'registry must be a JSON array');
}

const targets = existsSync(targetsPath) ? loadJson(targetsPath, {}) : {};
const registryItems = Array.isArray(registry) ? registry : [];
const registryByName = new Map();
const registryByPath = new Map();

for (const [name, target] of Object.entries(targets || {})) {
  if (!target.path) fail(targetsPath, `target ${name} is missing path`);
  if (!target.mode) fail(targetsPath, `target ${name} is missing mode`);
  if (target.mode && !allowedModes.has(target.mode)) fail(targetsPath, `target ${name} has unsupported mode ${target.mode}`);
}

for (const item of registryItems) {
  for (const field of ['name', 'type', 'title', 'description', 'version', 'path']) {
    if (!item[field]) {
      fail(registryPath, `registry entry ${item.name || '<unknown>'} is missing ${field}`);
    }
  }

  if (item.name && !kebabCasePattern.test(item.name)) {
    fail(registryPath, `registry entry ${item.name} name must be kebab-case`);
  }

  if (item.type && !allowedTypes.has(item.type)) {
    fail(registryPath, `registry entry ${item.name} has unsupported type ${item.type}`);
  }

  if (item.version && !semverPattern.test(item.version)) {
    fail(registryPath, `registry entry ${item.name} version must be SemVer`);
  }

  if (item.name && registryByName.has(item.name)) {
    fail(registryPath, `duplicate registry name ${item.name}`);
  }

  if (item.path && registryByPath.has(item.path)) {
    fail(registryPath, `duplicate registry path ${item.path}`);
  }

  registryByName.set(item.name, item);
  registryByPath.set(item.path, item);

  const sourcePath = join(root, item.path || '');
  if (item.path && !existsSync(sourcePath)) {
    fail(registryPath, `registry entry ${item.name} points to missing path ${item.path}`);
  }

  if (item.type === 'skill' && item.path && !existsSync(join(sourcePath, 'SKILL.md'))) {
    fail(registryPath, `skill entry ${item.name} must point to a directory containing SKILL.md`);
  }

  if (item.type === 'rule' && item.path && extname(sourcePath) !== '.md') {
    fail(registryPath, `rule entry ${item.name} must point to a Markdown file`);
  }

  if (!Array.isArray(item.installModes) || item.installModes.length === 0) {
    fail(registryPath, `registry entry ${item.name} must define installModes`);
  } else {
    for (const mode of item.installModes) {
      if (!allowedModes.has(mode)) fail(registryPath, `registry entry ${item.name} has unsupported install mode ${mode}`);
    }
  }

  if (!item.recommendedMode) {
    fail(registryPath, `registry entry ${item.name} must define recommendedMode`);
  } else if (!allowedModes.has(item.recommendedMode)) {
    fail(registryPath, `registry entry ${item.name} has unsupported recommendedMode ${item.recommendedMode}`);
  } else if (Array.isArray(item.installModes) && !item.installModes.includes(item.recommendedMode)) {
    fail(registryPath, `registry entry ${item.name} recommendedMode must be included in installModes`);
  }
}

const discoveredItems = [];
const seenNames = new Map();

for (const skillDir of discoverSkillDirs()) {
  const dirName = skillDir.split(/[\\/]/).at(-1);
  const skillPath = join(skillDir, 'SKILL.md');

  if (!kebabCasePattern.test(dirName)) {
    fail(skillDir, 'skill directory name must be kebab-case');
  }

  const metadata = validateMetadata(skillPath, dirName);
  discoveredItems.push({ type: 'skill', path: dirName, metadata, filePath: skillPath });
}

for (const rulePath of discoverRuleFiles()) {
  const fileName = rulePath.split(/[\\/]/).at(-1);
  const expectedName = fileName.replace(/\.md$/, '');

  if (!kebabCasePattern.test(expectedName)) {
    fail(rulePath, 'rule file name must be kebab-case');
  }

  const metadata = validateMetadata(rulePath, expectedName);
  discoveredItems.push({ type: 'rule', path: `rules/${fileName}`, metadata, filePath: rulePath });
}

for (const item of discoveredItems) {
  const name = item.metadata.name;
  if (!name) continue;

  if (seenNames.has(name)) {
    fail(item.filePath, `duplicate item name also found in ${rel(seenNames.get(name))}`);
  }
  seenNames.set(name, item.filePath);

  const registryEntry = registryByName.get(name);
  if (!registryEntry) {
    fail(item.filePath, `${item.type} ${name} is missing from registry.json`);
    continue;
  }

  if (registryEntry.type !== item.type) {
    fail(registryPath, `registry entry ${name} type (${registryEntry.type}) must be ${item.type}`);
  }

  if (registryEntry.path !== item.path) {
    fail(registryPath, `registry entry ${name} path (${registryEntry.path}) must be ${item.path}`);
  }

  if (item.metadata.title && registryEntry.title !== item.metadata.title) {
    warn(registryPath, `registry title for ${name} differs from source metadata`);
  }

  if (item.metadata.version && registryEntry.version !== item.metadata.version) {
    fail(registryPath, `registry version for ${name} differs from source metadata`);
  }
}

for (const item of registryItems) {
  if (item.name && !seenNames.has(item.name)) {
    fail(registryPath, `registry entry ${item.name} has no matching source item`);
  }
}

if (warnings.length > 0) {
  console.log('Warnings:');
  for (const message of warnings) {
    console.log(`  - ${message}`);
  }
}

if (errors.length > 0) {
  console.error('Repository validation failed:');
  for (const message of errors) {
    console.error(`  - ${message}`);
  }
  process.exit(1);
}

const skillCount = discoveredItems.filter((item) => item.type === 'skill').length;
const ruleCount = discoveredItems.filter((item) => item.type === 'rule').length;
console.log(`Repository validation passed: ${skillCount} skill(s), ${ruleCount} rule(s), ${registryItems.length} registry entries.`);
