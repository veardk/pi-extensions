# @veardk/pi-session-name-format

[![npm version](https://img.shields.io/npm/v/@veardk/pi-session-name-format)](https://www.npmjs.com/package/@veardk/pi-session-name-format)
[![license](https://img.shields.io/npm/l/@veardk/pi-session-name-format)](https://github.com/veardk/pi-extensions/blob/main/packages/pi-session-name-format/LICENSE)

**[中文文档](./README.zh.md)**

Session naming for [pi](https://pi.dev) that **puts you in control of the format**.
Pass any hint string you like — emoji prefixes, date stamps, category tags, project
names, plain titles, anything — and a lightweight model uses it as a shape
guide for every session name. **No schema, no placeholder parsing on our side;
the LLM interprets the string itself.**

## Make it yours

```jsonc
{
  "formatPrompt": "🚀 YYMMDD-type(feature、design、fix、docs、research)-short-title",
  "language": "中文"
}
```

```jsonc
{ "formatPrompt": "[{project}] {name}", "language": "en" }
```

```jsonc
{ "formatPrompt": "{date} — {name}" }
```

```jsonc
{ "formatPrompt": "My session" }
```

| `formatPrompt`                | Example output                                              |
| ----------------------------- | ----------------------------------------------------------- |
| `"{name}"`                    | `Fix auth token refresh bug`                                |
| `"emoji concise session name"` | `🚀 Fix auth token refresh bug`                             |
| `"[{project}] {name}"`        | `[firstmate] Fix auth token refresh bug`                    |
| `"🚀 {name}"`                 | `🚀 Fix auth token refresh bug`                             |
| `"{date} — {name}"`           | `2025-09-15 — Fix auth token refresh bug`                   |
| `"<{category}> {name}"`       | `<bug-fix> Fix auth token refresh bug`                      |
| `"YYMMDD-type(fix)-short-title"` | `250915-fix-rename-tooltip-glitch`                       |

The string is passed **verbatim** to the model. The LLM fills `{placeholder}`
tokens (or anything else you write) itself — no validation, no syntax on our
side. If you want `YYMMDD`, type `YYMMDD`. If you want a Chinese template, type
the Chinese template.

## How it works

On the first user prompt of a new session, a model call produces a title
that fits your format. Sessions are never "Untitled". When the initial name
goes stale:

- **`/name-format:rename`** regenerates from the conversation excerpt
- **`rename_session` tool** lets the main agent name the session directly — the
  agent's full context is the best naming source

That's L1 / L2 / L3 in three lines. **L1 is automatic**, the other two are
manual on-demand.

## Features

- **Fully customizable format** — your string, your rules. Anything the LLM can
  interpret works.
- **Any output language** — `en`, `zh-CN`, `ja`, `auto`, anything; passed to the
  model as-is.
- **Layered correction** — L1 first-turn auto-name, L2 manual regenerate,
  L3 tool-driven naming.
- **Interactive TUI editor** — `/name-format:setting` opens a menu with a
  fuzzy-search model picker (matches across provider, model id, display name)
  and page-jump via `←` / `→`.
- **Pre-filled inputs** — language / format / max-length edits show the current
  value and let you edit it directly.
- **Pin the naming model** — use a cheap model (`"provider/id"`) regardless of
  the main agent's model. Unset = use pi's current session model.
- **Zero external runtime deps** — talks to `@earendil-works/pi-ai/compat`
  directly; no role abstraction.
- **First-turn only** — ~0.5–1 s on the first prompt, zero overhead afterwards.
- **Graceful fallback** — if the configured naming model fails, it automatically
  retries once using the current session model (`ctx.model`). If both fail,
  it notifies the failure and leaves the session untitled.
- **Two format modes** — choose from built-in configurable templates or type a
  custom prompt string directly.

## Quick start

```bash
pi install npm:@veardk/pi-session-name-format
```

Open pi, start a new session, type something — the extension generates a title
that matches your `formatPrompt`. To change the format on the fly, run
`/name-format:setting`.

## Configuration

Prefer the interactive editor? Run `/name-format:setting` from pi.

Or write JSON directly. Global config lives at
`<agent-dir>/config/pi-session-name-format.json`; project config at
`<project>/.pi/config/pi-session-name-format.json` and takes precedence.

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
      "template": "{yymmdd}-{type(feature/design/fix/research/refactor/debug/test/perf/chore/review)}-{concise session name}"
    },
    {
      "id": "emoji-concise",
      "label": "emoji concise session name",
      "template": "emoji concise session name"
    },
    {
      "id": "project-name",
      "label": "[{project}] {name}",
      "template": "[{project}] {name}"
    },
    {
      "id": "date-name",
      "label": "{date} — {name}",
      "template": "{date} — {name}"
    }
  ],
  "formatPrompt": "[{project}] {name}",
  "maxLength": 50
}
```

| Field | Default | Description |
| --- | --- | --- |
| `enabled` | `true` | Global on/off switch |
| `model` | _(unset)_ | `"provider/id"` for the naming model. **Unset = use pi's current session model.** |
| `language` | `"en"` | Output language — passed verbatim to the model |
| `formatMode` | `"custom"` | Format mode: `"template"` to select from templates, or `"custom"` for free text. Legacy configs default to `"custom"`. |
| `selectedTemplate` | `"type-tag"` | Selected template id when `formatMode` is `"template"` |
| `templates` | _(4 defaults)_ | List of configurable templates (`[{ id, label, template }]`) stored in config |
| `formatPrompt` | `"emoji concise session name"` | **Free-form session-name hint — used in custom mode, or as fallback.** |
| `maxLength` | `50` | Maximum name length in characters; `0` = unlimited |

**Sources, in priority order** (first non-empty wins):

1. `<project>/.pi/config/pi-session-name-format.json` (project override)
2. `<agent-dir>/config/pi-session-name-format.json` (global)
3. `piSessionNameFormat` (or legacy `nameFormat`) block in `settings.json`

Nothing is merged across sources; missing fields fall back to defaults per-field.

**First-run behavior**: when the extension loads and no global config exists,
it writes a starter JSON at the global path and returns silently. Idempotent —
existing files are never overwritten.

## Commands

| Command | Description |
| --- | --- |
| `/name-format` | Show status and current config |
| `/name-format:rename` | Regenerate the session name using the configured format |
| `/name-format:setting` | Interactively edit config (enabled, model, language, format, max length) |

## Architecture

| Layer | Trigger | Source |
| --- | --- | --- |
| L1 auto-name | First user prompt of a new session | `before_agent_start` handler in `index.ts` |
| L2 manual rename | `/name-format:rename` | `registerCommand` in `index.ts` |
| L3 tool rename | Main agent calls `rename_session` | `registerTool` in `index.ts` |

```
src/
  index.ts              # Extension entry + commands + tool registration
  name-format.ts        # Model invocation, output cleaning, naming rules
  config.ts             # Load / save / parse / first-install bootstrap
  turns.ts              # Walk session branch, collect naming turns
  ui.ts                 # Interactive settings editor (menu + model picker + inputs)
  model-selector.ts     # Fuzzy-search + page-jump TUI selector
  text-input.ts         # Pre-filled single-line TUI input
  types.ts              # NameFormatConfig + DEFAULT_CONFIG
```

## Dependencies

None beyond pi itself. The extension uses
[`@earendil-works/pi-ai/compat`](https://www.npmjs.com/package/@earendil-works/pi-ai)
(provided by pi) for the model call, and
[`@earendil-works/pi-tui`](https://www.npmjs.com/package/@earendil-works/pi-tui)
(also provided by pi) for the interactive settings editor.

## Installation

```bash
pi install npm:@veardk/pi-session-name-format
```

Or add to `~/.pi/agent/settings.json`:

```jsonc
{
  "extensions": [
    "/absolute/path/to/pi-extensions/packages/pi-session-name-format"
  ]
}
```

## License

MIT — see [LICENSE](./LICENSE).