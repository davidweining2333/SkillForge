# Skills & Rules

本仓库是一个跨 Agent 的通用 Skills / Rules 安装仓库。

- **Skill**：适合“按需触发”的任务能力，例如数据可视化、安全审查、代码迁移。
- **Rule**：适合“长期生效”的行为约束，例如语言镜像、回答风格、任务完成后的固定检查。

> 结论：Rules 也需要支持安装。因为不同 Agent 的规则入口不同，安装器必须支持用户自选目标路径，并提供常见 preset。

## 快速安装：不需要 clone

本仓库配置了 [package.json](package.json) 和 [bin/meos-skills.mjs](bin/meos-skills.mjs)，可以直接通过 GitHub + `npx` 运行。

把下面命令里的 `<owner>/<repo>` 替换成你的 GitHub 仓库，例如 `your-name/skills`：

```bash
npx github:<owner>/<repo> list
npx github:<owner>/<repo> targets
```

安装到 Claude Code 用户级 rules 目录，让规则在所有项目生效。每个 rule 都会作为独立文件安装，便于后续单独升级、删除和审计：

```bash
npx github:<owner>/<repo> install language-mirroring --preset claude-code-user-rules --backup
npx github:<owner>/<repo> install engineering-terminology-explainer --preset claude-code-user-rules --backup
```

安装到当前项目的 Claude Code rules 目录：

```bash
npx github:<owner>/<repo> install language-mirroring --preset claude-code-project-rules --backup
npx github:<owner>/<repo> install engineering-terminology-explainer --preset claude-code-project-rules --backup
```

安装到 Ruler 项目规则目录：

```bash
npx github:<owner>/<repo> install language-mirroring --preset ruler-project-rules --backup
npx github:<owner>/<repo> install engineering-terminology-explainer --preset ruler-project-rules --backup
```

升级已安装规则：

```bash
npx github:<owner>/<repo> update language-mirroring --preset claude-code-user-rules --backup
npx github:<owner>/<repo> update engineering-terminology-explainer --preset claude-code-user-rules --backup
```

## 让 Agent 用自然语言帮你安装

如果用户不想自己运行命令，也可以把本仓库 GitHub 地址发给正在使用的 Agent，并说明目标。

示例提示词：

```text
请从这个 GitHub 仓库安装 rules：<你的 GitHub 仓库 URL>
我要安装 language-mirroring 和 engineering-terminology-explainer。
我是 Claude Code 用户，请安装到用户级 rules 目录，让所有项目都生效。每个 rule 必须独立文件安装，不要合并到同一个规则文件。安装前先 dry-run，确认路径后用 --backup 安装。
```

或者：

```text
请从这个 GitHub 仓库安装 rules：<你的 GitHub 仓库 URL>
我要在当前项目安装 language-mirroring 和 engineering-terminology-explainer。
请把每个 rule 安装成独立文件，不要合并到同一个规则文件。如果是 Claude Code 项目，请写入项目 .claude/rules；如果是 Ruler 项目，请写入 .ruler/rules。安装时保留备份。
```

给 Agent 的详细安装说明在 [AGENT_INSTALL.md](AGENT_INSTALL.md)。

## 仓库内容

- [package.json](package.json)：让仓库可通过 `npx github:<owner>/<repo>` 直接运行。
- [bin/meos-skills.mjs](bin/meos-skills.mjs)：统一 CLI 入口，支持 `list`、`targets`、`install`、`update`、`validate`。
- [AGENT_INSTALL.md](AGENT_INSTALL.md)：给 AI Agent 阅读的自然语言安装指南。
- [registry.json](registry.json)：机器可读的安装索引，记录 skill / rule 的名称、版本、路径和安装模式。
- [targets.json](targets.json)：常见 Agent 安装目标预设。
- [rules/](rules/)：长期生效的规则文件。
- [_template/SKILL.md](_template/SKILL.md)：新增 Skill 时使用的模板。
- [scripts/validate-skills.mjs](scripts/validate-skills.mjs)：校验仓库结构、元数据、registry 和 targets。
- [scripts/install.mjs](scripts/install.mjs)：安装 skill 或 rule。
- [scripts/update.mjs](scripts/update.mjs)：按版本升级已安装的 skill 或 rule。

## 推荐结构

```text
skills/
├── registry.json
├── targets.json
├── rules/
│   ├── language-mirroring.md
│   └── engineering-terminology-explainer.md
├── scripts/
│   ├── install.mjs
│   ├── update.mjs
│   └── validate-skills.mjs
└── react-code-review/
    ├── SKILL.md
    ├── references/       # 详细文档，按需读取
    ├── examples/         # 输入输出示例
    ├── scripts/          # 可执行辅助脚本
    └── assets/           # 模板、图片等静态资源
```

## Skill 和 Rule 怎么选

### 适合做 Skill

- 只在特定任务中使用。
- 需要较长的工作流说明、参考资料、脚本或示例。
- Agent 可以根据用户请求明确判断“现在要使用这个能力”。

例如：

- `dataviz`
- `security-review`
- `react-code-review`

### 适合做 Rule

- 希望每轮对话或每次编码后都生效。
- 更像行为偏好、输出规范、检查清单。
- 不应该依赖 Agent “想起来触发 skill”。

本仓库当前两个条目已经改为 Rule：

- [rules/language-mirroring.md](rules/language-mirroring.md)：每次按用户语言回复并纠正英文。
- [rules/engineering-terminology-explainer.md](rules/engineering-terminology-explainer.md)：编码任务完成后，如有可复用工程概念，则补充“专业术语”。

## 查看可用安装目标

```bash
node scripts/install.mjs --list-targets
```

当前内置 preset 来自 [targets.json](targets.json)，包括：

- `claude-code-user-rules`
- `claude-code-project-rules`
- `claude-code-user-instructions`
- `claude-code-project-instructions`
- `claude-code-user-skills`
- `claude-code-project-skills`
- `ruler-project-rules`
- `ruler-project-skills`

> preset 是便捷入口，不是限制。用户始终可以通过 `--target` 自选目录或文件。

## 安装 Rule

### 默认安装到规则目录

Rule 默认安装为独立 Markdown 文件，不合并到同一个规则文件中。这样后续可以按单个 rule 升级、删除、审计和比较差异。

Claude Code 用户级 rules 目录：

```bash
node scripts/install.mjs language-mirroring --preset claude-code-user-rules
node scripts/install.mjs engineering-terminology-explainer --preset claude-code-user-rules
```

Claude Code 项目级 rules 目录：

```bash
node scripts/install.mjs language-mirroring --preset claude-code-project-rules
node scripts/install.mjs engineering-terminology-explainer --preset claude-code-project-rules
```

Ruler 项目 rules 目录：

```bash
node scripts/install.mjs language-mirroring --preset ruler-project-rules
```

也可以自选规则目录：

```bash
node scripts/install.mjs language-mirroring --mode rule-directory --target ./.ruler/rules
```

会生成独立文件：

```text
.ruler/rules/language-mirroring.md
```

### 单文件规则入口仅作为 fallback

如果某个 Agent 只支持 `CLAUDE.md` 这类单文件规则入口，才使用 `rule-file` 模式。安装器会用托管注释块包住规则，后续升级时只替换对应块，不覆盖用户其他内容。

```bash
node scripts/install.mjs language-mirroring --preset claude-code-user-instructions
```

等价于自选目标：

```bash
node scripts/install.mjs language-mirroring --mode rule-file --target ~/.claude/CLAUDE.md
```

生成的托管块类似：

```md
<!-- skills-repo:start language-mirroring 0.1.0 -->
...
<!-- skills-repo:end language-mirroring -->
```

## 安装 Skill

如果 registry 中的条目类型是 `skill`，可以安装到 skills 目录：

```bash
node scripts/install.mjs some-skill --preset claude-code-user-skills
```

或自选目录：

```bash
node scripts/install.mjs some-skill --mode skill-directory --target ~/.claude/skills
```

当前仓库里的两个条目是 `rule`，不是 `skill`。

## 升级

升级使用 [scripts/update.mjs](scripts/update.mjs)。它是版本感知的安装包装器：

- 目标已安装版本低于仓库版本：更新。
- 目标已安装版本等于或高于仓库版本：跳过。
- 加 `--force`：强制覆盖。
- 加 `--backup`：覆盖前备份。
- 加 `--dry-run`：只查看将执行的操作。

示例：

```bash
node scripts/update.mjs language-mirroring --preset claude-code-user-rules --backup
node scripts/update.mjs engineering-terminology-explainer --preset claude-code-user-rules --dry-run
```

## 安装参数

[scripts/install.mjs](scripts/install.mjs) 和 [scripts/update.mjs](scripts/update.mjs) 支持：

| 参数 | 说明 |
| --- | --- |
| `--target <path>` | 用户自选安装目标。rule-file 模式是文件路径；rule-directory / skill-directory 模式是目录路径。 |
| `--preset <name>` | 使用 [targets.json](targets.json) 中的预设目标。 |
| `--mode <mode>` | 指定安装模式：`rule-file`、`rule-directory`、`skill-directory`。 |
| `--force` | 即使目标版本相同或更高，也强制覆盖。 |
| `--backup` | 覆盖前备份旧文件或旧目录。 |
| `--dry-run` | 只打印将要执行的操作，不写入文件。 |
| `--list-targets` | 列出可用安装目标预设。 |

`--target` 优先级高于 `--preset` 的路径，`--mode` 优先级高于 `--preset` 的模式。

## 校验

新增或修改 Skill / Rule 后，运行：

```bash
node scripts/validate-skills.mjs
```

校验内容包括：

- [registry.json](registry.json) 是否存在且可解析。
- [targets.json](targets.json) 中的 preset 是否包含合法 `path` 和 `mode`。
- 每个 registry entry 是否包含 `name`、`type`、`title`、`description`、`version`、`path`。
- `name` 是否为 kebab-case。
- `version` 是否符合 SemVer。
- `installModes` 和 `recommendedMode` 是否合法。
- `rule` 是否指向 [rules/](rules/) 下的 Markdown 文件。
- `skill` 是否指向包含 `SKILL.md` 的目录。
- 源文件 frontmatter 是否与 registry 一致。

## 元数据字段

Skill 的入口是 `<skill-name>/SKILL.md`，Rule 的入口是 `rules/<rule-name>.md`。两者都建议使用 frontmatter：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `name` | 是 | 全仓库唯一、稳定的 kebab-case 名称，应与目录名或文件名一致。 |
| `title` | 是 | 人类可读标题。 |
| `description` | 是 | 说明做什么以及何时应使用。 |
| `version` | 是 | 内容版本，建议使用 SemVer。 |
| `tags` | 否 | 检索标签。 |
| `compatibility` | 否 | 环境、工具或运行时要求。 |

## registry.json

[registry.json](registry.json) 是仓库的安装索引。Rule 示例：

```json
{
  "name": "language-mirroring",
  "type": "rule",
  "title": "Language Mirroring and English Correction",
  "description": "Reply in the user's language and correct all English grammar and spelling mistakes.",
  "version": "0.1.0",
  "path": "rules/language-mirroring.md",
  "tags": ["language", "writing", "communication"],
  "compatibility": ["generic-agent"],
  "installModes": ["rule-directory", "rule-file"],
  "recommendedMode": "rule-directory",
  "updatedAt": "2026-08-07"
}
```

原则：

1. `name` 必须与源文件 frontmatter 中的 `name` 一致。
2. `path` 使用相对仓库根目录的路径。
3. `version` 应与源文件 frontmatter 中的版本一致。
4. 新增、删除或重命名条目时必须同步更新 [registry.json](registry.json)。
5. 长期行为优先登记为 `rule`，按需能力优先登记为 `skill`。

## 新增 Rule 流程

1. 在 [rules/](rules/) 新增 `<rule-name>.md`。
2. 补齐 frontmatter：`name`、`title`、`description`、`version`。
3. 在正文中写清楚长期生效的规则内容。
4. 在 [registry.json](registry.json) 中新增对应条目，`type` 使用 `rule`。
5. 运行：

   ```bash
   node scripts/validate-skills.mjs
   ```

## 新增 Skill 流程

1. 复制模板：

   ```bash
   cp -r _template my-new-skill
   ```

2. 修改 `my-new-skill/SKILL.md`：
   - `name` 改为 `my-new-skill`
   - 补齐 `title`、`description`、`version`、`tags`
   - 写清楚适用场景、输入、工作流程、输出和完成条件

3. 如有长文档、示例或脚本，分别放入：
   - `references/`
   - `examples/`
   - `scripts/`

4. 在 [registry.json](registry.json) 中新增对应条目，`type` 使用 `skill`。

5. 运行校验。

## 编写原则

1. `description` 同时写清楚“做什么”和“何时使用”。
2. Rule 写成明确、长期生效的行为要求；Skill 写成按需执行的工作流。
3. 不要假设 Agent 一定拥有某个专有工具；使用 `read`、`search`、`shell` 等抽象能力名称。
4. 专有命令放在 Agent 兼容说明中，或交给未来适配器映射。
5. 长篇背景资料移入 `references/`，避免每次加载 Skill 时占用大量上下文。
6. 脚本必须说明输入、输出、依赖和副作用，不要要求用户执行不可信的网络脚本。

## 贡献检查清单

提交前确认：

- [ ] 源文件名 / 目录名、frontmatter `name`、[registry.json](registry.json) 中的 `name` 一致。
- [ ] `type` 正确：长期行为用 `rule`，按需能力用 `skill`。
- [ ] `description` 足够清楚，能帮助 Agent 判断用途。
- [ ] `version` 已按 SemVer 更新。
- [ ] `installModes` 和 `recommendedMode` 合理。
- [ ] 引用的文件、示例、脚本都存在。
- [ ] 已运行 `node scripts/validate-skills.mjs` 并通过。
