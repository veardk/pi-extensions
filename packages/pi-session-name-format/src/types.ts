/**
 * Shared types. `formatPrompt` is a free-form string passed verbatim to
 * the LLM; the LLM substitutes `{placeholder}` tokens itself.
 *
 * `provider` / `model` are optional — omitted means fall back to pi's
 * current session model (`ctx.model`).
 */

export interface NameFormatConfig {
	/** Global on/off switch */
	enabled: boolean;
	/** Provider for the naming model; omit to use pi's current session model */
	provider?: string;
	/** Model ID for the naming model; omit to use pi's current session model */
	model?: string;
	/** Maximum name length in characters; 0 = unlimited */
	maxLength: number;
	/** Output language for generated session names — passed to the LLM as-is */
	language: string;
	/** Free-form session-name template (the LLM's hint; the LLM substitutes it) */
	formatPrompt: string;
}

export const DEFAULT_CONFIG: NameFormatConfig = {
	enabled: true,
	// provider / model omitted → falls back to ctx.model
	maxLength: 50,
	language: "en",
	formatPrompt: "emoji concise session name",
};
