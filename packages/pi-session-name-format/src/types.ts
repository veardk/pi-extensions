/**
 * Shared types. `formatPrompt` is a free-form string passed verbatim to
 * the LLM; the LLM substitutes `{placeholder}` tokens itself.
 *
 * `provider` / `model` are optional — omitted means fall back to pi's
 * current session model (`ctx.model`).
 */

export interface FormatTemplate {
  id: string;
  label: string;
  template: string;
}

export const DEFAULT_TEMPLATES: FormatTemplate[] = [
  {
    id: "type-tag",
    label: "{yymmdd}-{type(...)}-{concise session name}",
    template:
      "{yymmdd}-{type(feature/design/fix/research/refactor/debug/test/perf/chore/review)}-{concise session name}",
  },
  {
    id: "emoji-concise",
    label: "emoji concise session name",
    template: "emoji concise session name",
  },
  {
    id: "project-name",
    label: "[{project}] {name}",
    template: "[{project}] {name}",
  },
  {
    id: "date-name",
    label: "{date} — {name}",
    template: "{date} — {name}",
  },
];

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
  /** Format mode: "template" or "custom". Defaults to "custom" when omitted. */
  formatMode?: "template" | "custom";
  /** Selected template ID when formatMode is "template" */
  selectedTemplate?: string;
  /** Configured templates available for selection */
  templates?: FormatTemplate[];
  /** Free-form session-name template (the LLM's hint; the LLM substitutes it) */
  formatPrompt: string;
}

export const DEFAULT_CONFIG: NameFormatConfig = {
  enabled: true,
  // provider / model omitted → falls back to ctx.model
  maxLength: 50,
  language: "en",
  formatMode: "custom",
  formatPrompt: "emoji concise session name",
  selectedTemplate: "type-tag",
  templates: DEFAULT_TEMPLATES,
};

/**
 * Resolve the effective prompt to pass to the LLM / guidance / tool.
 * Single source of truth.
 */
export function getEffectivePrompt(config: NameFormatConfig): string {
  if (config.formatMode === "template") {
    const templates = config.templates?.length ? config.templates : DEFAULT_TEMPLATES;
    const match = templates.find((t) => t.id === config.selectedTemplate);
    if (match) return match.template;
    if (templates[0]) return templates[0].template;
  }
  return config.formatPrompt || DEFAULT_CONFIG.formatPrompt;
}
