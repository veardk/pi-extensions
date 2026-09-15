/** Tests for clean(). Run: node --test packages/pi-session-name-format/src/name-format.test.ts */

import assert from "node:assert/strict";
import { test } from "node:test";
import { clean } from "./name-format.ts";

// clean()

test("clean returns the input untouched when it is already a clean title", () => {
	assert.equal(
		clean("Fix auth token refresh bug", 50),
		"Fix auth token refresh bug",
	);
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
