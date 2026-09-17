/**
 * Interactive TUI editor for the name-format config.
 *
 * Reused primitives:
 * - `ModelSearchSelector` (model-selector.ts) — fuzzy search + page-jump picker
 * - `PrefilledInput`     (text-input.ts)      — single-line input pre-filled with the current value
 * - `SettingsMenuSelector`                    — SelectList menu remembering cursor index (defaults to Save)
 */

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { getSelectListTheme, keyHint, rawKeyHint } from "@earendil-works/pi-coding-agent";
import {
  Container,
  type KeybindingsManager,
  type SelectItem,
  SelectList,
  Spacer,
  Text,
} from "@earendil-works/pi-tui";
import { DEFAULT_TEMPLATES, getEffectivePrompt } from "./types.ts";
import type { FormatTemplate, NameFormatConfig } from "./types.ts";
import { ModelSearchSelector, type ModelItem } from "./model-selector.ts";
import { PrefilledInput } from "./text-input.ts";

/**
 * Menu selector component wrapping SelectList that allows setting initial selectedIndex.
 */
class SettingsMenuSelector extends Container {
  private readonly list: SelectList;
  private readonly keybindings: KeybindingsManager;
  private readonly done: (value: string | undefined) => void;
  private readonly onDispose?: () => void;
  private closed = false;

  constructor(
    title: string,
    items: SelectItem[],
    initialIndex: number,
    keybindings: KeybindingsManager,
    done: (value: string | undefined) => void,
    onDispose?: () => void,
  ) {
    super();
    this.keybindings = keybindings;
    this.done = done;
    this.onDispose = onDispose;

    this.addChild(new Text(title, 1, 0));
    this.addChild(new Spacer(1));
    this.list = new SelectList(items, items.length, getSelectListTheme());
    if (initialIndex >= 0 && initialIndex < items.length) {
      this.list.setSelectedIndex(initialIndex);
    }
    this.list.onSelect = (item) => this.finish(item.value);
    this.list.onCancel = () => this.finish(undefined);
    this.addChild(this.list);
    this.addChild(new Spacer(1));
    this.addChild(
      new Text(
        `${rawKeyHint("↑↓", "navigate")}  ${keyHint("tui.select.confirm", "select")}  ${keyHint("tui.select.cancel", "cancel")}`,
        1,
        0,
      ),
    );
  }

  handleInput(keyData: string): void {
    if (this.closed) return;
    if (this.keybindings.matches(keyData, "tui.select.cancel")) {
      this.finish(undefined);
      return;
    }
    this.list.handleInput(keyData);
  }

  private finish(value: string | undefined): void {
    if (this.closed) return;
    this.closed = true;
    this.onDispose?.();
    this.done(value);
  }
}

/** Menu-driven editor. Returns the edited config, or null if the user cancelled. */
export async function editSettings(
  ctx: ExtensionContext,
  initial: NameFormatConfig,
): Promise<NameFormatConfig | null> {
  let working: NameFormatConfig = { ...initial };
  let dirty = false;
  let nextIndex: number | undefined;

  while (true) {
    const saveLabel = dirty ? "Save & exit" : "✓ Done";
    const menuItems = [
      "▸ Enabled",
      "▸ Model",
      "▸ Language",
      "▸ Format prompt",
      "▸ Max length",
      "──────────────────",
      saveLabel,
    ];

    const saveIndex = menuItems.indexOf(saveLabel);
    const initialIndex = nextIndex ?? 0;

    const choice = await ctx.ui.custom<string | undefined>((tui, _theme, keybindings, done) => {
      const prevCursor = tui.getShowHardwareCursor();
      tui.setShowHardwareCursor(false);
      const selectItems: SelectItem[] = menuItems.map((item) => ({
        value: item,
        label: item,
      }));
      return new SettingsMenuSelector(
        `name-format setting${dirty ? " *" : ""}\n\n${settingsLine(working)}`,
        selectItems,
        initialIndex,
        keybindings,
        done,
        () => tui.setShowHardwareCursor(prevCursor),
      );
    });

    if (choice === undefined) return null;

    if (choice.startsWith("▸ Enabled")) {
      working.enabled = !working.enabled;
      dirty = true;
      nextIndex = saveIndex;
    } else if (choice.startsWith("▸ Model")) {
      const picked = await pickModel(ctx);
      if (picked !== undefined) {
        if (picked === null) {
          working.provider = undefined;
          working.model = undefined;
        } else {
          const idx = picked.indexOf("/");
          if (idx > 0 && idx < picked.length - 1) {
            working.provider = picked.slice(0, idx);
            working.model = picked.slice(idx + 1);
          }
        }
        dirty = true;
        nextIndex = saveIndex;
      }
    } else if (choice.startsWith("▸ Language")) {
      const input = await promptInput(
        ctx,
        "Type language (e.g. 中文, English, 日本語, en, zh-CN, ja):",
        working.language,
        "e.g. 中文, English, 日本語, en, zh-CN, ja",
      );
      if (input !== undefined) {
        const trimmed = input.trim();
        if (trimmed) {
          working.language = trimmed;
          dirty = true;
          nextIndex = saveIndex;
        }
      }
    } else if (choice.startsWith("▸ Format prompt")) {
      const edited = await editFormatPrompt(ctx, working);
      if (edited !== undefined) {
        working = edited;
        dirty = true;
        nextIndex = saveIndex;
      }
    } else if (choice.startsWith("▸ Max length")) {
      const input = await promptInput(
        ctx,
        "Type max length (0 = unlimited):",
        String(working.maxLength),
        "Type number of characters (e.g. 50)",
      );
      if (input !== undefined) {
        const num = Number.parseInt(input.trim(), 10);
        if (Number.isFinite(num) && num >= 0) {
          working.maxLength = num;
          dirty = true;
          nextIndex = saveIndex;
        } else {
          ctx.ui.notify("Invalid number, value unchanged", "warning");
        }
      }
    } else if (choice === "Save & exit" || choice === "✓ Done") {
      return working;
    }
    // "───" separator is a no-op; preserve current nextIndex
  }
}

/**
 * Pre-fill value for the `Format prompt` input: the prompt that is actually in
 * effect right now (template body in template mode, `formatPrompt` otherwise).
 * Kept as a named helper so the pre-fill contract stays testable.
 */
export function formatPromptPrefill(config: NameFormatConfig): string {
  return getEffectivePrompt(config);
}

async function editFormatPrompt(
  ctx: ExtensionContext,
  config: NameFormatConfig,
): Promise<NameFormatConfig | undefined> {
  const currentMode = config.formatMode ?? "custom";
  const modeChoice = await ctx.ui.select(
    `Select Format Mode (Current: ${currentMode === "template" ? "Template" : "Custom / Free text"})`,
    ["▸ Template mode (choose from templates)", "▸ Custom mode (type free-form prompt)"],
  );

  if (!modeChoice) return undefined;

  if (modeChoice.startsWith("▸ Template mode")) {
    const templates: FormatTemplate[] = config.templates?.length
      ? config.templates
      : DEFAULT_TEMPLATES;
    const options = templates.map(
      (t) => `${t.id === config.selectedTemplate ? "●" : "○"} [${t.id}] ${t.template}`,
    );
    const picked = await ctx.ui.select("Select a template", options);
    if (!picked) return undefined;
    const pickedTemplate = templates.find((t) => picked.includes(`[${t.id}]`));
    if (!pickedTemplate) return undefined;

    return {
      ...config,
      formatMode: "template",
      selectedTemplate: pickedTemplate.id,
      templates,
    };
  }

  // Custom mode — pre-fill whatever prompt is actually in effect right now,
  // so a template-mode config shows the template it is currently using.
  const input = await promptInput(
    ctx,
    "Type format prompt (paste allowed):",
    formatPromptPrefill(config),
    "Type format prompt (e.g. {yymmdd}-{type(...)}-{name})",
  );
  if (input === undefined) return undefined;
  return {
    ...config,
    formatMode: "custom",
    formatPrompt: input,
  };
}

function settingsLine(cfg: NameFormatConfig): string {
  const effective = getEffectivePrompt(cfg);
  const modeStr =
    cfg.formatMode === "template" ? `template [${cfg.selectedTemplate ?? "default"}]` : "custom";
  return [
    `● Enabled: ${cfg.enabled ? "on" : "off"}`,
    `● Model: ${cfg.provider && cfg.model ? `${cfg.provider}/${cfg.model}` : "(current session model)"}`,
    `● Language: ${cfg.language}`,
    `● Format mode: ${modeStr}`,
    `● Format prompt: ${effective}`,
    `● Max length: ${cfg.maxLength}`,
  ].join("\n");
}

/** Search-filtered model picker.
 *  Returns the picked `"provider/id"`, `null` for "use current session model",
 *  or `undefined` if cancelled. */
export async function pickModel(ctx: ExtensionContext): Promise<string | null | undefined> {
  const models = ctx.modelRegistry.getAvailable();
  const items: ModelItem[] = [
    { value: "__current__", label: "(current session model)" },
    ...models.map((m) => ({
      value: `${m.provider}/${m.id}`,
      label: `${m.provider}/${m.id}`,
      description: m.name && m.name !== m.id ? m.name : undefined,
    })),
  ];
  return ctx.ui.custom<string | null | undefined>((_tui, _theme, keybindings, done) => {
    return new ModelSearchSelector("Model", items, keybindings, (value) => {
      if (value === undefined) return done(undefined);
      if (value === "__current__") return done(null);
      done(value);
    });
  });
}

/** Pre-filled single-line input. Returns the submitted value, or undefined if cancelled. */
export async function promptInput(
  ctx: ExtensionContext,
  title: string,
  initial: string,
  placeholder?: string,
): Promise<string | undefined> {
  return ctx.ui.custom<string | undefined>((_tui, _theme, keybindings, done) => {
    return new PrefilledInput(
      title,
      initial,
      keybindings,
      (value) => {
        done(value ?? undefined);
      },
      placeholder,
    );
  });
}
