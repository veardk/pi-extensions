# @veardk/pi-session-name-format

[![npm version](https://img.shields.io/npm/v/@veardk/pi-session-name-format)](https://www.npmjs.com/package/@veardk/pi-session-name-format)
[![license](https://img.shields.io/npm/l/@veardk/pi-session-name-format)](https://github.com/veardk/pi-extensions/blob/main/packages/pi-session-name-format/LICENSE)

为 [pi](https://pi.dev) 提供的会话命名扩展 —— **命名格式完全由你说了算**。
随便传任何提示字符串：emoji 前缀、日期戳、分类标签、项目名、纯标题，什么都行。
model 把它当成"形状指南"来生成每个 session 的标题。**没有 schema，我们不做任何占位符解析；LLM 自己解读这个字符串。**

## 一切由你定义

```jsonc
{
  "formatPrompt": "🚀 YYMMDD-type(feature、design、fix、docs、research)-简短描述(5-8字)",
  "language": "中文",
}
```

```jsonc
{ "formatPrompt": "[{project}] {name}", "language": "en" }
```

```jsonc
{ "formatPrompt": "{date} — {name}" }
```

```jsonc
{ "formatPrompt": "我的会话" }
```

| `formatPrompt`                   | 输出示例                                      |
| -------------------------------- | --------------------------------------------- |
| `"{name}"`                       | `Fix auth token refresh bug`                  |
| `"emoji concise session name"`   | `🚀 Fix auth token refresh bug`               |
| `"[{project}] {name}"`           | `[firstmate] Fix auth token refresh bug`      |
| `"🚀 {name}"`                    | `🚀 Fix auth token refresh bug`               |
| `"{date} — {name}"`              | `2025-09-15 — Fix auth token refresh bug`     |
| `"<{category}> {name}"`          | `<bug-fix> Fix auth token refresh bug`        |
| `"YYMMDD-type(fix)-short-title"` | `250915-fix-rename-tooltip-glitch`            |
| `"emoji type(…) 简短描述 emoji"` | `🚀 fix 250915 修复重命名小弹窗的闪烁 bug 🐛` |

字符串**原样**传给 model。LLM 自己填 `{占位符}`（或你写的任何东西）—— 我们不校验、不解析。要 `YYMMDD` 就写 `YYMMDD`，要中文模板就写中文模板。

## 工作方式

新 session 的首条用户提示触发一次 model 调用，按你的格式生成标题。session 永远不会是"Untitled"。当初始名过期时：

- **`/name-format:rename`** 基于对话片段重新生成
- **`rename_session` 工具** 让主 agent 直接命名 —— 主 agent 的完整上下文才是最好的命名源

L1 / L2 / L3 三行说清。**L1 自动**，其余两个按需手动。

## 特性

- **完全可自定义格式** —— 你的字符串、你的规则。LLM 能解读的都行。
- **任意输出语言** —— `en`、`zh-CN`、`ja`、`auto`，随便；原样传给 model。
- **分层修正** —— L1 首轮自动命名、L2 手动重生成、L3 工具驱动命名。
- **交互式 TUI 编辑器** —— `/name-format:setting` 打开菜单，模型选择器支持模糊搜索（匹配 provider、模型 id、显示名）和 `←` / `→` 翻页。
- **预填输入框** —— 语言 / 格式 / 最大长度的编辑直接显示当前值，可原地修改。
- **指定命名模型** —— 用便宜模型（`"provider/id"`），跟主 agent 模型解耦。未设置 = 用 pi 当前会话模型。
- **零外部运行时依赖** —— 直接走 `@earendil-works/pi-ai/compat`；没有 role 抽象层。
- **只在首轮触发** —— 首条提示约 0.5–1 秒，后续零开销。
- **自动降级重试** —— 当配置的命名模型失败时，会自动使用当前会话模型重试一次。若重试成功会发出警告提示；若依然失败则直接通知失败。
- **双格式模式** —— 支持模板选择模式（内置 4 种模板并保存在配置文件中，可直接编辑）与自由文本输入模式。

## 快速开始

```bash
pi install npm:@veardk/pi-session-name-format
```

打开 pi，开启新 session，输入点东西 —— 扩展会自动生成符合你 `formatPrompt` 的标题。想随时改格式？跑 `/name-format:setting`。

## 配置

喜欢交互式？直接在 pi 里跑 `/name-format:setting`。

或者直接写 JSON。全局配置在 `<agent-dir>/config/pi-session-name-format.json`；项目配置在 `<project>/.pi/config/pi-session-name-format.json`，优先级更高。

```jsonc
{
  "enabled": true,
  "model": "anthropic/claude-haiku-4-5",
  "language": "zh-CN",
  "formatMode": "template",
  "selectedTemplate": "type-tag",
  "templates": [
    {
      "id": "type-tag",
      "label": "{yymmdd}-{type(...)}-{concise session name}",
      "template": "{yymmdd}-{type(feature/design/fix/research/refactor/debug/test/perf/chore/review)}-{concise session name}",
    },
    {
      "id": "emoji-concise",
      "label": "emoji concise session name",
      "template": "emoji concise session name",
    },
    {
      "id": "project-name",
      "label": "[{project}] {name}",
      "template": "[{project}] {name}",
    },
    {
      "id": "date-name",
      "label": "{date} — {name}",
      "template": "{date} — {name}",
    },
  ],
  "formatPrompt": "[{project}] {name}",
  "maxLength": 50,
}
```

| 字段               | 默认                           | 说明                                                                                   |
| ------------------ | ------------------------------ | -------------------------------------------------------------------------------------- |
| `enabled`          | `true`                         | 总开关                                                                                 |
| `model`            | _(未设置)_                     | 命名 model 的 `"provider/id"`。**未设置 = 用 pi 当前会话模型。**                       |
| `language`         | `"en"`                         | 输出语言 —— 原样传给 model                                                             |
| `formatMode`       | `"custom"`                     | 格式模式：`"template"`（从模板中选择）或 `"custom"`（自由文本）。旧配置缺省为 custom。 |
| `selectedTemplate` | `"type-tag"`                   | 模板模式下选中的模板 ID                                                                |
| `templates`        | _(内置 4 个模板)_              | 保存在配置中的模板列表（`[{ id, label, template }]`），可在 JSON 中直接修改             |
| `formatPrompt`     | `"emoji concise session name"` | **自由格式的命名提示 —— 自定义模式使用，或作为后备提示。**                             |
| `maxLength`        | `50`                           | 标题最大字符数；`0` = 不限制                                                           |

**配置源，按优先级排序**（第一个非空者胜出）：

1. `<project>/.pi/config/pi-session-name-format.json`（项目覆盖）
2. `<agent-dir>/config/pi-session-name-format.json`（全局）
3. `settings.json` 里的 `piSessionNameFormat`（或旧的 `nameFormat`）块

不跨源合并；缺失字段按字段回退到默认。

**首次加载行为**：扩展加载且全局配置不存在时，会在全局路径写一份起始 JSON 并静默返回。幂等 —— 已存在的文件永远不会覆盖。

## 命令

| 命令                   | 说明                                               |
| ---------------------- | -------------------------------------------------- |
| `/name-format`         | 显示状态和当前配置                                 |
| `/name-format:rename`  | 用配置的格式重新生成 session 名                    |
| `/name-format:setting` | 交互式编辑配置（开关、模型、语言、格式、最大长度） |

## 架构

| 层级          | 触发                           | 来源                                 |
| ------------- | ------------------------------ | ------------------------------------ |
| L1 自动命名   | 新 session 首条用户提示        | `index.ts` 里的 `before_agent_start` |
| L2 手动重命名 | `/name-format:rename`          | `index.ts` 里的 `registerCommand`    |
| L3 工具重命名 | 主 agent 调用 `rename_session` | `index.ts` 里的 `registerTool`       |

```
src/
  index.ts              # 扩展入口 + 命令 + 工具注册
  name-format.ts        # Model 调用、输出清洗、命名规则
  config.ts             # 加载 / 保存 / 解析 / 首次安装引导
  turns.ts              # 遍历 session 分支，收集命名轮次
  ui.ts                 # 交互式设置编辑器（菜单 + 模型选择器 + 输入框）
  model-selector.ts     # 模糊搜索 + 翻页 TUI 选择器
  text-input.ts         # 预填的单行 TUI 输入
  types.ts              # NameFormatConfig + DEFAULT_CONFIG
```

## 依赖

除 pi 本身外无依赖。扩展通过
[`@earendil-works/pi-ai/compat`](https://www.npmjs.com/package/@earendil-works/pi-ai)
（pi 提供）调用 model，交互式设置编辑器用
[`@earendil-works/pi-tui`](https://www.npmjs.com/package/@earendil-works/pi-tui)
（同样由 pi 提供）。

## 安装

```bash
pi install npm:@veardk/pi-session-name-format
```

或者加到 `~/.pi/agent/settings.json`：

```jsonc
{
  "extensions": [
    "/absolute/path/to/pi-extensions/packages/pi-session-name-format",
  ],
}
```

## 协议

MIT —— 见 [LICENSE](./LICENSE)。

[English](./README.md)
