/**
 * Interactive TUI editor for the name-format config.
 *
 * Three primitives are reused:
 * - `ModelSearchSelector` (model-selector.ts) — fuzzy search + page-jump picker
 * - `PrefilledInput`     (text-input.ts)      — single-line input pre-filled with the current value
 * - `ctx.ui.select`                           — plain up/down list for the main menu
 */

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { NameFormatConfig } from "./types.ts";
import { ModelSearchSelector, type ModelItem } from "./model-selector.ts";
import { PrefilledInput } from "./text-input.ts";

/** Menu-driven editor. Returns the edited config, or null if the user cancelled. */
export async function editSettings(
	ctx: ExtensionContext,
	initial: NameFormatConfig,
): Promise<NameFormatConfig | null> {
	let working: NameFormatConfig = { ...initial };
	let dirty = false;

	while (true) {
		const items = [
			"▸ Enabled",
			"▸ Model",
			"▸ Language",
			"▸ Format prompt",
			"▸ Max length",
			"──────────────────",
			dirty ? "Save & exit" : "✓ Done",
			"✗ Cancel",
		];
		const choice = await ctx.ui.select(
			`name-format setting${dirty ? " *" : ""}\n\n${settingsLine(working)}`,
			items,
		);
		if (choice === undefined || choice === "✗ Cancel") return null;

		if (choice.startsWith("▸ Enabled")) {
			working.enabled = !working.enabled;
			dirty = true;
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
			}
		} else if (choice.startsWith("▸ Language")) {
			const input = await promptInput(ctx, "Language", working.language);
			if (input !== undefined) {
				const trimmed = input.trim();
				if (trimmed) {
					working.language = trimmed;
					dirty = true;
				}
			}
		} else if (choice.startsWith("▸ Format prompt")) {
			const input = await promptInput(
				ctx,
				"Format prompt (paste allowed)",
				working.formatPrompt,
			);
			if (input !== undefined) {
				working.formatPrompt = input;
				dirty = true;
			}
		} else if (choice.startsWith("▸ Max length")) {
			const input = await promptInput(
				ctx,
				"Max length (0 = unlimited)",
				String(working.maxLength),
			);
			if (input !== undefined) {
				const num = Number.parseInt(input.trim(), 10);
				if (Number.isFinite(num) && num >= 0) {
					working.maxLength = num;
					dirty = true;
				} else {
					ctx.ui.notify("Invalid number, value unchanged", "warning");
				}
			}
		} else if (choice === "Save & exit" || choice === "✓ Done") {
			return working;
		}
		// "───" separator is a no-op.
	}
}

function settingsLine(cfg: NameFormatConfig): string {
	return [
		`● Enabled: ${cfg.enabled ? "on" : "off"}`,
		`● Model: ${cfg.provider && cfg.model ? `${cfg.provider}/${cfg.model}` : "(current session model)"}`,
		`● Language: ${cfg.language}`,
		`● Format prompt: ${cfg.formatPrompt}`,
		`● Max length: ${cfg.maxLength}`,
	].join("\n");
}

/** Search-filtered model picker.
 *  Returns the picked `"provider/id"`, `null` for "use current session model",
 *  or `undefined` if cancelled. */
export async function pickModel(
	ctx: ExtensionContext,
): Promise<string | null | undefined> {
	const models = ctx.modelRegistry.getAvailable();
	const items: ModelItem[] = [
		{ value: "__current__", label: "(current session model)" },
		...models.map((m) => ({
			value: `${m.provider}/${m.id}`,
			label: `${m.provider}/${m.id}`,
			description: m.name && m.name !== m.id ? m.name : undefined,
		})),
	];
	return ctx.ui.custom<string | null | undefined>(
		(_tui, _theme, keybindings, done) => {
			return new ModelSearchSelector("Model", items, keybindings, (value) => {
				if (value === undefined) return done(undefined);
				if (value === "__current__") return done(null);
				done(value);
			});
		},
	);
}

/** Pre-filled single-line input. Returns the submitted value, or undefined if cancelled. */
export async function promptInput(
	ctx: ExtensionContext,
	title: string,
	initial: string,
): Promise<string | undefined> {
	return ctx.ui.custom<string | undefined>(
		(_tui, _theme, keybindings, done) => {
			return new PrefilledInput(title, initial, keybindings, (value) => {
				done(value ?? undefined);
			});
		},
	);
}
