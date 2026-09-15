/**
 * Configuration loading + first-install bootstrap.
 *
 * Sources, in priority order (first non-empty wins):
 *   1. <project>/.pi/config/pi-session-name-format.json
 *   2. <agent-dir>/config/pi-session-name-format.json
 *   3. `piSessionNameFormat` (or legacy `nameFormat`) block in settings.json
 *
 * Nothing is merged across sources; missing fields fall back to
 * `DEFAULT_CONFIG` per-field.
 *
 * `ensureDefaultConfig()` writes a starter JSON at the global path when
 * none exists, so the captain does not have to create the file by hand
 * after installing the extension. Idempotent — never overwrites.
 */

import { getAgentDir } from "@earendil-works/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";
import { DEFAULT_CONFIG } from "./types.ts";
import type { NameFormatConfig } from "./types.ts";

const CONFIG_FILENAME = "pi-session-name-format.json";

/** Starter JSON written on first install. Empty string for `model` is intentional. */
const STARTER_CONFIG = {
	enabled: true,
	model: "",
	language: "en",
	formatPrompt: "emoji concise session name",
	maxLength: 50,
};

function readJson(filePath: string): Record<string, unknown> {
	try {
		return JSON.parse(fs.readFileSync(filePath, "utf-8"));
	} catch {
		return {};
	}
}

function isNonEmpty(
	obj: Record<string, unknown> | undefined,
): obj is Record<string, unknown> {
	return !!obj && Object.keys(obj).length > 0;
}

/** Parse a `"provider/id"` string into its two parts. Returns empty for bad input. */
export function parseModelRef(raw: unknown): {
	provider?: string;
	model?: string;
} {
	if (typeof raw !== "string") return {};
	const idx = raw.indexOf("/");
	if (idx <= 0 || idx === raw.length - 1) return {};
	const provider = raw.slice(0, idx).trim();
	const id = raw.slice(idx + 1).trim();
	return { provider: provider || undefined, model: id || undefined };
}

function parseConfig(raw: Record<string, unknown>): NameFormatConfig {
	const ref = parseModelRef(raw.model);
	return {
		enabled:
			typeof raw.enabled === "boolean" ? raw.enabled : DEFAULT_CONFIG.enabled,
		provider:
			typeof raw.provider === "string" && raw.provider
				? raw.provider
				: ref.provider,
		model:
			typeof raw.modelId === "string" && raw.modelId ? raw.modelId : ref.model,
		maxLength:
			typeof raw.maxLength === "number" && Number.isFinite(raw.maxLength)
				? Math.max(0, Math.floor(raw.maxLength))
				: DEFAULT_CONFIG.maxLength,
		language:
			typeof raw.language === "string" && raw.language.trim()
				? raw.language
				: DEFAULT_CONFIG.language,
		formatPrompt:
			typeof raw.formatPrompt === "string"
				? raw.formatPrompt
				: DEFAULT_CONFIG.formatPrompt,
	};
}

export function ensureDefaultConfig(agentDir: string = getAgentDir()): boolean {
	const configPath = path.join(agentDir, "config", CONFIG_FILENAME);
	if (fs.existsSync(configPath)) return false;
	fs.mkdirSync(path.dirname(configPath), { recursive: true });
	fs.writeFileSync(
		configPath,
		`${JSON.stringify(STARTER_CONFIG, null, 2)}\n`,
		"utf-8",
	);
	return true;
}

/** Write the config to the global agent config path. Always overwrites. */
export function saveConfig(
	config: NameFormatConfig,
	agentDir: string = getAgentDir(),
): void {
	const configPath = path.join(agentDir, "config", CONFIG_FILENAME);
	fs.mkdirSync(path.dirname(configPath), { recursive: true });
	const out: Record<string, unknown> = {
		enabled: config.enabled,
		model:
			config.provider && config.model
				? `${config.provider}/${config.model}`
				: "",
		language: config.language,
		formatPrompt: config.formatPrompt,
		maxLength: config.maxLength,
	};
	fs.writeFileSync(configPath, `${JSON.stringify(out, null, 2)}\n`, "utf-8");
}

export function loadConfig(cwd?: string): NameFormatConfig {
	if (cwd) {
		const projectRaw = readJson(
			path.join(cwd, ".pi", "config", CONFIG_FILENAME),
		);
		if (isNonEmpty(projectRaw)) return parseConfig(projectRaw);
	}
	const globalRaw = readJson(
		path.join(getAgentDir(), "config", CONFIG_FILENAME),
	);
	if (isNonEmpty(globalRaw)) return parseConfig(globalRaw);

	const agentSettings = readJson(path.join(getAgentDir(), "settings.json"));
	const projectSettings = cwd
		? readJson(path.join(cwd, ".pi", "settings.json"))
		: {};
	const block =
		(projectSettings?.piSessionNameFormat as
			| Record<string, unknown>
			| undefined) ??
		(projectSettings?.nameFormat as Record<string, unknown> | undefined) ??
		(agentSettings.piSessionNameFormat as
			| Record<string, unknown>
			| undefined) ??
		(agentSettings.nameFormat as Record<string, unknown> | undefined);
	if (isNonEmpty(block)) return parseConfig(block);

	return DEFAULT_CONFIG;
}
