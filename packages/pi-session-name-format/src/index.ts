/**
 * pi-session-name-format — L1/L2/L3 layered session naming.
 *
 * L1: on the first user prompt, the configured model generates a title
 *     matching the user's `formatPrompt` in the configured `language`.
 * L2: `/name-format:rename` regenerates from a conversation excerpt.
 * L3: `rename_session` tool lets the main agent name the session on request.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { DEFAULT_CONFIG, getEffectivePrompt } from "./types.ts";
import type { NameFormatConfig } from "./types.ts";
import { ensureDefaultConfig, loadConfig, saveConfig } from "./config.ts";
import { clean, generateSessionName, NAMING_RULES } from "./name-format.ts";
import { collectTurns } from "./turns.ts";
import { editSettings } from "./ui.ts";

export default function nameFormatExtension(pi: ExtensionAPI) {
  // Idempotent: writes the starter config on first install, no-op on reload.
  ensureDefaultConfig();

  let config: NameFormatConfig = DEFAULT_CONFIG;
  let named = false;

  function registerRenameSessionTool(currentConfig: NameFormatConfig) {
    const effectivePrompt = getEffectivePrompt(currentConfig);
    pi.registerTool({
      name: "rename_session",
      label: "Rename Session",
      description:
        "Set the current session's name — the label shown in the session list. Returns the normalized name actually set (long names are truncated to the configured max length).",
      promptSnippet: "Rename the current session",
      promptGuidelines: [
        "Call only when the user asks to name or rename the session — never rename proactively.",
      ],
      parameters: Type.Object({
        name: Type.String({
          description: [
            "The new session name. The configured format template is the user's preference:",
            effectivePrompt,
            "Respect the format when possible. Naming rules:",
            ...NAMING_RULES,
            `Language: ${currentConfig.language}.`,
          ].join(" "),
        }),
      }),

      async execute(_id, params, _signal, _onUpdate, ctx) {
        const name = clean(params.name, currentConfig.maxLength);
        pi.setSessionName(name);
        ctx.ui.notify(`Session renamed: ${name}`, "info");
        return {
          content: [{ type: "text", text: `Session renamed to: ${name}` }],
          details: undefined,
        };
      },
    });
  }

  // Register initial tool with default/current config at load time
  registerRenameSessionTool(config);

  pi.on("session_start", async (_e, ctx) => {
    config = loadConfig(ctx.cwd);
    registerRenameSessionTool(config);
    if (!ctx.hasUI) return;
    named = Boolean(pi.getSessionName());
  });

  pi.on("before_agent_start", async (event, ctx) => {
    if (!ctx.hasUI || !config.enabled || named) return;
    if (!event.prompt?.trim()) return;
    named = true;
    const prompt = event.prompt;

    // Fire-and-forget so we don't block main-agent startup.
    void (async () => {
      try {
        const result = await generateSessionName(ctx, config, {
          turns: [{ user: prompt }],
        });
        pi.setSessionName(result.name);
        if (result.fallbackUsed) {
          ctx.ui.notify(
            `Naming model ${result.fallbackUsed.failedModel} failed; used session model ${result.fallbackUsed.usedModel} instead.`,
            "warning",
          );
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        ctx.ui.notify(`Session naming failed: ${reason}`, "warning");
      }
    })();
  });

  pi.registerCommand("name-format", {
    description: "Show name-format status and config",
    handler: async (_a, ctx) => {
      const effective = getEffectivePrompt(config);
      const modeDesc =
        config.formatMode === "template"
          ? `template (${config.selectedTemplate ?? "default"})`
          : "custom";
      const lines = [
        `Name Format: ${config.enabled ? "enabled" : "disabled"}`,
        `Model: ${config.provider && config.model ? `${config.provider}/${config.model}` : "(current session model)"}`,
        `Language: ${config.language}`,
        `Format mode: ${modeDesc}`,
        `Format prompt: ${effective}`,
        `Max length: ${config.maxLength}`,
        `Current name: ${pi.getSessionName() ?? "(none)"}`,
        "",
        "Edit config: /name-format:setting (opens interactive editor)",
        "Regenerate name: /name-format:rename",
        "Persistent config: ~/.pi/agent/config/pi-session-name-format.json (or .pi/config/ in a project)",
      ];
      ctx.ui.notify(lines.join("\n"), "info");
    },
  });

  pi.registerCommand("name-format:rename", {
    description: "Regenerate session name using the configured format",
    handler: async (_a, ctx) => {
      const turns = collectTurns(ctx.sessionManager.getBranch());
      if (turns.length === 0) {
        ctx.ui.notify("No conversation available to generate a name from.", "warning");
        return;
      }
      try {
        const result = await generateSessionName(ctx, config, { turns });
        pi.setSessionName(result.name);
        if (result.fallbackUsed) {
          ctx.ui.notify(
            `Naming model ${result.fallbackUsed.failedModel} failed; used session model ${result.fallbackUsed.usedModel} instead.`,
            "warning",
          );
        }
        ctx.ui.notify(`Session renamed: ${result.name}`, "info");
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        ctx.ui.notify(`Rename failed: ${reason}`, "warning");
      }
    },
  });

  pi.registerCommand("name-format:setting", {
    description:
      "Interactively edit name-format config (enabled, model, language, format, max length)",
    handler: async (_a, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("name-format:setting requires an interactive UI", "error");
        return;
      }
      const result = await editSettings(ctx, config);
      if (result === null) {
        ctx.ui.notify("name-format:setting cancelled", "info");
        return;
      }
      try {
        saveConfig(result);
        config = result;
        registerRenameSessionTool(config);
        ctx.ui.notify("name-format: settings saved", "info");
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        ctx.ui.notify(`Save failed: ${reason}`, "error");
      }
    },
  });
}
