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
import { DEFAULT_CONFIG } from "./types.ts";
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

	pi.on("session_start", async (_e, ctx) => {
		if (!ctx.hasUI) return;
		config = loadConfig(ctx.cwd);
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
				const name = await generateSessionName(ctx, config, {
					turns: [{ user: prompt }],
				});
				pi.setSessionName(name);
			} catch (err) {
				const reason = err instanceof Error ? err.message : String(err);
				const fallback = prompt
					.slice(0, config.maxLength || undefined)
					.replace(/\n/g, " ")
					.trim();
				pi.setSessionName(fallback || "New session");
				ctx.ui.notify(
					`Session naming failed (${reason}) — using fallback title.`,
					"warning",
				);
			}
		})();
	});

	pi.registerCommand("name-format", {
		description: "Show name-format status and config",
		handler: async (_a, ctx) => {
			const lines = [
				`Name Format: ${config.enabled ? "enabled" : "disabled"}`,
				`Model: ${config.provider && config.model ? `${config.provider}/${config.model}` : "(current session model)"}`,
				`Language: ${config.language}`,
				`Format prompt: ${config.formatPrompt}`,
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
				ctx.ui.notify(
					"No conversation available to generate a name from.",
					"warning",
				);
				return;
			}
			try {
				const name = await generateSessionName(ctx, config, { turns });
				pi.setSessionName(name);
				ctx.ui.notify(`Session renamed: ${name}`, "info");
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
				ctx.ui.notify(
					"name-format:setting requires an interactive UI",
					"error",
				);
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
				ctx.ui.notify("name-format: settings saved", "info");
			} catch (err) {
				const reason = err instanceof Error ? err.message : String(err);
				ctx.ui.notify(`Save failed: ${reason}`, "error");
			}
		},
	});

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
					config.formatPrompt,
					"Respect the format when possible. Naming rules:",
					...NAMING_RULES,
					`Language: ${config.language}.`,
				].join(" "),
			}),
		}),

		async execute(_id, params, _signal, _onUpdate, ctx) {
			const name = clean(params.name, config.maxLength);
			pi.setSessionName(name);
			ctx.ui.notify(`Session renamed: ${name}`, "info");
			return {
				content: [{ type: "text", text: `Session renamed to: ${name}` }],
				details: undefined,
			};
		},
	});
}
