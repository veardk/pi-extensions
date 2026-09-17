/**
 * Tests for the settings-editor pre-fill contract.
 * Run: node --test packages/pi-session-name-format/src/ui.test.ts
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_TEMPLATES, getEffectivePrompt } from "./types.ts";
import type { NameFormatConfig } from "./types.ts";
import { formatPromptPrefill } from "./ui.ts";

test("formatPromptPrefill returns the effective prompt in custom mode", () => {
  const config: NameFormatConfig = {
    enabled: true,
    maxLength: 50,
    language: "en",
    formatMode: "custom",
    formatPrompt: "🚀 {name}",
  };
  assert.equal(formatPromptPrefill(config), "🚀 {name}");
});

test("formatPromptPrefill returns the selected template body in template mode", () => {
  const config: NameFormatConfig = {
    enabled: true,
    maxLength: 50,
    language: "en",
    formatMode: "template",
    selectedTemplate: "project-name",
    // Stale custom-mode value: it must NOT be what the input pre-fills with.
    formatPrompt: "old stale custom prompt",
    templates: DEFAULT_TEMPLATES,
  };
  assert.equal(formatPromptPrefill(config), "[{project}] {name}");
  assert.notEqual(formatPromptPrefill(config), config.formatPrompt);
});

test("formatPromptPrefill keeps legacy configs (no formatMode) on formatPrompt", () => {
  const legacy: NameFormatConfig = {
    enabled: true,
    maxLength: 50,
    language: "en",
    formatPrompt: "{yymmdd}-{type(...)}-{concise session name}",
  };
  assert.equal(formatPromptPrefill(legacy), "{yymmdd}-{type(...)}-{concise session name}");
});

test("formatPromptPrefill always mirrors getEffectivePrompt", () => {
  const configs: NameFormatConfig[] = [
    {
      enabled: true,
      maxLength: 50,
      language: "en",
      formatPrompt: "custom",
    },
    {
      enabled: true,
      maxLength: 0,
      language: "zh-CN",
      formatMode: "template",
      selectedTemplate: "type-tag",
      formatPrompt: "stale",
      templates: DEFAULT_TEMPLATES,
    },
    {
      enabled: false,
      maxLength: 10,
      language: "ja",
      formatMode: "custom",
      formatPrompt: "日本語のタイトル",
    },
  ];
  for (const config of configs) {
    assert.equal(formatPromptPrefill(config), getEffectivePrompt(config));
  }
});
