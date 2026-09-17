# Changelog

All notable changes to `@veardk/pi-session-name-format` are documented in this file.

## [1.1.0] - 2026-09-18

Backward-compatible feature release. Existing configs without `formatMode` still
resolve to custom mode, so nothing changes for current users until they opt in.

### Highlights

- **Session-model fallback** — if the configured naming model fails, the extension retries once with pi's current session model (`ctx.model`). A successful retry names the session and warns which model failed and which one was used instead.
- **Two format modes** — pick from templates stored in the config file, or type a free-form prompt. Four templates ship as defaults.
- **No more fake fallback titles** — a naming failure now reports the failure and leaves the session untitled instead of truncating the user prompt into a title.

### Added

- `formatMode` (`"template"` | `"custom"`), `selectedTemplate`, and `templates` config fields. Templates live in the config file so their text can be edited directly in JSON; four sensible defaults are used when a loaded config predates the field.
- Template mode in the `Format prompt` settings entry: a mode chooser plus a template list showing the currently selected template.
- Key hints on every settings surface, generated from the real keybindings: `Enter confirm · Esc cancel` on inputs, `↑↓ navigate · Enter select · Esc cancel` on menus and the model picker.
- Natural-language examples in the `Language` input (`中文`, `English`, `日本語`, `en`, `zh-CN`, `ja`).

### Changed

- Naming failures that fall back to the session model now warn in English:
  `Naming model <failed> failed; used session model <used> instead.` All user-visible strings are now English.
- The settings menu returns with the cursor already on `Save & exit` after any edit, instead of scrolling back down from the top.
- The `rename_session` tool is re-registered on `session_start` and after a settings save, so its advertised guidance and parameters follow the loaded config and the template actually in effect (previously it always showed the built-in default template).
- The `Format prompt` input pre-fills the prompt that is actually in effect — the selected template body in template mode — rather than the stale custom-mode string.
- The settings menu no longer renders a redundant `✗ Cancel` row; the arrow indicator is the only cursor, and the hardware cursor is hidden while a menu is open.

### Removed

- The prompt-truncation fallback title. A failed naming attempt no longer writes any session name; it only notifies the failure.

### Install

```bash
pi install npm:@veardk/pi-session-name-format
```

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
