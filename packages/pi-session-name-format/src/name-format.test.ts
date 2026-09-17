/** Tests for clean() and generateSessionName fallback logic. Run: node --test packages/pi-session-name-format/src/name-format.test.ts */

import assert from "node:assert/strict";
import { test } from "node:test";
import { clean, generateSessionName } from "./name-format.ts";
import type { NamingContext } from "./name-format.ts";
import { DEFAULT_CONFIG } from "./types.ts";
import type { NameFormatConfig } from "./types.ts";

// clean()

test("clean returns the input untouched when it is already a clean title", () => {
  assert.equal(clean("Fix auth token refresh bug", 50), "Fix auth token refresh bug");
});

test("clean strips XML wrappers (one level)", () => {
  assert.equal(clean("<title>Fix bug</title>", 50), "Fix bug");
});

test("clean unwraps nested XML wrappers", () => {
  assert.equal(clean("<outer><inner>Fix bug</inner></outer>", 50), "Fix bug");
});

test("clean strips 'Here is a title:' and similar prefixes", () => {
  assert.equal(clean("Here is a title: Fix bug", 50), "Fix bug");
  assert.equal(clean("Title: Fix bug", 50), "Fix bug");
  assert.equal(clean("Session: Fix bug", 50), "Fix bug");
});

test("clean strips matching surrounding quotes", () => {
  assert.equal(clean('"Fix bug"', 50), "Fix bug");
  assert.equal(clean("'Fix bug'", 50), "Fix bug");
  assert.equal(clean("「Fix bug」", 50), "Fix bug");
});

test("clean collapses internal newlines", () => {
  assert.equal(clean("Fix\nbug", 50), "Fix bug");
});

test("clean truncates with ellipsis when over the max length", () => {
  const trimmed = clean("A".repeat(60), 50);
  assert.equal(trimmed.length, 50);
  assert.ok(trimmed.endsWith("..."));
});

test("clean preserves hard maximum when max is shorter than ellipsis", () => {
  assert.equal(clean("A very long title", 2).length, 2);
});

test("clean falls back to 'New session' on empty input", () => {
  assert.equal(clean("", 50), "New session");
  assert.equal(clean("   \n", 50), "New session");
});

test("clean leaves content untouched when maxLength is 0", () => {
  assert.equal(clean("A".repeat(200), 0).length, 200);
});

// Fallback decision logic tests

test("generateSessionName skips fallback when config has no separate model configured (resolves to session model)", async () => {
  const sessionModel = { provider: "session-p", id: "session-m" };
  let primaryAttempted = false;

  const mockRegistry = {
    find() {
      return undefined;
    },
    async getApiKeyAndHeaders() {
      primaryAttempted = true;
      return { ok: false, error: "Primary auth failed" };
    },
  };

  const ctx: NamingContext = {
    hasUI: true,
    ui: {} as any,
    modelRegistry: mockRegistry as any,
    model: sessionModel as any,
    cwd: "/test",
  };

  const config: NameFormatConfig = {
    ...DEFAULT_CONFIG,
    provider: undefined,
    model: undefined,
  };

  await assert.rejects(
    async () => {
      await generateSessionName(ctx, config, {
        turns: [{ user: "hello" }],
      });
    },
    {
      message: "Primary auth failed",
    },
  );
  assert.equal(primaryAttempted, true);
});

test("generateSessionName skips fallback when configured model is identical to session model", async () => {
  const model = { provider: "same-p", id: "same-m" };
  let attempts = 0;

  const mockRegistry = {
    find(provider: string, id: string) {
      if (provider === "same-p" && id === "same-m") return model;
      return undefined;
    },
    async getApiKeyAndHeaders() {
      attempts++;
      return { ok: false, error: "Model error" };
    },
  };

  const ctx: NamingContext = {
    hasUI: true,
    ui: {} as any,
    modelRegistry: mockRegistry as any,
    model: model as any,
    cwd: "/test",
  };

  const config: NameFormatConfig = {
    ...DEFAULT_CONFIG,
    provider: "same-p",
    model: "same-m",
  };

  await assert.rejects(
    async () => {
      await generateSessionName(ctx, config, {
        turns: [{ user: "hello" }],
      });
    },
    {
      message: "Model error",
    },
  );
  // Only 1 attempt because configured model is identical to session model
  assert.equal(attempts, 1);
});

test("generateSessionName attempts fallback when configured model is distinct from session model", async () => {
  const customModel = { provider: "custom-p", id: "custom-m" };
  const sessionModel = { provider: "session-p", id: "session-m" };
  const queriedModels: string[] = [];

  const mockRegistry = {
    find(provider: string, id: string) {
      if (provider === "custom-p" && id === "custom-m") return customModel;
      return undefined;
    },
    async getApiKeyAndHeaders(m: any) {
      queriedModels.push(`${m.provider}/${m.id}`);
      if (m.provider === "custom-p") {
        return { ok: false, error: "Custom model failed" };
      }
      // For session model, fail its auth too so both fail
      return { ok: false, error: "Session model auth failed" };
    },
  };

  const ctx: NamingContext = {
    hasUI: true,
    ui: {} as any,
    modelRegistry: mockRegistry as any,
    model: sessionModel as any,
    cwd: "/test",
  };

  const config: NameFormatConfig = {
    ...DEFAULT_CONFIG,
    provider: "custom-p",
    model: "custom-m",
  };

  await assert.rejects(
    async () => {
      await generateSessionName(ctx, config, {
        turns: [{ user: "hello" }],
      });
    },
    {
      message: "Custom model failed",
    },
  );
  // Both models were attempted
  assert.deepEqual(queriedModels, ["custom-p/custom-m", "session-p/session-m"]);
});
