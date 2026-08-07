# Agent Installation Guide

This file is for AI agents that are asked to install rules or skills from this repository into a user's local agent configuration.

## What this repository provides

This repository contains reusable cross-agent items:

- `language-mirroring` — rule: reply in the user's language and correct English grammar/spelling mistakes.
- `engineering-terminology-explainer` — rule: after coding work, add a concise `专业术语` note when the solution demonstrates a reusable engineering concept.

The machine-readable index is `registry.json`. Target presets are in `targets.json`.

## Preferred installation method

If the user provides this GitHub repository URL, do not ask them to clone it. Use the GitHub-backed `npx` form:

```bash
npx github:<owner>/<repo> list
npx github:<owner>/<repo> targets
npx github:<owner>/<repo> install <name> --preset <preset> --backup
```

Replace `<owner>/<repo>` with the repository owner and name from the user's GitHub URL.

Examples:

```bash
npx github:<owner>/<repo> install language-mirroring --preset claude-code-user-rules --backup
npx github:<owner>/<repo> install engineering-terminology-explainer --preset claude-code-user-rules --backup
```

## Choosing a target preset

Use the user's agent and scope to choose the preset:

| User intent | Preset |
| --- | --- |
| Claude Code, all projects / global / user-level | `claude-code-user-rules` |
| Claude Code, current project only | `claude-code-project-rules` |
| Ruler, current project rules | `ruler-project-rules` |
| Custom rule file | use `--mode rule-file --target <file>` |
| Custom rule directory | use `--mode rule-directory --target <dir>` |
| Skill directory | use `--mode skill-directory --target <dir>` |

If the user has not said whether the rule should be global or project-only, ask one clarification question before writing files.

## Safety rules

1. Prefer `--dry-run` first when the target path is custom or uncertain.
2. Use `--backup` for real installs and updates.
3. Do not overwrite unrelated user instructions. The installer uses managed blocks for `rule-file` mode.
4. If a command fails because `npx github:<owner>/<repo>` cannot resolve, tell the user to verify that the GitHub repository is public and has `package.json` with a `bin` entry.

## Common user requests

### "Install your language mirroring rule for Claude Code globally"

Run:

```bash
npx github:<owner>/<repo> install language-mirroring --preset claude-code-user-rules --backup
```

### "Install both rules for Claude Code globally"

Run:

```bash
npx github:<owner>/<repo> install language-mirroring --preset claude-code-user-rules --backup
npx github:<owner>/<repo> install engineering-terminology-explainer --preset claude-code-user-rules --backup
```

### "Install these rules into this project"

For Claude Code project-level rules, run from the project root:

```bash
npx github:<owner>/<repo> install language-mirroring --preset claude-code-project-rules --backup
npx github:<owner>/<repo> install engineering-terminology-explainer --preset claude-code-project-rules --backup
```

For Ruler project rules, run from the project root:

```bash
npx github:<owner>/<repo> install language-mirroring --preset ruler-project-rules --backup
npx github:<owner>/<repo> install engineering-terminology-explainer --preset ruler-project-rules --backup
```

### "Update installed rules"

Run the matching update command with the same preset or target used during install:

```bash
npx github:<owner>/<repo> update language-mirroring --preset claude-code-user-rules --backup
npx github:<owner>/<repo> update engineering-terminology-explainer --preset claude-code-user-rules --backup
```
