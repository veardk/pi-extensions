import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { parseConfig, saveConfig } from "./config.ts";
import { DEFAULT_CONFIG, DEFAULT_TEMPLATES, getEffectivePrompt } from "./types.ts";
import type { NameFormatConfig } from "./types.ts";

test("getEffectivePrompt resolves legacy config (no formatMode) to custom formatPrompt", () => {
  const legacyConfig: NameFormatConfig = {
    enabled: true,
    maxLength: 50,
    language: "en",
    formatPrompt: "{yymmdd}-{type(...)}-{concise session name}",
  };
  assert.equal(getEffectivePrompt(legacyConfig), "{yymmdd}-{type(...)}-{concise session name}");
});

test("getEffectivePrompt resolves custom mode to formatPrompt", () => {
  const config: NameFormatConfig = {
    enabled: true,
    maxLength: 50,
    language: "zh-CN",
    formatMode: "custom",
    formatPrompt: "🚀 {name}",
  };
  assert.equal(getEffectivePrompt(config), "🚀 {name}");
});

test("getEffectivePrompt resolves template mode to selected template", () => {
  const config: NameFormatConfig = {
    enabled: true,
    maxLength: 50,
    language: "en",
    formatMode: "template",
    selectedTemplate: "emoji-concise",
    formatPrompt: "should not be used in template mode",
    templates: DEFAULT_TEMPLATES,
  };
  assert.equal(getEffectivePrompt(config), "emoji concise session name");
});

test("getEffectivePrompt falls back to first template when selectedTemplate not found", () => {
  const config: NameFormatConfig = {
    enabled: true,
    maxLength: 50,
    language: "en",
    formatMode: "template",
    selectedTemplate: "non-existent-id",
    formatPrompt: "fallback text",
    templates: [{ id: "first", label: "First", template: "first template prompt" }],
  };
  assert.equal(getEffectivePrompt(config), "first template prompt");
});

test("parseConfig preserves legacy config without formatMode as custom", () => {
  const raw = {
    enabled: true,
    model: "packyapi-ds/deepseek-flash",
    language: "zh-CN",
    formatPrompt: "{yymmdd}-{type(...)}-{concise session name}",
    maxLength: 60,
  };
  const parsed = parseConfig(raw);
  assert.equal(parsed.formatMode, "custom");
  assert.equal(parsed.formatPrompt, "{yymmdd}-{type(...)}-{concise session name}");
  assert.equal(parsed.provider, "packyapi-ds");
  assert.equal(parsed.model, "deepseek-flash");
  assert.equal(getEffectivePrompt(parsed), "{yymmdd}-{type(...)}-{concise session name}");
});

test("parseConfig parses template mode and custom templates list", () => {
  const raw = {
    enabled: true,
    formatMode: "template",
    selectedTemplate: "custom-1",
    templates: [
      { id: "custom-1", label: "Custom 1", template: "template 1 body" },
      { id: "custom-2", label: "Custom 2", template: "template 2 body" },
    ],
    formatPrompt: "free text",
  };
  const parsed = parseConfig(raw);
  assert.equal(parsed.formatMode, "template");
  assert.equal(parsed.selectedTemplate, "custom-1");
  assert.equal(parsed.templates?.length, 2);
  assert.equal(getEffectivePrompt(parsed), "template 1 body");
});

test("saveConfig round-trip preserves formatMode, selectedTemplate, and templates", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-name-format-test-"));
  try {
    const config: NameFormatConfig = {
      enabled: true,
      provider: "test-provider",
      model: "test-model",
      maxLength: 42,
      language: "zh-CN",
      formatMode: "template",
      selectedTemplate: "project-name",
      templates: DEFAULT_TEMPLATES,
      formatPrompt: "my custom prompt",
    };
    saveConfig(config, tmpDir);

    const savedFile = path.join(tmpDir, "config", "pi-session-name-format.json");
    assert.ok(fs.existsSync(savedFile));
    const content = JSON.parse(fs.readFileSync(savedFile, "utf-8"));
    const parsed = parseConfig(content);

    assert.equal(parsed.enabled, true);
    assert.equal(parsed.provider, "test-provider");
    assert.equal(parsed.model, "test-model");
    assert.equal(parsed.maxLength, 42);
    assert.equal(parsed.language, "zh-CN");
    assert.equal(parsed.formatMode, "template");
    assert.equal(parsed.selectedTemplate, "project-name");
    assert.equal(parsed.formatPrompt, "my custom prompt");
    assert.deepEqual(parsed.templates, DEFAULT_TEMPLATES);
    assert.equal(getEffectivePrompt(parsed), "[{project}] {name}");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
