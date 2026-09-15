# Changelog

All notable changes to `@veardk/pi-session-name-format` are documented in this file.

## [1.0.0] - 2026-09-15

First stable release.

### Highlights

- **Free-form `formatPrompt`** — the user owns the shape of session names; the model receives the string verbatim and decides how to interpret it. No schema, no placeholder parsing on our side.
- **Per-language output** — name sessions in any language (`en`, `中文`, `日本語`, …); the string is passed to the LLM as-is.
- **Layered correction** — L1 first-turn auto-name, L2 `/name-format:rename`, L3 `rename_session` tool for agent-driven naming.
- **Interactive settings editor** — `/name-format:setting` opens a TUI menu with a fuzzy-search model picker (matches across provider, model id, and display name) and page-jump via `←` / `→`.
- **Pre-filled text inputs** — language / format / max-length edits show the current value and let you edit it directly.
- **Configurable model** — pin a cheap model (`"provider/id"`) regardless of the main agent's model. Unset = use pi's current session model.
- **Zero external runtime deps** — talks to `@earendil-works/pi-ai/compat` directly; no role abstraction, no extra peer dependency.
- **Graceful fallback** — if the model fails, the user prompt is truncated and used as the name; the extension never blocks startup.

### Install

```bash
pi install npm:@veardk/pi-session-name-format
```

See the README for configuration and commands.
